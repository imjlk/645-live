use crate::{auth, body, db};
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use serde::Deserialize;
use serde_json::{Value as Json, json};
use trailbase_guest_common::{
    analytics_events::{ANALYTICS_EVENTS_TABLE, AnalyticsEventInput, insert_analytics_event_tx},
    responses::*,
};
use trailbase_wasm::{
    db::{Transaction, Value},
    http::Request,
};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Batch {
    events: Vec<Event>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Event {
    event_name: String,
    event_payload: Props,
    client_created_at: i64,
}
#[derive(Deserialize, serde::Serialize)]
#[serde(deny_unknown_fields)]
struct Props {
    placement: String,
    format: String,
    policy: String,
    flow_id: String,
    outcome: String,
    entry_point: String,
    app_version: String,
    session_id: String,
    event_id: String,
}
fn variant(principal: &str) -> &'static str {
    let mut hash = 2166136261u32;
    for c in format!("generation-cadence-v2:{principal}").encode_utf16() {
        hash = (hash ^ c as u32).wrapping_mul(16777619);
    }
    hash = (hash ^ (hash >> 16)).wrapping_mul(0x85ebca6b);
    hash = (hash ^ (hash >> 13)).wrapping_mul(0xc2b2ae35);
    hash ^= hash >> 16;
    if hash % 2 == 0 { "control" } else { "short" }
}
fn attach(tx: &mut Transaction) -> ApiResult<()> {
    let attached = db::tx_query(tx, "PRAGMA database_list", &[])?
        .iter()
        .any(|row| matches!(row.get(1),Some(Value::Text(name)) if name=="analytics"));
    if !attached {
        db::tx_execute(
            tx,
            "ATTACH DATABASE ?1 AS analytics",
            &[Value::Text("/app/traildepot/data/analytics.db".into())],
        )?;
    }
    let version = db::tx_query(tx, "PRAGMA analytics.user_version", &[])?;
    if db::integer(&version[0][0], "version")? < 1 {
        db::tx_execute(
            tx,
            "CREATE TABLE IF NOT EXISTS analytics.events (id INTEGER PRIMARY KEY,name TEXT NOT NULL,screen TEXT,source TEXT,props_json TEXT NOT NULL CHECK(json_valid(props_json)),user_id BLOB,client_at INTEGER NOT NULL,server_at INTEGER NOT NULL,request_id TEXT,batch_id TEXT) STRICT",
            &[],
        )?;
        for sql in [
            "CREATE INDEX IF NOT EXISTS analytics.idx_events_server_at ON events(server_at DESC)",
            "CREATE INDEX IF NOT EXISTS analytics.idx_events_name_server_at ON events(name,server_at DESC)",
            "CREATE UNIQUE INDEX IF NOT EXISTS analytics.idx_events_request ON events(user_id,request_id) WHERE request_id IS NOT NULL",
            "CREATE INDEX IF NOT EXISTS analytics.idx_events_user_server ON events(user_id,server_at)",
            "PRAGMA analytics.user_version = 1",
        ] {
            db::tx_execute(tx, sql, &[])?;
        }
    }
    Ok(())
}
// Validate cohort and shape, not cadence: ranges are client-owned tuning values.
fn valid_policy(policy: &str, expected: &str) -> bool {
    if policy.len() > 96 {
        return false;
    }
    let prefix = format!("generation-cadence-v2/{expected}:device:");
    let Some(ranges) = policy.strip_prefix(&prefix) else {
        return false;
    };
    let Some((first, recurring)) = ranges.split_once(':') else {
        return false;
    };
    fn valid_range(value: &str) -> bool {
        let (min, max) = value.split_once('-').unwrap_or((value, value));
        let (Ok(min), Ok(max)) = (min.parse::<u16>(), max.parse::<u16>()) else {
            return false;
        };
        min >= 1 && min <= max && max <= 200
    }
    valid_range(first) && valid_range(recurring)
}

