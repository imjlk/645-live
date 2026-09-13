use crate::{ads, auth, body, db, lotto, settings};
use serde::Deserialize;
use serde_json::{Value as Json, json};
use trailbase_guest_common::{
    apps_in_toss_messages as messages, apps_in_toss_proxy as proxy, promotion_rewards as rewards,
    responses::*,
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
            "SELECT status FROM promotion_reward_ledger WHERE user_id = ?1 AND campaign_id = ?2",
            &[Value::Blob(user.id), Value::Text(c.id)],
        )?;
        json!({"amount":c.amount,"eligible":count>=5 && checked,"status":existing.first().map(|r|db::text(&r[0],"status")).transpose()?})
    } else {
        Json::Null
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
fn active_campaign(tx: &mut Transaction, now: i64) -> ApiResult<Option<Campaign>> {
    if settings::string_or("AIT_PROMOTIONS_ENABLED", "false") != "true"
        || settings::string("MTLS_PROXY_URL").is_none()
    {
        return Ok(None);
    }
    let rows = db::tx_query(
        tx,
        "SELECT id, provider_promotion_code, reward_amount FROM promotion_campaigns c WHERE feature_key = 'ait_lotto_attendance' AND status = 'ACTIVE' AND starts_at <= ?1 AND ends_at > ?1 AND budget_limit_amount >= reward_amount + (SELECT coalesce(sum(reward_amount),0) FROM promotion_reward_ledger WHERE campaign_id = c.id AND status IN ('pending','success','recorded')) AND (max_grant_count IS NULL OR max_grant_count > (SELECT count(*) FROM promotion_reward_ledger WHERE campaign_id = c.id AND status IN ('pending','success','recorded'))) ORDER BY starts_at DESC LIMIT 1",
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
    .map_err(|_| internal("Toss proxy request failed"))
}
pub(crate) async fn claim_promotion(req: &mut Request) -> ApiResult<Json> {
    let mut tx = db::tx()?;
    let user = auth::user(req, &mut tx)?;
    let now = db::now_ms_tx(&mut tx)?;
    let (checked, count) = streak(&mut tx, &user.id, kst_day(now))?;
    if !checked || count < 5 {
        return Err(forbidden(
            "NOT_ELIGIBLE",
            "5일 연속 출석 후 받을 수 있어요.",
        ));
    }
    let existing = db::tx_query(
        &mut tx,
        "SELECT status, reward_amount FROM promotion_reward_ledger WHERE user_id = ?1 AND source_type = 'ait_lotto_attendance' ORDER BY created_at DESC LIMIT 1",
        &[Value::Blob(user.id.clone())],
    )?;
    if let Some(r) = existing.first() {
        let value =
            json!({"status":db::text(&r[0],"status")?,"amount":db::integer(&r[1],"amount")?});
        db::tx_commit(&mut tx)?;
        return Ok(value);
    }
    let campaign = active_campaign(&mut tx, now)?
        .ok_or_else(|| conflict("PROMOTION_UNAVAILABLE", "진행 중인 출석 프로모션이 없어요."))?;
    let identity = db::tx_query(
        &mut tx,
        "SELECT anonymous_key_sealed FROM ait_lotto_profiles WHERE user_id = ?1",
        &[Value::Blob(user.id.clone())],
    )?;
    let sealed = db::nullable_text(&identity[0][0])?
        .ok_or_else(|| conflict("RECIPIENT_UNAVAILABLE", "앱을 다시 열고 시도해 주세요."))?;
    let request_id = format!("ait-attendance-{}-{}", campaign.id, lotto::random_id());
    let ledger = rewards::insert_promotion_reward_ledger_tx(
        &mut tx,
        rewards::DEFAULT_PROMOTION_REWARD_LEDGER_TABLE,
        rewards::PromotionRewardLedgerInsert {
            id: None,
            user: &user.id,
            campaign_id: Some(&campaign.id),
            source_type: "ait_lotto_attendance",
            source_id: Some(&kst_day(now).to_string()),
            reward_amount: campaign.amount,
            provider: None,
            provider_request_id: &request_id,
            requested_at: now,
            now,
        },
    )?;
    db::tx_commit(&mut tx)?;
    let anon_key = unseal(&sealed)?;
    let verified = proxy_post(
        "/internal/apps-in-toss/anonymous-key/verify",
        json!({"anonKey":anon_key}),
    )
    .await?;
    if verified["valid"] != true {
        return Err(forbidden(
            "INVALID_RECIPIENT",
            "토스 연결 정보를 확인해 주세요.",
        ));
    }
    // Reserve before the provider call. Never allocate a second grant after an ambiguous timeout.
    let response=proxy_post(proxy::PROMOTION_REWARD_GRANT_PATH,json!({"anonKey":anon_key,"providerRequestId":request_id,"promotionCode":campaign.code,"amount":campaign.amount,"requestedAt":now})).await?;
    let mut outcome =
        rewards::promotion_reward_outcome_from_response(&response, &request_id, Some(now));
    outcome.raw_response_json = None;
    let mut tx = db::tx()?;
    let record = rewards::apply_promotion_reward_outcome_tx(
        &mut tx,
        rewards::DEFAULT_PROMOTION_REWARD_LEDGER_TABLE,
        &ledger.record.id,
        &outcome,
        now,
    )?;
    db::tx_commit(&mut tx)?;
    Ok(json!({"status":record.status,"amount":record.reward_amount}))
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
