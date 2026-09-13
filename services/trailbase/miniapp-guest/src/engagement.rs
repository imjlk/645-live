use crate::{ads, auth, body, db, lotto, settings};
use serde::Deserialize;
use serde_json::{Value as Json, json};
use trailbase_guest_common::{
    apps_in_toss_messages as messages, apps_in_toss_proxy as proxy, promotion_rewards as rewards,
    responses::*, session::hmac_hex,
};
use trailbase_wasm::{
    db::{Transaction, Value},
    http::Request,
};

pub fn kst_day(now: i64) -> i64 {
    (now + 32_400_000).div_euclid(86_400_000)
}
pub(crate) fn streak(tx: &mut Transaction, user: &[u8], day: i64) -> ApiResult<(bool, i64)> {
    let rows = db::tx_query(
        tx,
        "SELECT day FROM ait_lotto_attendance WHERE user_id = ?1 AND day <= ?2 ORDER BY day DESC LIMIT 366",
        &[Value::Blob(user.to_vec()), Value::Integer(day)],
    )?;
    let days = rows
        .iter()
        .map(|r| db::integer(&r[0], "day"))
        .collect::<ApiResult<Vec<_>>>()?;
    let checked = days.first() == Some(&day);
    let mut expected = if checked { day } else { day - 1 };
    let mut count = 0;
    for actual in days {
        if actual != expected {
            break;
        }
        count += 1;
        expected -= 1;
    }
    Ok((checked, count))
}
pub(crate) fn notification_template() -> Option<String> {
    if settings::string_or("AIT_NOTIFICATIONS_ENABLED", "false") != "true"
        || settings::string("MTLS_PROXY_URL").is_none()
        || settings::string("AIT_IDENTITY_ENCRYPTION_KEY").is_none()
    {
        return None;
    }
    settings::string("AIT_RESULT_TEMPLATE_CODE")
}
pub(crate) async fn attendance_status(req: &mut Request) -> ApiResult<Json> {
    let mut tx = db::tx()?;
    let user = auth::user(req, &mut tx)?;
    let now = db::now_ms_tx(&mut tx)?;
    let (checked, count) = streak(&mut tx, &user.id, kst_day(now))?;
    let template = notification_template();
    let opted = if let Some(code) = &template {
        !db::tx_query(&mut tx,"SELECT 1 FROM notification_template_agreements WHERE user_id = ?1 AND template_code = ?2 AND status = 'OPTED_IN'",&[Value::Blob(user.id.clone()),Value::Text(code.clone())])?.is_empty()
    } else {
        false
    };
    let campaign = active_campaign(&mut tx, now)?;
    let promotion = if let Some(c) = campaign {
        let existing = db::tx_query(
            &mut tx,
            "SELECT status,id FROM promotion_reward_ledger WHERE user_id = ?1 AND campaign_id = ?2",
            &[Value::Blob(user.id.clone()), Value::Text(c.id.clone())],
        )?;
        let identity = promotion_identity(&mut tx, &user.id, &c.id)?;
        let claimed = !db::tx_query(&mut tx, "SELECT 1 FROM ait_lotto_promotion_reservations WHERE campaign_id=?1 AND identity_hmac=?2", &[Value::Text(c.id.clone()),Value::Text(identity)])?.is_empty();
        let status = existing
            .first()
            .map(|r| db::text(&r[0], "status"))
            .transpose()?
            .or_else(|| claimed.then(|| "already_claimed".into()));
        json!({"campaignId":c.id,"claimId":existing.first().map(|r|db::text(&r[1],"claim")).transpose()?,"amount":c.amount,"eligible":count>=5 && checked && !claimed,"status":status})
    } else {
        // Existing claims stay reachable when a campaign ends or uses its final slot.
        let existing = db::tx_query(
            &mut tx,
            "SELECT campaign_id,reward_amount,status,id FROM promotion_reward_ledger WHERE user_id=?1 AND source_type='ait_lotto_attendance' ORDER BY created_at DESC LIMIT 1",
            &[Value::Blob(user.id)],
        )?;
        existing.first().map(|r| -> ApiResult<Json> {
            Ok(json!({"campaignId":db::nullable_text(&r[0])?,"claimId":db::text(&r[3],"claim")?,"amount":db::integer(&r[1],"amount")?,"eligible":false,"status":db::text(&r[2],"status")?}))
        }).transpose()?.unwrap_or(Json::Null)
    };
    db::tx_commit(&mut tx)?;
    Ok(
        json!({"day":kst_day(now),"checkedIn":checked,"streak":count,"nextPassIn":3-count%3,"notificationTemplateCode":template,"notificationsEnabled":opted,"promotion":promotion,"serverTime":now}),
    )
}
pub(crate) async fn check_in(req: &mut Request) -> ApiResult<Json> {
    let mut tx = db::tx()?;
    let user = auth::user(req, &mut tx)?;
    let now = db::now_ms_tx(&mut tx)?;
    let day = kst_day(now);
    let inserted = db::tx_execute(
        &mut tx,
        "INSERT OR IGNORE INTO ait_lotto_attendance(user_id,day,created_at) VALUES (?1,?2,?3)",
        &[
            Value::Blob(user.id.clone()),
            Value::Integer(day),
            Value::Integer(now),
        ],
    )?;
    let (_, count) = streak(&mut tx, &user.id, day)?;
    let granted = inserted > 0 && count % 3 == 0;
    if granted {
        for feature in ["custom", "report"] {
            ads::grant_pass(&mut tx, &user.id, feature, now + 86_400_000)?;
        }
    }
    db::tx_commit(&mut tx)?;
    Ok(
        json!({"checkedIn":true,"streak":count,"passGranted":granted,"replayed":inserted==0,"serverTime":now}),
    )
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Agreement {
    template_code: String,
    result: String,
}
pub(crate) async fn agreement(req: &mut Request) -> ApiResult<Json> {
    let input: Agreement = body(req).await?;
    if notification_template().as_deref() != Some(input.template_code.as_str()) {
        return Err(conflict(
            "NOTIFICATIONS_UNAVAILABLE",
            "알림을 준비 중이에요.",
        ));
    }
    let result = messages::NotificationAgreementResult::parse(&input.result)?;
    let mut tx = db::tx()?;
    let user = auth::user(req, &mut tx)?;
    let now = db::now_ms_tx(&mut tx)?;
    let record = messages::upsert_notification_template_agreement_tx(
        &mut tx,
        &user.id,
        &input.template_code,
        result,
        "apps-in-toss-sdk",
        now,
    )?;
    if record.status == "OPTED_OUT" {
        db::tx_execute(
            &mut tx,
            "DELETE FROM ait_lotto_result_watches WHERE user_id = ?1",
            &[Value::Blob(user.id.clone())],
        )?;
        db::tx_execute(
            &mut tx,
            "UPDATE message_outbox SET status = 'CANCELLED', updated_at = ?2 WHERE user_id = ?1 AND status = 'READY'",
            &[Value::Blob(user.id), Value::Integer(now)],
        )?;
    }
    db::tx_commit(&mut tx)?;
    Ok(json!({"status":record.status}))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Watch {
    round: i64,
}
pub(crate) async fn watch_result(req: &mut Request) -> ApiResult<Json> {
    let input: Watch = body(req).await?;
    let code = notification_template()
        .ok_or_else(|| conflict("NOTIFICATIONS_UNAVAILABLE", "알림을 준비 중이에요."))?;
    let mut tx = db::tx()?;
    let user = auth::user(req, &mut tx)?;
    let now = db::now_ms_tx(&mut tx)?;
    if input.round < lotto::target_round(now) - 1 || input.round > lotto::target_round(now) {
        return Err(bad_request(
            "INVALID_ROUND",
            "이번 회차의 결과 알림을 신청할 수 있어요.",
        ));
    }
    if db::tx_query(&mut tx,"SELECT 1 FROM notification_template_agreements WHERE user_id = ?1 AND template_code = ?2 AND status = 'OPTED_IN'",&[Value::Blob(user.id.clone()),Value::Text(code)])?.is_empty(){return Err(forbidden("AGREEMENT_REQUIRED","결과 알림 수신에 먼저 동의해 주세요."));}
    let result_ready = !db::tx_query(
        &mut tx,
        "SELECT 1 FROM lotto_draw_results WHERE round = ?1",
        &[Value::Integer(input.round)],
    )?
    .is_empty();
    if !result_ready {
        db::tx_execute(
            &mut tx,
            "INSERT OR IGNORE INTO ait_lotto_result_watches(user_id,round,created_at) VALUES (?1,?2,?3)",
            &[
                Value::Blob(user.id),
                Value::Integer(input.round),
                Value::Integer(now),
            ],
        )?;
    }
    db::tx_commit(&mut tx)?;
    Ok(json!({"watching":!result_ready,"resultAvailable":result_ready}))
}

pub(crate) struct Campaign {
    id: String,
    code: String,
    amount: i64,
}
fn promotion_identity(tx: &mut Transaction, user: &[u8], campaign: &str) -> ApiResult<String> {
    let rows = db::tx_query(
        tx,
        "SELECT anonymous_hash_hmac FROM ait_lotto_profiles WHERE user_id=?1",
        &[Value::Blob(user.to_vec())],
    )?;
    let row = rows
        .first()
        .ok_or_else(|| unauthorized("AUTH_REQUIRED", "연결을 다시 확인해 주세요."))?;
    hmac_hex(
        &settings::required("AIT_IDENTITY_HMAC_SECRET")?,
        &format!("promotion:{campaign}:{}", db::text(&row[0], "identity")?),
    )
}
fn active_campaign(tx: &mut Transaction, now: i64) -> ApiResult<Option<Campaign>> {
    if settings::string_or("AIT_PROMOTIONS_ENABLED", "false") != "true"
        || settings::string("MTLS_PROXY_URL").is_none()
    {
        return Ok(None);
    }
    let rows = db::tx_query(
        tx,
        "SELECT id, provider_promotion_code, reward_amount FROM promotion_campaigns c WHERE feature_key = 'ait_lotto_attendance' AND status = 'ACTIVE' AND starts_at <= ?1 AND ends_at > ?1 AND budget_limit_amount >= reward_amount + coalesce((SELECT reserved_amount FROM ait_lotto_promotion_usage WHERE campaign_id=c.id),0) AND (max_grant_count IS NULL OR max_grant_count > coalesce((SELECT grant_count FROM ait_lotto_promotion_usage WHERE campaign_id=c.id),0)) ORDER BY starts_at DESC LIMIT 1",
        &[Value::Integer(now)],
    )?;
    rows.first()
        .map(|r| {
            Ok(Campaign {
                id: db::text(&r[0], "id")?,
                code: db::text(&r[1], "code")?,
                amount: db::integer(&r[2], "amount")?,
            })
        })
        .transpose()
}
pub(crate) fn unseal(key: &str) -> ApiResult<String> {
    trailbase_toss_identity::unseal_toss_user_key(
        &settings::required("AIT_IDENTITY_ENCRYPTION_KEY")?,
        key,
    )
    .map_err(|_| internal("Cannot decrypt recipient"))
}
pub(crate) async fn proxy_post(path: &str, payload: Json) -> ApiResult<Json> {
    trailbase_guest_common::post_json_with_optional_bearer(
        &trailbase_guest_common::join_url(&settings::required("MTLS_PROXY_URL")?, path),
        payload,
        Some(&settings::required("MTLS_PROXY_TOKEN")?),
    )
    .await
    .map_err(|_| internal(format!("Toss proxy request failed at {path}")))
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Claim {
    campaign_id: Option<String>,
    claim_id: Option<String>,
}

pub(crate) async fn claim_promotion(req: &mut Request) -> ApiResult<Json> {
    let input: Claim = body(req).await?;
    if input.campaign_id.as_ref().is_some_and(|id| id.len() > 128) {
        return Err(bad_request("INVALID_CAMPAIGN", "프로모션을 확인해 주세요."));
    }
    let mut tx = db::tx()?;
    let user = auth::user(req, &mut tx)?;
    let now = db::now_ms_tx(&mut tx)?;
    if let Some(id) = input.claim_id {
        if id.len() > 128 {
            return Err(bad_request("INVALID_CLAIM", "지급 요청을 확인해 주세요."));
        }
        db::tx_commit(&mut tx)?;
        // Claim IDs remain stable even when an operator removes the campaign.
        return reconcile_claim(&user.id, &id).await;
    }
    let campaign = active_campaign(&mut tx, now)?;
    let requested = input
        .campaign_id
        .or_else(|| campaign.as_ref().map(|c| c.id.clone()));
    let existing = db::tx_query(
        &mut tx,
        "SELECT id FROM promotion_reward_ledger WHERE user_id=?1 AND source_type='ait_lotto_attendance' AND (?2 IS NULL OR campaign_id=?2) ORDER BY created_at DESC LIMIT 1",
        &[
            Value::Blob(user.id.clone()),
            requested.clone().map(Value::Text).unwrap_or(Value::Null),
        ],
    )?;
    if let Some(row) = existing.first() {
        let id = db::text(&row[0], "id")?;
        db::tx_commit(&mut tx)?;
        return reconcile_claim(&user.id, &id).await;
    }
    let campaign = campaign
        .ok_or_else(|| conflict("PROMOTION_UNAVAILABLE", "진행 중인 출석 프로모션이 없어요."))?;
    if requested.as_deref() != Some(&campaign.id) {
        return Err(conflict(
            "CAMPAIGN_CHANGED",
            "프로모션 정보가 바뀌었어요. 다시 확인해 주세요.",
        ));
    }
    let (checked, count) = streak(&mut tx, &user.id, kst_day(now))?;
    if !checked || count < 5 {
        return Err(forbidden(
            "NOT_ELIGIBLE",
            "5일 연속 출석 후 받을 수 있어요.",
        ));
    }
    let identity = db::tx_query(
        &mut tx,
        "SELECT anonymous_key_sealed FROM ait_lotto_profiles WHERE user_id=?1",
        &[Value::Blob(user.id.clone())],
    )?;
    let sealed = db::nullable_text(&identity[0][0])?
        .ok_or_else(|| conflict("RECIPIENT_UNAVAILABLE", "앱을 다시 열고 시도해 주세요."))?;
    let anon_key = unseal(&sealed)?;
    db::tx_commit(&mut tx)?;
    let verified = proxy_post(
        "/internal/apps-in-toss/anonymous-key/verify",
        json!({"anonKey":anon_key}),
    )
    .await?;
    if verified["valid"] != true || verified["mode"] != "forward" {
        return Err(forbidden(
            "INVALID_RECIPIENT",
            "토스 연결 정보를 확인해 주세요.",
        ));
    }
    let mut tx = db::tx()?;
    let user = auth::user(req, &mut tx)?;
    let now = db::now_ms_tx(&mut tx)?;
    // Revalidate capacity after the external verification; reservation is a DB invariant.
    let current = active_campaign(&mut tx, now)?
        .ok_or_else(|| conflict("PROMOTION_UNAVAILABLE", "프로모션 지급을 잠시 쉬고 있어요."))?;
    if current.id != campaign.id {
        return Err(conflict("CAMPAIGN_CHANGED", "프로모션 정보가 바뀌었어요."));
    }
    let identity = promotion_identity(&mut tx, &user.id, &current.id)?;
    let request_id = format!("ait-attendance-{identity}");
    let reserved = db::tx_execute(
        &mut tx,
        "INSERT OR IGNORE INTO ait_lotto_promotion_reservations(campaign_id,identity_hmac,reward_amount,created_at) VALUES (?1,?2,?3,?4)",
        &[
            Value::Text(current.id.clone()),
            Value::Text(identity),
            Value::Integer(current.amount),
            Value::Integer(now),
        ],
    )?;
    if reserved == 0 {
        let existing = db::tx_query(
            &mut tx,
            "SELECT id FROM promotion_reward_ledger WHERE user_id=?1 AND provider_request_id=?2",
            &[Value::Blob(user.id.clone()), Value::Text(request_id)],
        )?;
        db::tx_commit(&mut tx)?;
        return match existing.first() {
            Some(row) => reconcile_claim(&user.id, &db::text(&row[0], "claim")?).await,
            None => Err(conflict(
                "PROMOTION_ALREADY_CLAIMED",
                "이미 신청한 프로모션이에요. 지급 확인은 support@645.live로 문의해 주세요.",
            )),
        };
    }
    let ledger = rewards::insert_promotion_reward_ledger_tx(
        &mut tx,
        rewards::DEFAULT_PROMOTION_REWARD_LEDGER_TABLE,
        rewards::PromotionRewardLedgerInsert {
            id: None,
            user: &user.id,
            campaign_id: Some(&current.id),
            source_type: "ait_lotto_attendance",
            source_id: Some(&kst_day(now).to_string()),
            reward_amount: current.amount,
            provider: None,
            provider_request_id: &request_id,
            requested_at: now,
            now,
        },
    )?;
    db::tx_commit(&mut tx)?;
    if !ledger.inserted {
        return reconcile_claim(&user.id, &ledger.record.id).await;
    }
    // An ambiguous response never allocates another transaction. Known transaction keys
    // are reconciled by the status-only job; unknown outcomes are escalated for review.
    let response=proxy_post(proxy::PROMOTION_REWARD_GRANT_PATH,json!({"anonKey":anon_key,"providerRequestId":request_id,"promotionCode":current.code,"amount":current.amount,"requestedAt":now})).await?;
    store_outcome(&ledger.record.id, &request_id, &response, now)?;
    claim_status(&user.id, &ledger.record.id)
}
fn store_outcome(id: &str, request_id: &str, response: &Json, now: i64) -> ApiResult<()> {
    let mut outcome =
        rewards::promotion_reward_outcome_from_response(response, request_id, Some(now));
    outcome.raw_response_json = None;
    let mut tx = db::tx()?;
    let terminal = db::tx_query(
        &mut tx,
        "SELECT 1 FROM promotion_reward_ledger WHERE id=?1 AND status IN ('success','recorded')",
        &[Value::Text(id.into())],
    )?;
    if !terminal.is_empty() {
        // A slower concurrent status response cannot undo an acknowledged payment.
        db::tx_commit(&mut tx)?;
        return Ok(());
    }
    rewards::apply_promotion_reward_outcome_tx(
        &mut tx,
        rewards::DEFAULT_PROMOTION_REWARD_LEDGER_TABLE,
        id,
        &outcome,
        now,
    )?;
    db::tx_commit(&mut tx)?;
    Ok(())
}
fn claim_status(user: &[u8], id: &str) -> ApiResult<Json> {
    let mut tx = db::tx()?;
    let now = db::now_ms_tx(&mut tx)?;
    let rows = db::tx_query(
        &mut tx,
        "SELECT status,reward_amount,provider_transaction_key,created_at,campaign_id FROM promotion_reward_ledger WHERE id=?1 AND user_id=?2 AND source_type='ait_lotto_attendance'",
        &[Value::Text(id.into()), Value::Blob(user.to_vec())],
    )?;
    let r = rows
        .first()
        .ok_or_else(|| not_found("CLAIM_NOT_FOUND", "지급 요청을 확인하지 못했어요."))?;
    let status = db::text(&r[0], "status")?;
    let needs_review = status == "pending"
        && (db::nullable_text(&r[4])?.is_none()
            || db::nullable_text(&r[2])?.is_none()
                && now - db::integer(&r[3], "created")? > 600_000);
    let value = json!({"status":if needs_review {"needs_review"}else{&status},"amount":db::integer(&r[1],"amount")?});
    db::tx_commit(&mut tx)?;
    Ok(value)
}
pub(crate) async fn reconcile_claim(user: &[u8], id: &str) -> ApiResult<Json> {
    if settings::string_or("AIT_PROMOTIONS_ENABLED", "false") != "true" {
        return claim_status(user, id);
    }
    let mut tx = db::tx()?;
    let now = db::now_ms_tx(&mut tx)?;
    let rows = db::tx_query(
        &mut tx,
        "SELECT l.provider_transaction_key,l.provider_request_id,c.provider_promotion_code,l.reward_amount,p.anonymous_key_sealed FROM promotion_reward_ledger l JOIN promotion_campaigns c ON c.id=l.campaign_id JOIN ait_lotto_profiles p ON p.user_id=l.user_id WHERE l.id=?1 AND l.user_id=?2 AND l.source_type='ait_lotto_attendance' AND l.status IN ('pending','failed') AND p.disabled=0 AND l.provider_transaction_key IS NOT NULL",
        &[Value::Text(id.into()), Value::Blob(user.to_vec())],
    )?;
    db::tx_commit(&mut tx)?;
    if let Some(r) = rows.first() {
        let key = db::text(&r[0], "transaction")?;
        let request_id = db::text(&r[1], "request")?;
        let anon_key = unseal(&db::text(&r[4], "recipient")?)?;
        let response=proxy_post(proxy::PROMOTION_REWARD_STATUS_PATH,json!({"anonKey":anon_key,"providerTransactionKey":key,"providerRequestId":request_id,"promotionCode":db::text(&r[2],"code")?,"amount":db::integer(&r[3],"amount")?})).await?;
        store_outcome(id, &request_id, &response, now)?;
    }
    claim_status(user, id)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn kst_boundary() {
        assert_eq!(kst_day(53_999_999), 0);
        assert_eq!(kst_day(54_000_000), 1);
    }
}
