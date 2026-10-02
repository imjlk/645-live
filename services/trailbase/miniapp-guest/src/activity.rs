use crate::{db, lotto};
use serde_json::{Value as Json, json};
use std::collections::BTreeMap;
use trailbase_guest_common::responses::*;
use trailbase_wasm::{
    db::{Transaction, Value},
    http::Request,
};

pub(crate) async fn retention_job() -> trailbase_wasm::http::Response {
    let result = (|| -> ApiResult<Json> {
        let mut tx = db::tx()?;
        let now = db::now_ms_tx(&mut tx)?;
        let cutoff = now / 3_600_000 - 45 * 24;
        db::tx_execute(
            &mut tx,
            "DELETE FROM lotto_activity_hours WHERE (source,round,hour) IN (SELECT source,round,hour FROM lotto_activity_hours WHERE hour<?1 ORDER BY hour LIMIT 2000)",
            &[Value::Integer(cutoff)],
        )?;
        db::tx_execute(
            &mut tx,
            "DELETE FROM lotto_activity_all_cache WHERE expires_at<=?1",
            &[Value::Integer(now)],
        )?;
        db::tx_commit(&mut tx)?;
        Ok(json!({"success":true}))
    })();
    crate::respond(result)
}

trait Store {
    fn query(&mut self, sql: &str, params: &[Value]) -> ApiResult<Vec<Vec<Value>>>;
    fn execute(&mut self, sql: &str, params: &[Value]) -> ApiResult<()>;
}
impl Store for Transaction {
    fn query(&mut self, sql: &str, params: &[Value]) -> ApiResult<Vec<Vec<Value>>> {
        db::tx_query(self, sql, params)
    }
    fn execute(&mut self, sql: &str, params: &[Value]) -> ApiResult<()> {
        db::tx_execute(self, sql, params).map(|_| ())
    }
}
fn vector(value: &Value, len: usize) -> ApiResult<Vec<i64>> {
    let values: Vec<i64> =
        serde_json::from_str(&db::text(value, "activity counts")?).map_err(internal)?;
    if values.len() != len || values.iter().any(|v| *v < 0) {
        return Err(internal("Invalid activity aggregate"));
    }
    Ok(values)
}
fn add(target: &mut [i64], values: &[i64]) {
    for (a, b) in target.iter_mut().zip(values) {
        *a += b;
    }
}

