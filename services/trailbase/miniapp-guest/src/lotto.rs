use crate::{ads, auth, body, db, generation_ads};
use serde::{Deserialize, Serialize};
use serde_json::{Value as Json, json};
use trailbase_guest_common::responses::*;
use trailbase_wasm::{
    db::{Transaction, Value},
    http::Request,
    rand::get_random_bytes,
};

pub const WEEK_MS: i64 = 604_800_000;
// Round 1 sales close: 2002-12-07 20:00 KST. Never infer a target round from a delayed data import.
pub const FIRST_CLOSE_MS: i64 = 1_039_258_800_000;
pub fn target_round(now: i64) -> i64 {
    ((now - FIRST_CLOSE_MS).div_euclid(WEEK_MS) + 2).max(1)
}
pub fn close_time(round: i64) -> i64 {
    FIRST_CLOSE_MS + (round - 1) * WEEK_MS
}

pub(crate) fn random_index(upper: usize) -> usize {
    let bound = upper as u32;
    let limit = u32::MAX - u32::MAX % bound;
    loop {
        let mut bytes = [0; 4];
        get_random_bytes(&mut bytes);
        let value = u32::from_le_bytes(bytes);
        if value < limit {
            return (value % bound) as usize;
        }
    }
}
pub(crate) fn random_id() -> String {
    let mut bytes = [0; 16];
    get_random_bytes(&mut bytes);
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

#[derive(Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Options {
    #[serde(default)]
    pub fixed: Vec<i64>,
    #[serde(default)]
    pub excluded: Vec<i64>,
    pub odd_count: Option<usize>,
}
impl Options {
    pub fn custom(&self) -> bool {
        !self.fixed.is_empty() || !self.excluded.is_empty() || self.odd_count.is_some()
    }
    pub fn validate(&mut self) -> ApiResult<()> {
        self.fixed.sort_unstable();
        self.excluded.sort_unstable();
        if self.fixed.len() > 6
            || self.excluded.len() > 39
            || self.odd_count.is_some_and(|v| v > 6)
            || self
                .fixed
                .iter()
                .chain(&self.excluded)
                .any(|n| !(1..=45).contains(n))
            || self.fixed.windows(2).any(|p| p[0] == p[1])
            || self.excluded.windows(2).any(|p| p[0] == p[1])
            || self.fixed.iter().any(|n| self.excluded.contains(n))
        {
            return Err(bad_request(
                "INVALID_OPTIONS",
                "고정·제외 번호와 홀수 개수를 확인해 주세요.",
            ));
        }
        if let Some(odd) = self.odd_count {
            let fixed_odd = self.fixed.iter().filter(|n| *n % 2 == 1).count();
            let fixed_even = self.fixed.len() - fixed_odd;
            let available_odd = (1..=45)
                .filter(|n| n % 2 == 1 && !self.excluded.contains(n))
                .count();
            let available_even = 45 - self.excluded.len() - available_odd;
            if fixed_odd > odd
                || fixed_even > 6 - odd
                || available_odd < odd
                || available_even < 6 - odd
            {
                return Err(bad_request(
                    "IMPOSSIBLE_OPTIONS",
                    "이 조건으로는 6개를 만들 수 없어요. 조건을 줄여 주세요.",
                ));
            }
        }
        Ok(())
    }
}
pub fn choose(options: &Options, mut random: impl FnMut(usize) -> usize) -> Vec<i64> {
    let mut selected = options.fixed.clone();
    let mut pool: Vec<i64> = (1..=45)
        .filter(|n| !options.fixed.contains(n) && !options.excluded.contains(n))
        .collect();
    while selected.len() < 6 {
        let parity = options.odd_count.map(|odd| {
            if selected.iter().filter(|n| *n % 2 == 1).count() < odd {
                1
            } else {
                0
            }
        });
        let candidates: Vec<usize> = pool
            .iter()
            .enumerate()
            .filter(|(_, n)| parity.is_none_or(|p| *n % 2 == p))
            .map(|(i, _)| i)
            .collect();
        let index = candidates[random(candidates.len())];
        selected.push(pool.swap_remove(index));
    }
    selected.sort_unstable();
    selected
}

