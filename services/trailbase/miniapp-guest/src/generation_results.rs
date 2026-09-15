use crate::{db, lotto};
use serde_json::{Value as Json, json};
use trailbase_guest_common::responses::*;
use trailbase_wasm::{
    db::{Transaction, Value},
    http::{Request, Response},
};

const PAGE_SIZE: usize = 26;
const BATCH_SIZE: usize = 2_000;
const COLUMNS: &str = "a.round,a.total_generations,a.closed_at,a.comparison_source,
    a.compared_generations,a.result_cursor,a.result_draw_mask,a.result_bonus,
    a.rank_counts_json,a.result_settled_at,
    d.draw_number_1,d.draw_number_2,d.draw_number_3,d.draw_number_4,d.draw_number_5,d.draw_number_6,
    d.bonus_number,d.draw_date,a.archived_at";
const FROM: &str =
    "FROM lotto_generation_weekly_archives a LEFT JOIN lotto_draw_results d ON d.round=a.round";

trait Store {
    fn query(&mut self, sql: &str, params: &[Value]) -> ApiResult<Vec<Vec<Value>>>;
    fn execute(&mut self, sql: &str, params: &[Value]) -> ApiResult<u64>;
}
impl Store for Transaction {
    fn query(&mut self, sql: &str, params: &[Value]) -> ApiResult<Vec<Vec<Value>>> {
        db::tx_query(self, sql, params)
    }
    fn execute(&mut self, sql: &str, params: &[Value]) -> ApiResult<u64> {
        db::tx_execute(self, sql, params)
    }
}

fn mask(numbers: &[i64]) -> ApiResult<i64> {
    if numbers.len() != 6 || numbers.iter().any(|n| !(1..=45).contains(n)) {
        return Err(internal("Invalid comparison numbers"));
    }
    let value = numbers.iter().fold(0_i64, |bits, n| bits | (1 << (n - 1)));
    if value.count_ones() != 6 {
        return Err(internal("Duplicate comparison numbers"));
    }
    Ok(value)
}
fn draw_mask_sql() -> String {
    (1..=6)
        .map(|n| format!("(1 << (d.draw_number_{n}-1))"))
        .collect::<Vec<_>>()
        .join(" | ")
}
fn rank(number_mask: i64, draw_mask: i64, bonus: i64) -> usize {
    match (number_mask & draw_mask).count_ones() {
        6 => 1,
        5 if number_mask & (1 << (bonus - 1)) != 0 => 2,
        5 => 3,
        4 => 4,
        3 => 5,
        _ => 0,
    }
}