fn source(
    store: &mut impl Store,
    kind: &str,
    round: i64,
    period: &str,
    now: i64,
) -> ApiResult<Json> {
    let minimum = match period {
        "all" => 1,
        "four" => (round - 7).max(1),
        _ => (round - 6).max(1),
    };
    let columns = (1..=45)
        .map(|n| format!("{kind}_count_{n}"))
        .collect::<Vec<_>>()
        .join(",");
    let sql = if kind == "generated" {
        let columns = columns.replace("generated_count_", "generation_count_");
        format!(
            "SELECT round,total_generations,json_array({columns}) FROM lotto_draw_generation_counts c WHERE round BETWEEN ?1 AND ?2 AND NOT EXISTS(SELECT 1 FROM lotto_generation_weekly_archives a WHERE a.round=c.round) UNION ALL SELECT round,total_generations,number_counts_json FROM lotto_generation_weekly_archives WHERE round BETWEEN ?1 AND ?2"
        )
    } else {
        let columns = columns.replace("scanned_count_", "scan_count_");
        format!(
            "SELECT round,total_scans,json_array({columns}) FROM lotto_draw_scan_counts WHERE round BETWEEN ?1 AND ?2"
        )
    };
    let rows = store.query(&sql, &[Value::Integer(minimum), Value::Integer(round)])?;
    let mut rounds = BTreeMap::new();
    for r in rows {
        rounds.insert(
            db::integer(&r[0], "round")?,
            (db::integer(&r[1], "records")?, vector(&r[2], 45)?),
        );
    }
    let start = match period {
        "all" => 1,
        "four" => (round - 3).max(1),
        _ => round,
    };
    let prior_start = if period == "four" {
        (round - 7).max(1)
    } else {
        round - 1
    };
    let prior_end = if period == "four" {
        round - 4
    } else {
        round - 1
    };
    let mut counts = vec![0; 45];
    let mut previous = vec![0; 45];
    let mut records = 0;
    for (&r, (total, values)) in &rounds {
        if r >= start {
            records += total;
            add(&mut counts, values);
        }
        if r >= prior_start && r <= prior_end && period != "all" {
            add(&mut previous, values);
        }
    }
    let hour_start = now / 3_600_000 - 23;
    let hour_rows=store.query("SELECT hour,combinations,number_counts_json FROM lotto_activity_hours WHERE source=?1 AND round BETWEEN ?2 AND ?3 AND hour>=?4 AND hour<=?5 ORDER BY hour",&[Value::Text(kind.into()),Value::Integer(start),Value::Integer(round),Value::Integer(hour_start),Value::Integer(now / 3_600_000)])?;
    let mut hours = BTreeMap::<i64, (i64, Vec<i64>)>::new();
    for r in hour_rows {
        let h = db::integer(&r[0], "hour")?;
        let item = hours.entry(h).or_insert((0, vec![0; 45]));
        item.0 += db::integer(&r[1], "combinations")?;
        add(&mut item.1, &vector(&r[2], 45)?);
    }
    if period == "day" {
        counts.fill(0);
        previous.fill(0);
        records = 0;
        for (total, values) in hours.values() {
            records += total;
            add(&mut counts, values);
        }
    }
    // Pairs/patterns are round aggregates, so do not pretend to have a 24h slice.
    let patterns = if period == "day" {
        Vec::new()
    } else {
        store.query("SELECT combinations,odd_counts_json,sum_counts_json,with_consecutive,started_at FROM lotto_activity_rounds WHERE source=?1 AND round BETWEEN ?2 AND ?3",&[Value::Text(kind.into()),Value::Integer(start),Value::Integer(round)])?
    };
    let mut combinations = 0;
    let mut odd = vec![0; 7];
    let mut sums = vec![0; 14];
    let mut consecutive = 0;
    let mut since = None;
    for r in patterns {
        combinations += db::integer(&r[0], "combinations")?;
        add(&mut odd, &vector(&r[1], 7)?);
        add(&mut sums, &vector(&r[2], 14)?);
        consecutive += db::integer(&r[3], "consecutive")?;
        let at = db::integer(&r[4], "started")?;
        since = Some(since.map_or(at, |previous: i64| previous.min(at)));
    }
    let pairs = if period == "day" {
        Vec::new()
    } else {
        store.query("SELECT first_number,second_number,sum(occurrences) FROM lotto_activity_pairs WHERE source=?1 AND round BETWEEN ?2 AND ?3 GROUP BY first_number,second_number HAVING sum(occurrences)>0 ORDER BY sum(occurrences) DESC,first_number,second_number",&[Value::Text(kind.into()),Value::Integer(start),Value::Integer(round)])?
    };
    let pairs=pairs.iter().map(|r|Ok(json!({"a":db::integer(&r[0],"first")?,"b":db::integer(&r[1],"second")?,"count":db::integer(&r[2],"pair count")?}))).collect::<ApiResult<Vec<_>>>()?;
    let trend=((round-5).max(1)..=round).map(|r|{ let data=rounds.get(&r); json!({"round":r,"records":data.map_or(0,|d|d.0),"numberCounts":data.map_or_else(||vec![0;45],|d|d.1.clone()),"available":data.is_some()}) }).collect::<Vec<_>>();
    Ok(
        json!({"source":kind,"records":records,"numberCounts":counts,"previousCounts":previous,"rounds":trend,"patterns":{"combinations":combinations,"oddCounts":odd,"sumCounts":sums,"withConsecutive":consecutive,"since":since},"pairs":pairs,"hours":hours.into_iter().map(|(hour,(total,counts))|json!({"hour":hour*3_600_000,"combinations":total,"numberCounts":counts})).collect::<Vec<_>>()}),
    )
}
fn snapshot(store: &mut impl Store, round: i64, period: &str, now: i64) -> ApiResult<Json> {
    let current = lotto::target_round(now);
    validate_query(round, period, current)?;
    let generated = source(store, "generated", round, period, now)?;
    let scanned = source(store, "scanned", round, period, now)?;
    let draws=store.query("SELECT draw_number_1,draw_number_2,draw_number_3,draw_number_4,draw_number_5,draw_number_6,bonus_number,draw_date FROM lotto_draw_results WHERE round=?1",&[Value::Integer(round)])?;
    let draw=draws.first().map(|r|->ApiResult<Json>{Ok(json!({"round":round,"numbers":r[..6].iter().map(|v|db::integer(v,"draw number")).collect::<ApiResult<Vec<_>>>()?,"bonus":db::integer(&r[6],"bonus")?,"drawDate":db::text(&r[7],"draw date")?}))}).transpose()?;
    let known=store.query("SELECT round FROM (SELECT round FROM lotto_draw_scan_counts UNION SELECT round FROM lotto_draw_generation_counts UNION SELECT round FROM lotto_generation_weekly_archives) WHERE round<=?1 ORDER BY round DESC LIMIT 120",&[Value::Integer(current)])?;
    let mut known = known
        .iter()
        .map(|r| db::integer(&r[0], "round"))
        .collect::<ApiResult<Vec<_>>>()?;
    if !known.contains(&current) {
        known.insert(0, current);
    }
    Ok(
        json!({"round":round,"currentRound":current,"period":period,"updatedAt":now,"sources":{"generated":generated,"scanned":scanned},"draw":draw,"knownRounds":known}),
    )
}
fn validate_query(round: i64, period: &str, current: i64) -> ApiResult<()> {
    if round < 1
        || round > current
        || !["round", "four", "all", "day"].contains(&period)
        || (period == "day" && round != current)
    {
        return Err(bad_request(
            "INVALID_ACTIVITY_QUERY",
            "회차와 집계 기간을 확인해 주세요.",
        ));
    }
    Ok(())
}
fn cached_snapshot(store: &mut impl Store, round: i64, period: &str, now: i64) -> ApiResult<Json> {
    let current = lotto::target_round(now);
    validate_query(round, period, current)?;
    if period != "all" {
        return snapshot(store, round, period, now);
    }
    let rows=store.query("SELECT snapshot_json FROM lotto_activity_all_cache WHERE round=?1 AND current_round=?2 AND captured_at<=?3 AND expires_at>?3",&[Value::Integer(round),Value::Integer(current),Value::Integer(now)])?;
    if let Some(row) = rows.first() {
        return serde_json::from_str(&db::text(&row[0], "cached activity")?).map_err(internal);
    }
    let result = snapshot(store, round, period, now)?;
    store.execute("INSERT INTO lotto_activity_all_cache(round,current_round,captured_at,expires_at,snapshot_json) VALUES (?1,?2,?3,?4,?5) ON CONFLICT(round) DO UPDATE SET current_round=excluded.current_round,captured_at=excluded.captured_at,expires_at=excluded.expires_at,snapshot_json=excluded.snapshot_json",&[Value::Integer(round),Value::Integer(current),Value::Integer(now),Value::Integer(now+15_000),Value::Text(result.to_string())])?;
    // Arbitrary historical queries cannot grow the cache without bound.
    store.execute("DELETE FROM lotto_activity_all_cache WHERE round IN (SELECT round FROM lotto_activity_all_cache ORDER BY captured_at DESC,round DESC LIMIT -1 OFFSET 32)",&[])?;
    Ok(result)
}
pub(crate) async fn get(req: &mut Request) -> ApiResult<Json> {
    let mut tx = db::tx()?;
    let now = db::now_ms_tx(&mut tx)?;
    let round = req
        .query_param("round")
        .map(|s| {
            s.parse::<i64>()
                .map_err(|_| bad_request("INVALID_ROUND", "회차를 확인해 주세요."))
        })
        .transpose()?
        .unwrap_or(lotto::target_round(now));
    let period = req.query_param("period").unwrap_or_else(|| "round".into());
    let result = cached_snapshot(&mut tx, round, &period, now)?;
    db::tx_commit(&mut tx)?;
    Ok(result)
}

#[cfg(test)]
mod tests;
