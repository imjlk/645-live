use crate::{db, lotto};
use serde_json::{Map, Value as Json, json};
use trailbase_guest_common::responses::ApiResult;
use trailbase_wasm::{db::Value, http::Response};

// Each invocation commits one bounded batch. The next minute resumes unfinished work.
const BATCH_SIZE: i64 = 1_000;
const REQUEST_RETENTION_MS: i64 = 86_400_000;

struct Step {
    name: &'static str,
    sql: String,
    params: Vec<i64>,
}

fn steps(now: i64) -> Vec<Step> {
    let current = lotto::target_round(now);
    let columns = (1..=45)
        .map(|n| format!("generation_count_{n}"))
        .collect::<Vec<_>>()
        .join(",");
    let zeros = serde_json::to_string(&vec![0; 45]).expect("integer array");
    vec![
        Step {
            name: "archivedRounds",
            sql: format!(
                "INSERT INTO lotto_generation_weekly_archives(round,total_generations,number_counts_json,closed_at,archived_at,comparison_source)
                 SELECT round,total_generations,json_array({columns}),{first_close}+(round-1)*{week},?2,'collecting'
                 FROM lotto_draw_generation_counts c
                 WHERE round<?1 AND NOT EXISTS (SELECT 1 FROM lotto_generation_weekly_archives a WHERE a.round=c.round)
                 ORDER BY round LIMIT 8",
                first_close = lotto::FIRST_CLOSE_MS,
                week = lotto::WEEK_MS,
            ),
            params: vec![current, now],
        },
        Step {
            name: "emptyRounds",
            // Do not create a zero snapshot for a round still waiting behind older snapshots.
            sql: format!(
                "INSERT OR IGNORE INTO lotto_generation_weekly_archives(round,total_generations,number_counts_json,closed_at,archived_at,comparison_source)
                 SELECT ?1-1,0,'{zeros}',?2,?3,'complete' WHERE ?1>1
                 AND NOT EXISTS (SELECT 1 FROM lotto_draw_generation_counts WHERE round=?1-1)
                 AND NOT EXISTS (SELECT 1 FROM lotto_public_generations WHERE round=?1-1)"
            ),
            params: vec![current, lotto::close_time(current - 1), now],
        },
        Step {
            name: "preparedRounds",
            sql: "INSERT OR IGNORE INTO lotto_draw_generation_counts(round,updated_at) VALUES (?1,?2)".into(),
            params: vec![current, now],
        },
        Step {
            name: "removedLiveCounters",
            sql: "DELETE FROM lotto_draw_generation_counts WHERE round<?1 AND round IN (SELECT round FROM lotto_generation_weekly_archives)".into(),
            params: vec![current],
        },
        Step {
            name: "removedGenerations",
            sql: "DELETE FROM lotto_public_generations WHERE id IN (
                    SELECT id FROM lotto_public_generations
                    WHERE round IN (SELECT round FROM lotto_generation_weekly_archives WHERE purged_at IS NULL)
                    ORDER BY round,id DESC LIMIT ?1)".into(),
            params: vec![BATCH_SIZE],
        },
        Step {
            name: "purgedRounds",
            sql: "UPDATE lotto_generation_weekly_archives SET purged_at=?1,
                  comparison_source=CASE WHEN comparison_source='collecting' AND captured_generations=total_generations
                                        THEN 'complete' ELSE comparison_source END
                  WHERE purged_at IS NULL AND NOT EXISTS (
                    SELECT 1 FROM lotto_public_generations g WHERE g.round=lotto_generation_weekly_archives.round)".into(),
            params: vec![now],
        },
        Step {
            name: "removedRequests",
            // Attendance and rolling 24h generation limits still need today's request rows.
            // Unary + matches JSON expression affinity; the hint avoids scanning all NULL FKs.
            sql: "DELETE FROM ait_lotto_generation_requests WHERE rowid IN (
                    SELECT rowid FROM ait_lotto_generation_requests INDEXED BY ait_lotto_requests_archive WHERE generation_id IS NULL
                    AND created_at<?1 AND json_extract(payload_json,'$.round') IN (SELECT +round FROM lotto_generation_weekly_archives)
                    ORDER BY json_extract(payload_json,'$.round'),created_at LIMIT ?2)".into(),
            params: vec![now - REQUEST_RETENTION_MS, BATCH_SIZE],
        },
        Step {
            name: "expiredResultSources",
            // Allow corrections for seven days, or at most fourteen days without a result.
            sql: "UPDATE lotto_generation_weekly_archives
                  SET comparison_source=CASE WHEN result_settled_at IS NOT NULL THEN 'expired' ELSE 'unavailable' END
                  WHERE comparison_source IN ('collecting','complete')
                  AND (result_settled_at<?1-604800000 OR (result_settled_at IS NULL AND closed_at<?1-1209600000))".into(),
            params: vec![now],
        },
        Step {
            name: "removedResultCombinations",
            sql: "DELETE FROM lotto_generation_result_combinations WHERE (round,number_mask) IN (
                    SELECT round,number_mask FROM lotto_generation_result_combinations
                    WHERE round IN (SELECT round FROM lotto_generation_weekly_archives WHERE comparison_source IN ('expired','unavailable'))
                    ORDER BY round,number_mask LIMIT ?1)".into(),
            params: vec![BATCH_SIZE],
        },
        Step {
            name: "removedWebBatches",
            // Keep ownership until the entire round has been purged, including partial batches.
            sql: "DELETE FROM web_lotto_generation_batches WHERE rowid IN (
                    SELECT rowid FROM web_lotto_generation_batches INDEXED BY web_lotto_batches_archive WHERE created_at<?1
                    AND json_extract(payload_json,'$.round') IN (SELECT +round FROM lotto_generation_weekly_archives WHERE purged_at IS NOT NULL)
                    ORDER BY json_extract(payload_json,'$.round'),created_at LIMIT ?2)".into(),
            params: vec![now - REQUEST_RETENTION_MS, BATCH_SIZE],
        },
    ]
}

pub(crate) fn run() -> ApiResult<Json> {
    // This is shared web/miniapp data maintenance, independent of participation feature flags.
    let mut tx = db::tx()?;
    let now = db::now_ms_tx(&mut tx)?;
    let mut result = Map::new();
    for step in steps(now) {
        let params = step
            .params
            .into_iter()
            .map(Value::Integer)
            .collect::<Vec<_>>();
        let changed = db::tx_execute(&mut tx, &step.sql, &params)?;
        result.insert(step.name.into(), json!(changed));
    }
    db::tx_commit(&mut tx)?;
    result.insert("ok".into(), json!(true));
    result.insert("targetRound".into(), json!(lotto::target_round(now)));
    Ok(Json::Object(result))
}

pub async fn job() -> Response {
    // Return HTTP failure on errors so the scheduler does not mark a failed purge as successful.
    crate::respond(run())
}

#[cfg(test)]
pub(crate) mod tests;