struct Draw {
    numbers: Vec<i64>,
    mask: i64,
    bonus: i64,
    date: String,
}
struct Archive {
    round: i64,
    total: i64,
    closed_at: i64,
    source: String,
    compared: i64,
    cursor: i64,
    draw_mask: Option<i64>,
    bonus: Option<i64>,
    counts: Option<[i64; 6]>,
    settled_at: Option<i64>,
    archived_at: i64,
    draw: Option<Draw>,
}
impl Archive {
    fn read(row: &[Value]) -> ApiResult<Self> {
        if row.len() != 19 {
            return Err(internal("Invalid result row"));
        }
        let draw = if matches!(row[10], Value::Null) {
            None
        } else {
            let numbers = row[10..16]
                .iter()
                .map(|v| db::integer(v, "number"))
                .collect::<ApiResult<Vec<_>>>()?;
            let mask = mask(&numbers)?;
            let bonus = db::integer(&row[16], "bonus")?;
            if !(1..=45).contains(&bonus) || mask & (1 << (bonus - 1)) != 0 {
                return Err(internal("Invalid bonus number"));
            }
            Some(Draw {
                numbers,
                mask,
                bonus,
                date: db::text(&row[17], "draw_date")?,
            })
        };
        let counts = db::nullable_text(&row[8])?
            .map(|v| serde_json::from_str::<[i64; 6]>(&v).map_err(internal))
            .transpose()?;
        Ok(Self {
            round: db::integer(&row[0], "round")?,
            total: db::integer(&row[1], "total")?,
            closed_at: db::integer(&row[2], "closed_at")?,
            source: db::text(&row[3], "source")?,
            compared: db::integer(&row[4], "compared")?,
            cursor: db::integer(&row[5], "cursor")?,
            draw_mask: db::nullable_integer(&row[6])?,
            bonus: db::nullable_integer(&row[7])?,
            counts,
            settled_at: db::nullable_integer(&row[9])?,
            archived_at: db::integer(&row[18], "archived_at")?,
            draw,
        })
    }
    fn same_draw(&self, draw: &Draw) -> bool {
        self.draw_mask == Some(draw.mask) && self.bonus == Some(draw.bonus)
    }
    fn public(&self) -> Json {
        let valid_counts = self.counts.is_some_and(|counts| {
            counts.iter().all(|n| *n >= 0)
                && counts.iter().try_fold(0_i64, |sum, n| sum.checked_add(*n)) == Some(self.total)
        });
        let status = match &self.draw {
            Some(_) if self.total == 0 => "ready",
            _ if self.source == "unavailable" => "unavailable",
            None => "waiting",
            Some(draw)
                if self.same_draw(draw)
                    && self.settled_at.is_some()
                    && self.compared == self.total
                    && valid_counts =>
            {
                "ready"
            }
            Some(_) if self.source == "expired" => "unavailable",
            _ => "processing",
        };
        let counts = if status == "ready" {
            Some(if self.total == 0 {
                [0; 6]
            } else {
                self.counts.unwrap()
            })
        } else {
            None
        };
        let draw = self.draw.as_ref().map(
            |d| json!({"round":self.round,"numbers":d.numbers,"bonus":d.bonus,"drawDate":d.date}),
        );
        json!({"round":self.round,"totalGenerations":self.total,"status":status,
            "rankCounts":counts,"comparedGenerations":if status=="ready" {self.total} else {self.compared},
            "closesAt":self.closed_at,"draw":draw,"updatedAt":self.settled_at.unwrap_or(self.archived_at)})
    }
}

