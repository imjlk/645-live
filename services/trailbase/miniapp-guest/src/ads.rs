use crate::{auth, body, db, lotto, settings};
use serde::Deserialize;
use serde_json::{Value as Json, json};
use trailbase_guest_common::responses::*;
use trailbase_wasm::{
    db::{Transaction, Value},
    http::Request,
};

pub(crate) fn require_pass(
    tx: &mut Transaction,
    user: &[u8],
    feature: &str,
    now: i64,
) -> ApiResult<()> {
    let rows = db::tx_query(
        tx,
        "SELECT 1 FROM ait_lotto_entitlements WHERE user_id = ?1 AND feature = ?2 AND expires_at > ?3",
        &[
            Value::Blob(user.to_vec()),
            Value::Text(feature.into()),
            Value::Integer(now),
        ],
    )?;
    if rows.is_empty() {
        return Err(forbidden("PASS_REQUIRED", "이용권을 먼저 열어 주세요."));
    }
    Ok(())
}
pub(crate) fn grant_pass(
    tx: &mut Transaction,
    user: &[u8],
    feature: &str,
    expires: i64,
) -> ApiResult<()> {
    db::tx_execute(
        tx,
        "INSERT INTO ait_lotto_entitlements(user_id, feature, expires_at) VALUES (?1,?2,?3) ON CONFLICT(user_id, feature) DO UPDATE SET expires_at = max(ait_lotto_entitlements.expires_at, excluded.expires_at)",
        &[
            Value::Blob(user.to_vec()),
            Value::Text(feature.into()),
            Value::Integer(expires),
        ],
    )?;
    Ok(())
}
pub(crate) async fn config(req: &mut Request) -> ApiResult<Json> {
    let mut tx = db::tx()?;
    let user = auth::user(req, &mut tx)?;
    let now = db::now_ms_tx(&mut tx)?;
    let rows = db::tx_query(
        &mut tx,
        "SELECT placement, enabled, rewarded_group_id, interstitial_group_id, rewarded_weight, pass_duration_ms FROM ait_lotto_ad_placements",
        &[],
    )?;
    let test = settings::string_or("AIT_TEST_ADS", "false") == "true";
    let placements = rows.iter().map(|r| -> ApiResult<Json> {
        let feature = db::text(&r[0], "placement")?;
        let ids = groups(r, test)?;
        Ok(json!({"placement":feature,"enabled":test || db::integer(&r[1],"enabled")? == 1 && (ids.0.is_some() || ids.1.is_some()),"rewardedGroupId":ids.0,"interstitialGroupId":ids.1,"rewardedWeight":db::integer(&r[4],"weight")?,"passDurationMs":db::integer(&r[5],"duration")?}))
    }).collect::<ApiResult<Vec<_>>>()?;
    let passes = db::tx_query(
        &mut tx,
        "SELECT feature, expires_at FROM ait_lotto_entitlements WHERE user_id = ?1 AND expires_at > ?2",
        &[Value::Blob(user.id), Value::Integer(now)],
    )?;
    let passes = passes
        .iter()
        .map(|r| {
            Ok((
                db::text(&r[0], "feature")?,
                json!(db::integer(&r[1], "expires")?),
            ))
        })
        .collect::<ApiResult<serde_json::Map<String, Json>>>()?;
    db::tx_commit(&mut tx)?;
    Ok(
        json!({"placements":placements,"passes":passes,"testMode":test,"bannerGroupId":if test {Some("ait-ad-test-banner-id".into())} else {settings::string("AIT_BANNER_GROUP_ID")},"serverTime":now}),
    )
}
fn groups(row: &[Value], test: bool) -> ApiResult<(Option<String>, Option<String>)> {
    if test {
        return Ok((
            Some("ait-ad-test-rewarded-id".into()),
            Some("ait-ad-test-interstitial-id".into()),
        ));
    }
    Ok((
        db::nullable_text(&row[2])?.filter(|v| !v.trim().is_empty()),
        db::nullable_text(&row[3])?.filter(|v| !v.trim().is_empty()),
    ))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Start {
    placement: String,
}
pub(crate) async fn start(req: &mut Request) -> ApiResult<Json> {
    let input: Start = body(req).await?;
    let mut tx = db::tx()?;
    let user = auth::user(req, &mut tx)?;
    let now = db::now_ms_tx(&mut tx)?;
    let rows = db::tx_query(
        &mut tx,
        "SELECT placement, enabled, rewarded_group_id, interstitial_group_id, rewarded_weight, pass_duration_ms, cooldown_ms, daily_cap FROM ait_lotto_ad_placements WHERE placement = ?1",
        &[Value::Text(input.placement.clone())],
    )?;
    let row = rows
        .first()
        .ok_or_else(|| bad_request("INVALID_PLACEMENT", "이용권을 확인해 주세요."))?;
    let test = settings::string_or("AIT_TEST_ADS", "false") == "true";
    let (rewarded, interstitial) = groups(row, test)?;
    if !test && db::integer(&row[1], "enabled")? != 1
        || rewarded.is_none() && interstitial.is_none()
    {
        return Err(conflict(
            "AD_UNAVAILABLE",
            "지금은 광고 이용권을 준비 중이에요.",
        ));
    }
    if require_pass(&mut tx, &user.id, &input.placement, now).is_ok() {
        db::tx_commit(&mut tx)?;
        return Ok(json!({"alreadyGranted":true}));
    }
    // Expired reservations remain in the ledger for daily caps; they release the outstanding slot.
    db::tx_execute(
        &mut tx,
        "UPDATE ait_lotto_ad_sessions SET status = 'expired' WHERE user_id = ?1 AND status = 'pending' AND expires_at <= ?2",
        &[Value::Blob(user.id.clone()), Value::Integer(now)],
    )?;
    let pending = db::tx_query(
        &mut tx,
        "SELECT id FROM ait_lotto_ad_sessions WHERE user_id = ?1 AND status = 'pending'",
        &[Value::Blob(user.id.clone())],
    )?;
    if !pending.is_empty() {
        return Err(conflict(
            "AD_IN_PROGRESS",
            "진행 중인 광고를 닫은 뒤 잠시 기다려 주세요.",
        ));
    }
    let day = crate::engagement::kst_day(now);
    let usage = db::tx_query(
        &mut tx,
        "SELECT count(*), coalesce(max(created_at),0) FROM ait_lotto_ad_sessions WHERE user_id = ?1 AND created_at >= ?2",
        &[
            Value::Blob(user.id.clone()),
            Value::Integer(day * 86_400_000 - 32_400_000),
        ],
    )?;
    if db::integer(&usage[0][0], "count")? >= db::integer(&row[7], "cap")?
        || now - db::integer(&usage[0][1], "last")? < db::integer(&row[6], "cooldown")?
    {
        return Err(too_many_requests(
            "AD_COOLDOWN",
            "광고는 잠시 후 다시 볼 수 있어요.",
        ));
    }
    let rewarded_selected = rewarded.is_some()
        && (interstitial.is_none()
            || lotto::random_index(100) < db::integer(&row[4], "weight")? as usize);
    let (format, group) = if rewarded_selected {
        ("rewarded", rewarded.unwrap())
    } else {
        ("interstitial", interstitial.unwrap())
    };
    let id = lotto::random_id();
    let expires = now + 300_000;
    db::tx_execute(
        &mut tx,
        "INSERT INTO ait_lotto_ad_sessions(id,user_id,placement,format,group_id,created_at,expires_at,pass_duration_ms) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
        &[
            Value::Text(id.clone()),
            Value::Blob(user.id),
            Value::Text(input.placement),
            Value::Text(format.into()),
            Value::Text(group.clone()),
            Value::Integer(now),
            Value::Integer(expires),
            Value::Integer(db::integer(&row[5], "duration")?),
        ],
    )?;
    db::tx_commit(&mut tx)?;
    Ok(json!({"alreadyGranted":false,"id":id,"format":format,"groupId":group,"expiresAt":expires}))
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Complete {
    id: String,
    events: Vec<String>,
}
pub(crate) fn completed(format: &str, events: &[String]) -> bool {
    let has = |event: &str| events.iter().any(|v| v == event);
    has("show")
        && if format == "rewarded" {
            has("userEarnedReward")
        } else {
            has("impression") && has("dismissed")
        }
}
pub(crate) async fn complete(req: &mut Request) -> ApiResult<Json> {
    let input: Complete = body(req).await?;
    if input.events.len() > 30
        || input.events.iter().any(|e| {
            ![
                "requested",
                "show",
                "impression",
                "clicked",
                "dismissed",
                "userEarnedReward",
                "failedToShow",
                "cancelled",
            ]
            .contains(&e.as_str())
        })
    {
        return Err(bad_request(
            "INVALID_EVENTS",
            "광고 결과를 확인하지 못했어요.",
        ));
    }
    let mut tx = db::tx()?;
    let user = auth::user(req, &mut tx)?;
    let now = db::now_ms_tx(&mut tx)?;
    let rows = db::tx_query(
        &mut tx,
        "SELECT placement,format,created_at,completed_at,expires_at,pass_duration_ms,status FROM ait_lotto_ad_sessions WHERE id = ?1 AND user_id = ?2",
        &[Value::Text(input.id.clone()), Value::Blob(user.id.clone())],
    )?;
    let r = rows
        .first()
        .ok_or_else(|| not_found("AD_NOT_FOUND", "광고 요청이 만료됐어요."))?;
    let feature = db::text(&r[0], "placement")?;
    let status = db::text(&r[6], "status")?;
    if status == "cancelled" || status == "expired" {
        return Err(conflict("AD_INCOMPLETE", "이미 종료된 광고 요청이에요."));
    }
    if let Some(at) = db::nullable_integer(&r[3])? {
        db::tx_commit(&mut tx)?;
        return Ok(
            json!({"feature":feature,"expiresAt":at+db::integer(&r[5],"duration")?,"replayed":true}),
        );
    }
    if now >= db::integer(&r[4], "expires")? {
        return Err(conflict("AD_EXPIRED", "광고 요청이 만료됐어요."));
    }
    if !completed(&db::text(&r[1], "format")?, &input.events) {
        // Cancellation releases the outstanding slot without producing a pass.
        db::tx_execute(
            &mut tx,
            "UPDATE ait_lotto_ad_sessions SET status = 'cancelled' WHERE id = ?1",
            &[Value::Text(input.id)],
        )?;
        db::tx_commit(&mut tx)?;
        return Err(conflict(
            "AD_INCOMPLETE",
            "광고를 완료하면 이용권이 열려요.",
        ));
    }
    let expires = now + db::integer(&r[5], "duration")?;
    grant_pass(&mut tx, &user.id, &feature, expires)?;
    db::tx_execute(
        &mut tx,
        "UPDATE ait_lotto_ad_sessions SET status = 'granted', completed_at = ?1, events_json = ?2 WHERE id = ?3",
        &[
            Value::Integer(now),
            Value::Text(serde_json::to_string(&input.events).map_err(internal)?),
            Value::Text(input.id),
        ],
    )?;
    db::tx_commit(&mut tx)?;
    Ok(json!({"feature":feature,"expiresAt":expires,"replayed":false}))
}
#[cfg(test)]
mod tests {
    use super::*;
    fn events(v: &[&str]) -> Vec<String> {
        v.iter().map(|s| s.to_string()).collect()
    }
    #[test]
    fn no_reward_on_dismiss_or_timeout() {
        assert!(!completed(
            "rewarded",
            &events(&["show", "impression", "dismissed"])
        ));
        assert!(completed(
            "rewarded",
            &events(&["show", "userEarnedReward"])
        ));
        assert!(!completed("interstitial", &events(&["show", "dismissed"])));
        assert!(completed(
            "interstitial",
            &events(&["show", "impression", "dismissed"])
        ));
    }
}