const SELECT_GENERATION: &str = "id, round, display_name, number_1, number_2, number_3, number_4, number_5, number_6, created_at";
pub(crate) fn generation_json(row: &[Value]) -> ApiResult<Json> {
    let numbers: Vec<i64> = row[3..9]
        .iter()
        .map(|v| db::integer(v, "number"))
        .collect::<ApiResult<_>>()?;
    Ok(
        json!({"id":db::integer(&row[0],"id")?,"round":db::integer(&row[1],"round")?,"displayName":db::text(&row[2],"display_name")?,"numbers":numbers,"createdAt":db::integer(&row[9],"created_at")?}),
    )
}
pub(crate) fn insert(
    tx: &mut Transaction,
    round: i64,
    name: &str,
    bot: bool,
    numbers: &[i64],
    now: i64,
) -> ApiResult<Json> {
    let mut params = vec![Value::Integer(round), Value::Text(name.into())];
    params.extend(numbers.iter().map(|n| Value::Integer(*n)));
    params.push(Value::Integer(now));
    let rows = db::tx_query(
        tx,
        &format!(
            "INSERT INTO lotto_public_generations(round, display_name, number_1, number_2, number_3, number_4, number_5, number_6, created_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9) RETURNING {SELECT_GENERATION}"
        ),
        &params,
    )?;
    let generation = generation_json(&rows[0])?;
    db::tx_execute(
        tx,
        "INSERT INTO ait_lotto_generation_origins(generation_id,actor_kind,source) VALUES (?1,?2,?3)",
        &[
            Value::Integer(generation["id"].as_i64().unwrap()),
            Value::Text(if bot { "bot" } else { "human" }.into()),
            Value::Text(if bot { "bot" } else { "miniapp" }.into()),
        ],
    )?;
    Ok(generation)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Generate {
    request_id: String,
    round: i64,
    #[serde(default)]
    options: Options,
}

pub(crate) async fn generate(req: &mut Request) -> ApiResult<Json> {
    let mut input: Generate = body(req).await?;
    if input.request_id.len() < 16
        || input.request_id.len() > 80
        || !input
            .request_id
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-')
    {
        return Err(bad_request(
            "INVALID_REQUEST_ID",
            "요청 번호를 확인해 주세요.",
        ));
    }
    input.options.validate()?;
    let payload = serde_json::to_string(&json!({"round":input.round,"options":input.options}))
        .map_err(internal)?;
    let mut tx = db::tx()?;
    let user = auth::user(req, &mut tx)?;
    let now = db::now_ms_tx(&mut tx)?;
    let existing = db::tx_query(
        &mut tx,
        "SELECT generation_id, payload_json FROM ait_lotto_generation_requests WHERE user_id = ?1 AND request_id = ?2",
        &[
            Value::Blob(user.id.clone()),
            Value::Text(input.request_id.clone()),
        ],
    )?;
    if let Some(row) = existing.first() {
        if db::text(&row[1], "payload_json")? != payload {
            return Err(conflict(
                "REQUEST_CONFLICT",
                "다른 요청에서 사용한 번호예요.",
            ));
        }
        let id = db::nullable_integer(&row[0])?
            .ok_or_else(|| conflict("GENERATION_DELETED", "이미 삭제한 생성 내역이에요."))?;
        let rows = db::tx_query(
            &mut tx,
            &format!("SELECT {SELECT_GENERATION} FROM lotto_public_generations WHERE id = ?1"),
            &[Value::Integer(id)],
        )?;
        let row = rows
            .first()
            .ok_or_else(|| conflict("GENERATION_DELETED", "이미 삭제한 생성 내역이에요."))?;
        let generation = generation_json(row)?;
        let generation_ad_required = generation_ads::required(&mut tx, &user.id, now)?;
        db::tx_commit(&mut tx)?;
        return Ok(
            json!({"generation":generation,"replayed":true,"generationAdRequired":generation_ad_required}),
        );
    }
    if input.round != target_round(now) {
        return Err(conflict(
            "ROUND_CHANGED",
            "대상 회차가 바뀌었어요. 새 회차를 확인해 주세요.",
        ));
    }
    if input.options.custom() {
        ads::require_pass(&mut tx, &user.id, "custom", now)?;
    }
    if generation_ads::required(&mut tx, &user.id, now)? {
        return Err(conflict(
            "GENERATION_AD_REQUIRED",
            "광고를 보고 번호를 계속 만들어 주세요.",
        ));
    }
    let recent = db::tx_query(
        &mut tx,
        "SELECT count(*), coalesce(max(created_at), 0) FROM ait_lotto_generation_requests WHERE user_id = ?1 AND created_at > ?2 - 86400000",
        &[Value::Blob(user.id.clone()), Value::Integer(now)],
    )?;
    if db::integer(&recent[0][0], "count")? >= 200
        || now - db::integer(&recent[0][1], "last")? < 800
    {
        return Err(too_many_requests(
            "GENERATION_LIMIT",
            "조금 쉬었다가 다시 만들어 주세요.",
        ));
    }
    let numbers = choose(&input.options, random_index);
    let generation = insert(&mut tx, input.round, &user.name, false, &numbers, now)?;
    db::tx_execute(
        &mut tx,
        "INSERT INTO ait_lotto_generation_requests(user_id, request_id, generation_id, payload_json, created_at) VALUES (?1,?2,?3,?4,?5)",
        &[
            Value::Blob(user.id.clone()),
            Value::Text(input.request_id),
            Value::Integer(generation["id"].as_i64().unwrap()),
            Value::Text(payload),
            Value::Integer(now),
        ],
    )?;
    let generation_ad_required = generation_ads::generated(&mut tx, &user.id, now)?;
    db::tx_commit(&mut tx)?;
    Ok(
        json!({"generation":generation,"replayed":false,"generationAdRequired":generation_ad_required}),
    )
}

pub(crate) async fn round_context(_req: &mut Request) -> ApiResult<Json> {
    let mut tx = db::tx()?;
    let now = db::now_ms_tx(&mut tx)?;
    let rows = db::tx_query(
        &mut tx,
        "SELECT round, draw_number_1, draw_number_2, draw_number_3, draw_number_4, draw_number_5, draw_number_6, bonus_number, draw_date FROM lotto_draw_results ORDER BY round DESC LIMIT 1",
        &[],
    )?;
    let latest = rows.first().map(|r| -> ApiResult<Json> { Ok(json!({"round":db::integer(&r[0],"round")?,"numbers":r[1..7].iter().map(|n| db::integer(n,"number")).collect::<ApiResult<Vec<_>>>()?,"bonus":db::integer(&r[7],"bonus")?,"drawDate":db::text(&r[8],"date")?})) }).transpose()?;
    db::tx_commit(&mut tx)?;
    let round = target_round(now);
    Ok(
        json!({"serverTime":now,"targetRound":round,"closesAt":close_time(round),"drawsAt":close_time(round)+2_100_000,"latestDraw":latest}),
    )
}
const FEED_PAGE_SIZE: usize = 30;

fn feed_cursor(raw: &str, round: i64) -> ApiResult<i64> {
    let invalid = || bad_request("INVALID_CURSOR", "목록을 새로고침한 뒤 다시 확인해 주세요.");
    let (cursor_round, id) = raw.split_once(':').ok_or_else(invalid)?;
    let cursor_round = cursor_round.parse::<i64>().map_err(|_| invalid())?;
    let id = id.parse::<i64>().map_err(|_| invalid())?;
    if cursor_round != round || id < 1 || id > 9_007_199_254_740_991 {
        return Err(invalid());
    }
    Ok(id)
}

pub(crate) async fn feed(req: &mut Request) -> ApiResult<Json> {
    let mut tx = db::tx()?;
    let now = db::now_ms_tx(&mut tx)?;
    let round = req
        .query_param("round")
        .map(|v| {
            v.parse::<i64>()
                .map_err(|_| bad_request("INVALID_ROUND", "회차를 확인해 주세요."))
        })
        .transpose()?
        .unwrap_or(target_round(now));
    if round < 1 || round > target_round(now) {
        return Err(bad_request("INVALID_ROUND", "회차를 확인해 주세요."));
    }
    let before = req
        .query_param("cursor")
        .map(|v| feed_cursor(&v, round))
        .transpose()?;
    let mut params = vec![Value::Integer(round)];
    let cursor_filter = if let Some(id) = before {
        params.push(Value::Integer(id));
        " AND id < ?2"
    } else {
        ""
    };
    let rows = db::tx_query(
        &mut tx,
        &format!(
            "SELECT {SELECT_GENERATION} FROM lotto_public_generations WHERE round = ?1{cursor_filter} ORDER BY id DESC LIMIT {}",
            FEED_PAGE_SIZE + 1
        ),
        &params,
    )?;
    let next_cursor = if rows.len() > FEED_PAGE_SIZE {
        Some(format!(
            "{round}:{}",
            db::integer(&rows[FEED_PAGE_SIZE - 1][0], "id")?
        ))
    } else {
        None
    };
    let generations = rows
        .iter()
        .take(FEED_PAGE_SIZE)
        .map(|r| generation_json(r))
        .collect::<ApiResult<Vec<_>>>()?;
    let columns = (1..=45)
        .map(|n| format!("generation_count_{n}"))
        .collect::<Vec<_>>()
        .join(",");
    let counts = db::tx_query(
        &mut tx,
        &format!(
            "SELECT total_generations, {columns} FROM lotto_draw_generation_counts WHERE round = ?1"
        ),
        &[Value::Integer(round)],
    )?;
    let (total, numbers) = if let Some(row) = counts.first() {
        (
            db::integer(&row[0], "total")?,
            row[1..]
                .iter()
                .map(|v| db::integer(v, "count"))
                .collect::<ApiResult<Vec<_>>>()?,
        )
    } else {
        (0, vec![0; 45])
    };
    let active = db::tx_query(
        &mut tx,
        "SELECT count(*) FROM ait_lotto_profiles WHERE disabled = 0 AND last_seen_at > ?1 - 90000",
        &[Value::Integer(now)],
    )?;
    let active = db::integer(&active[0][0], "active")?;
    db::tx_commit(&mut tx)?;
    Ok(
        json!({"round":round,"generations":generations,"nextCursor":next_cursor,"totalGenerations":total,"numberCounts":numbers,"activeUsers":active,"serverTime":now}),
    )
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Delete {
    id: i64,
}
pub(crate) async fn delete_generation(req: &mut Request) -> ApiResult<Json> {
    let input: Delete = body(req).await?;
    let mut tx = db::tx()?;
    let user = auth::user(req, &mut tx)?;
    let removed = db::tx_execute(
        &mut tx,
        "DELETE FROM lotto_public_generations WHERE id = ?1 AND id IN (SELECT generation_id FROM ait_lotto_generation_requests WHERE user_id = ?2)",
        &[Value::Integer(input.id), Value::Blob(user.id)],
    )?;
    db::tx_commit(&mut tx)?;
    Ok(json!({"deleted":removed > 0}))
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct ReportInput {
    numbers: Vec<i64>,
}
pub(crate) async fn report(req: &mut Request) -> ApiResult<Json> {
    let input: ReportInput = body(req).await?;
    let mut options = Options {
        fixed: input.numbers,
        ..Options::default()
    };
    options.validate()?;
    if options.fixed.len() != 6 {
        return Err(bad_request("INVALID_NUMBERS", "6개 번호를 확인해 주세요."));
    }
    let mut tx = db::tx()?;
    let user = auth::user(req, &mut tx)?;
    let now = db::now_ms_tx(&mut tx)?;
    ads::require_pass(&mut tx, &user.id, "report", now)?;
    let params: Vec<Value> = options.fixed.iter().map(|n| Value::Integer(*n)).collect();
    let matched = (1..=6)
        .map(|n| format!("(draw_number_{n} IN (?1,?2,?3,?4,?5,?6))"))
        .collect::<Vec<_>>()
        .join("+");
    let sql = format!(
        "SELECT round,draw_number_1,draw_number_2,draw_number_3,draw_number_4,draw_number_5,draw_number_6,bonus_number,draw_date,({matched}) AS matched FROM lotto_draw_results ORDER BY matched DESC,round DESC LIMIT 3"
    );
    let rows = db::tx_query(&mut tx, &sql, &params)?;
    let historical=rows.iter().map(|r|->ApiResult<Json>{Ok(json!({"round":db::integer(&r[0],"round")?,"numbers":r[1..7].iter().map(|v|db::integer(v,"number")).collect::<ApiResult<Vec<_>>>()?,"bonus":db::integer(&r[7],"bonus")?,"drawDate":db::text(&r[8],"date")?,"matches":db::integer(&r[9],"matched")?}))}).collect::<ApiResult<Vec<_>>>()?;
    let rows = db::tx_query(
        &mut tx,
        "SELECT number,draw_count,last_draw_round FROM lotto_number_stats WHERE number IN (?1,?2,?3,?4,?5,?6) ORDER BY number",
        &params,
    )?;
    let frequencies=rows.iter().map(|r|->ApiResult<Json>{Ok(json!({"number":db::integer(&r[0],"number")?,"drawCount":db::integer(&r[1],"count")?,"lastRound":db::nullable_integer(&r[2])?}))}).collect::<ApiResult<Vec<_>>>()?;
    db::tx_commit(&mut tx)?;
    Ok(json!({"historical":historical,"frequencies":frequencies}))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn cursor_is_bound_to_its_round_and_safe_public_id() {
        assert_eq!(feed_cursor("1242:123", 1242).unwrap(), 123);
        for cursor in [
            "1241:123",
            "1242:0",
            "1242:-1",
            "1242:9007199254740992",
            "123",
            "1242:2:3",
        ] {
            assert!(feed_cursor(cursor, 1242).is_err());
        }
    }
    #[test]
    fn cutoff_does_not_depend_on_import() {
        assert_eq!(target_round(FIRST_CLOSE_MS - 1), 1);
        assert_eq!(target_round(FIRST_CLOSE_MS), 2);
        assert_eq!(target_round(close_time(1242) - 1), 1242);
        assert_eq!(target_round(close_time(1242)), 1243);
    }
    #[test]
    fn constraints_and_sorted_unique_numbers() {
        for odd in 0..=6 {
            let mut opts = Options {
                odd_count: Some(odd),
                excluded: vec![40, 41, 42],
                ..Options::default()
            };
            opts.validate().unwrap();
            for seed in 0..100 {
                let n = choose(&opts, |size| seed % size);
                assert_eq!(n.len(), 6);
                assert!(n.windows(2).all(|p| p[0] < p[1]));
                assert_eq!(n.iter().filter(|v| *v % 2 == 1).count(), odd);
                assert!(!n.iter().any(|v| opts.excluded.contains(v)));
            }
        }
    }
    #[test]
    fn rejects_impossible_constraints() {
        assert!(
            Options {
                fixed: vec![1, 3],
                odd_count: Some(1),
                ..Options::default()
            }
            .validate()
            .is_err()
        );
        assert!(
            Options {
                fixed: vec![1],
                excluded: vec![1],
                odd_count: None
            }
            .validate()
            .is_err()
        );
        assert!(
            Options {
                fixed: vec![1, 1],
                ..Options::default()
            }
            .validate()
            .is_err()
        );
    }
}