fn settle(store: &mut impl Store, now: i64, batch_size: usize) -> ApiResult<Json> {
    let rows = store.query(&format!(
        "SELECT {COLUMNS} {FROM} WHERE a.comparison_source='complete' AND a.purged_at IS NOT NULL
         AND a.total_generations>0 AND d.round IS NOT NULL
         AND (a.result_settled_at IS NULL OR coalesce(a.result_draw_mask,-1)!=({}) OR coalesce(a.result_bonus,-1)!=d.bonus_number)
         ORDER BY a.round LIMIT 1", draw_mask_sql()), &[])?;
    let Some(row) = rows.first() else {
        return Ok(json!({"ok":true,"processed":0}));
    };
    let archive = Archive::read(row)?;
    let draw = archive
        .draw
        .as_ref()
        .ok_or_else(|| internal("Missing draw"))?;
    let resume = archive.same_draw(draw) && archive.counts.is_some();
    let mut counts = if resume {
        archive.counts.unwrap()
    } else {
        [0; 6]
    };
    let mut compared = if resume { archive.compared } else { 0 };
    let mut cursor = if resume { archive.cursor } else { 0 };
    if counts.iter().any(|n| *n < 0)
        || counts.iter().try_fold(0_i64, |sum, n| sum.checked_add(*n)) != Some(compared)
    {
        return Err(internal("Invalid comparison checkpoint"));
    }
    let bins = store.query(
        "SELECT number_mask,generation_count FROM lotto_generation_result_combinations WHERE round=?1 AND number_mask>?2 ORDER BY number_mask LIMIT ?3",
        &[Value::Integer(archive.round),Value::Integer(cursor),Value::Integer((batch_size+1) as i64)],
    )?;
    let more = bins.len() > batch_size;
    for row in bins.iter().take(batch_size) {
        let bits = db::integer(&row[0], "mask")?;
        let count = db::integer(&row[1], "count")?;
        if bits <= 0 || bits >= 1_i64 << 45 || bits.count_ones() != 6 || count <= 0 {
            return Err(internal("Invalid anonymous combination"));
        }
        let bucket = rank(bits, draw.mask, draw.bonus);
        counts[bucket] = counts[bucket]
            .checked_add(count)
            .ok_or_else(|| internal("Count overflow"))?;
        compared = compared
            .checked_add(count)
            .ok_or_else(|| internal("Count overflow"))?;
        cursor = bits;
    }
    if compared > archive.total
        || (!more && compared != archive.total)
        || (more && compared >= archive.total)
    {
        return Err(internal("Incomplete comparison coverage"));
    }
    store.execute(
        "UPDATE lotto_generation_weekly_archives SET compared_generations=?2,result_cursor=?3,result_draw_mask=?4,
         result_bonus=?5,rank_counts_json=?6,result_settled_at=?7 WHERE round=?1",
        &[Value::Integer(archive.round),Value::Integer(compared),Value::Integer(cursor),Value::Integer(draw.mask),Value::Integer(draw.bonus),
          Value::Text(serde_json::to_string(&counts).map_err(internal)?),if more {Value::Null} else {Value::Integer(now)}],
    )?;
    Ok(json!({"ok":true,"round":archive.round,"compared":compared,"complete":!more}))
}

pub async fn job() -> Response {
    fn run() -> ApiResult<Json> {
        let mut tx = db::tx()?;
        let now = db::now_ms_tx(&mut tx)?;
        let result = settle(&mut tx, now, BATCH_SIZE)?;
        db::tx_commit(&mut tx)?;
        Ok(result)
    }
    crate::respond(run())
}

fn parse_round(value: Option<String>, current: i64) -> ApiResult<Option<i64>> {
    value
        .map(|raw| {
            raw.parse::<i64>()
                .ok()
                .filter(|n| *n >= 1 && *n <= current)
                .ok_or_else(|| bad_request("INVALID_ROUND", "조회할 회차를 확인해 주세요."))
        })
        .transpose()
}

fn history(
    store: &mut impl Store,
    now: i64,
    round: Option<i64>,
    before: Option<i64>,
) -> ApiResult<Json> {
    let current = lotto::target_round(now);
    let (filter, params) = if let Some(round) = round {
        ("WHERE a.round=?1", vec![Value::Integer(round)])
    } else if let Some(before) = before {
        ("WHERE a.round<?1", vec![Value::Integer(before)])
    } else {
        ("WHERE a.round<?1", vec![Value::Integer(current)])
    };
    let rows = store.query(
        &format!(
            "SELECT {COLUMNS} {FROM} {filter} ORDER BY a.round DESC LIMIT {}",
            PAGE_SIZE + 1
        ),
        &params,
    )?;
    let mut results = rows
        .iter()
        .take(PAGE_SIZE)
        .map(|r| Archive::read(r).map(|a| a.public()))
        .collect::<ApiResult<Vec<_>>>()?;
    let next = if rows.len() > PAGE_SIZE {
        results.last().and_then(|r| r["round"].as_i64())
    } else {
        None
    };
    if before.is_none() && (round.is_none() || round == Some(current)) {
        let total = store.query(
            "SELECT total_generations FROM lotto_draw_generation_counts WHERE round=?1",
            &[Value::Integer(current)],
        )?;
        let total = total
            .first()
            .map(|r| db::integer(&r[0], "total"))
            .transpose()?
            .unwrap_or(0);
        results.insert(0,json!({"round":current,"status":"open","totalGenerations":total,"rankCounts":null,
            "comparedGenerations":0,"closesAt":lotto::close_time(current),"draw":null,"updatedAt":now}));
    }
    if round.is_some() && results.is_empty() {
        return Err(not_found(
            "RESULTS_UNAVAILABLE",
            "이 회차의 생성 결과 통계가 아직 없어요.",
        ));
    }
    Ok(json!({"rounds":results,"nextBeforeRound":next,"currentRound":current,"serverTime":now}))
}

pub(crate) async fn get(req: &mut Request) -> ApiResult<Json> {
    let mut tx = db::tx()?;
    let now = db::now_ms_tx(&mut tx)?;
    let current = lotto::target_round(now);
    let round = parse_round(req.query_param("round"), current)?;
    let before = parse_round(req.query_param("before"), current)?;
    if round.is_some() && before.is_some() {
        return Err(bad_request(
            "INVALID_QUERY",
            "회차 조회와 이전 목록 조회는 따로 요청해 주세요.",
        ));
    }
    let result = history(&mut tx, now, round, before)?;
    db::tx_commit(&mut tx)?;
    Ok(result)
}

#[cfg(test)]
mod tests;