fn validate(event: &Event, expected: &str) -> ApiResult<()> {
    let valid_name = matches!(
        event.event_name.as_str(),
        "experiment_exposed"
            | "generation_attempted"
            | "generation_succeeded"
            | "cta_viewed"
            | "requested"
            | "session_started"
            | "shown"
            | "viewable"
            | "completed"
            | "unavailable"
            | "failed"
            | "settled"
            | "feature_outcome"
            | "generation_completed"
    );
    let p = &event.event_payload;
    let bounded = [
        (&p.flow_id, 64),
        (&p.session_id, 64),
        (&p.event_id, 96),
        (&p.outcome, 64),
        (&p.entry_point, 32),
        (&p.format, 32),
        (&p.app_version, 24),
    ]
    .iter()
    .all(|(s, n)| {
        s.len() <= *n
            && s.bytes()
                .all(|c| c.is_ascii_alphanumeric() || b"-_.:".contains(&c))
    });
    if !valid_name
        || !bounded
        || p.session_id.is_empty()
        || p.event_id.is_empty()
        || !valid_policy(&p.policy, expected)
        || p.placement != "generation_continue"
    {
        return Err(bad_request("INVALID_METRIC", "지표 형식을 확인해 주세요."));
    }
    Ok(())
}
pub(crate) async fn ingest(req: &mut Request) -> ApiResult<Json> {
    let batch: Batch = body(req).await?;
    if batch.events.is_empty() || batch.events.len() > 20 {
        return Err(bad_request("INVALID_BATCH", "지표 묶음을 확인해 주세요."));
    }
    let mut tx = db::tx()?;
    let user = auth::user(req, &mut tx)?;
    let expected = variant(&URL_SAFE_NO_PAD.encode(&user.id));
    for e in &batch.events {
        validate(e, expected)?;
    }
    attach(&mut tx)?;
    let now = db::now_ms_tx(&mut tx)?;
    let count = db::tx_query(
        &mut tx,
        "SELECT count(*) FROM analytics.events WHERE user_id=?1 AND server_at>?2",
        &[
            Value::Blob(user.id.clone()),
            Value::Integer(now - 86_400_000),
        ],
    )?;
    if db::integer(&count[0][0], "count")? + batch.events.len() as i64 > 3000 {
        return Err(bad_request("METRIC_LIMIT", "지표 전송 한도에 도달했어요."));
    }
    for e in batch.events {
        let p = e.event_payload;
        if !db::tx_query(
            &mut tx,
            "SELECT 1 FROM analytics.events WHERE user_id=?1 AND request_id=?2",
            &[
                Value::Blob(user.id.clone()),
                Value::Text(p.event_id.clone()),
            ],
        )?
        .is_empty()
        {
            continue;
        }
        insert_analytics_event_tx(
            &mut tx,
            ANALYTICS_EVENTS_TABLE,
            AnalyticsEventInput {
                event_name: &e.event_name,
                screen: None,
                source: Some(expected),
                payload: Some(serde_json::to_value(&p).map_err(internal)?),
                user_id: Some(&user.id),
                client_created_at: e.client_created_at.clamp(now - 300_000, now),
                server_received_at: now,
                request_id: Some(&p.event_id),
                batch_id: Some(&p.session_id),
            },
        )?;
    }
    // Bounded maintenance; metrics never alter functional ledgers.
    db::tx_execute(
        &mut tx,
        "DELETE FROM analytics.events WHERE id IN (SELECT id FROM analytics.events WHERE server_at<?1 ORDER BY server_at LIMIT 200)",
        &[Value::Integer(now - 45 * 86_400_000)],
    )?;
    db::tx_commit(&mut tx)?;
    Ok(json!({"accepted":true}))
}
pub(crate) fn delete_user(tx: &mut Transaction, user_id: &[u8]) -> ApiResult<()> {
    attach(tx)?;
    db::tx_execute(
        tx,
        "DELETE FROM analytics.events WHERE user_id=?1",
        &[Value::Blob(user_id.to_vec())],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn client_tuning_does_not_require_server_range_updates() {
        assert!(valid_policy(
            "generation-cadence-v2/short:device:5-5:5-30",
            "short"
        ));
        for value in [
            "generation-cadence-v2/control:device:5:5-30",
            "generation-cadence-v2/short:device:0:5-30",
            "generation-cadence-v2/short:device:5:30-5",
            "generation-cadence-v2/short:device:5:5-201",
            "generation-cadence-v2/short:device:5:5-30:extra",
        ] {
            assert!(!valid_policy(value, "short"));
        }
    }
    #[test]
    fn policy_rejects_oversized_zero_padded_ranges() {
        let policy = format!("generation-cadence-v2/short:device:{}1:2-8", "0".repeat(96));
        assert!(!valid_policy(&policy, "short"));
    }
    #[test]
    fn cohort_is_stable_and_balanced() {
        let count = (0..1000)
            .filter(|n| variant(&format!("test-{n}")) == "short")
            .count();
        assert!((450..550).contains(&count));
    }
    #[test]
    fn metric_validation_rejects_wrong_arm_and_extra_fields() {
        let raw = r#"{"placement":"generation_continue","format":"rewarded","policy":"generation-cadence-v2/short:device:1-3:2-8","flow_id":"f","outcome":"","entry_point":"continuation","app_version":"1.6.0","session_id":"s","event_id":"s-1"}"#;
        let e = Event {
            event_name: "completed".into(),
            event_payload: serde_json::from_str(raw).unwrap(),
            client_created_at: 1,
        };
        assert!(validate(&e, "short").is_ok());
        assert!(validate(&e, "control").is_err());
        assert!(
            serde_json::from_str::<Props>(&raw.replace("\"placement\"", "\"secret\"")).is_err()
        );
    }
}
