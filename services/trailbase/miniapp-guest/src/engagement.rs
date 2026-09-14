use crate::{attendance, auth, body, db, lotto, settings};
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
    let mut state = attendance::status(&mut tx, &user.id, now)?;
    let test_enabled = crate::promotion_test::enabled_for(&user.id, now);
    let template = notification_template();
    let opted = if let Some(code) = &template {
        !db::tx_query(&mut tx,"SELECT 1 FROM notification_template_agreements WHERE user_id=?1 AND template_code=?2 AND status='OPTED_IN'",&[Value::Blob(user.id.clone()),Value::Text(code.clone())])?.is_empty()
    } else {
        false
    };
    let mut promotions = vec![];
    for kind in [Kind::Daily, Kind::Weekly] {
        let period = period_for(&mut tx, &user.id, kind, kst_day(now))?;
        let campaign = active_campaign(&mut tx, now, kind)?;
        let existing = if let Some(period) = period {
            existing_claim(&mut tx, &user.id, kind, period)?
        } else {
            None
        };
        let mut eligible = false;
        let mut already = false;
        if existing.is_none() {
            if let (Some(c), Some(period)) = (&campaign, period) {
                already = reserved_period(&mut tx, &user.id, kind, period)?;
                eligible = c.available && !already;
            }
        }
        let value = if let Some(r) = existing {
            claim_view(&r, kind.as_str(), period, now)?
        } else {
            json!({"kind":kind.as_str(),"periodDay":period,"campaignId":campaign.as_ref().map(|c|c.id.clone()),"claimId":null,"amount":campaign.as_ref().map(|c|c.amount).unwrap_or(if kind==Kind::Daily{1}else{50}),"eligible":eligible,"status":if already{Some("already_claimed")}else{None},"available":campaign.as_ref().is_some_and(|c|c.available)})
        };
        promotions.push(value);
    }
    // Keep older and legacy claims discoverable after midnight, budget exhaustion or deletion of a campaign.
    let rows = db::tx_query(
        &mut tx,
        "SELECT status,id,campaign_id,reward_amount,created_at,provider_transaction_key,source_type,source_id FROM promotion_reward_ledger WHERE user_id=?1 AND source_type IN ('ait_lotto_attendance','ait_lotto_attendance_daily','ait_lotto_attendance_weekly') ORDER BY created_at DESC LIMIT 20",
        &[Value::Blob(user.id)],
    )?;
    let history = rows
        .iter()
        .filter(|r| {
            !promotions.iter().any(|p| {
                p["claimId"].as_str()
                    == match &r[1] {
                        Value::Text(s) => Some(s.as_str()),
                        _ => None,
                    }
            })
        })
        .map(|r| {
            let source = db::text(&r[6], "source")?;
            claim_view(
                r,
                if source.ends_with("_daily") {
                    "daily"
                } else if source.ends_with("_weekly") {
                    "weekly"
                } else {
                    "legacy"
                },
                db::nullable_text(&r[7])?.and_then(|p| p.parse().ok()),
                now,
            )
        })
        .collect::<ApiResult<Vec<_>>>()?;
    state["notificationTemplateCode"] = json!(template);
    state["notificationsEnabled"] = json!(opted);
    state["promotions"] = json!(promotions);
    state["promotionHistory"] = json!(history);
    state["promotionTestEnabled"] = json!(test_enabled);
    db::tx_commit(&mut tx)?;
    Ok(state)
}
pub(crate) async fn check_in(req: &mut Request) -> ApiResult<Json> {
    let mut tx = db::tx()?;
    let user = auth::user(req, &mut tx)?;
    let now = db::now_ms_tx(&mut tx)?;
    let day = kst_day(now);
    if !attendance::checked(&mut tx, &user.id, day)?
        && !attendance::generated_today(&mut tx, &user.id, day)?
    {
        return Err(forbidden(
            "GENERATION_REQUIRED",
            "오늘 번호를 한 번 만든 뒤 출석해 주세요.",
        ));
    }
    let inserted = db::tx_execute(
        &mut tx,
        "INSERT OR IGNORE INTO ait_lotto_attendance(user_id,day,created_at) VALUES (?1,?2,?3)",
        &[
            Value::Blob(user.id.clone()),
            Value::Integer(day),
            Value::Integer(now),
        ],
    )?;
    let mut state = attendance::status(&mut tx, &user.id, now)?;
    state["replayed"] = json!(inserted == 0);
    db::tx_commit(&mut tx)?;
    Ok(state)
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

#[derive(Clone, Copy, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
enum Kind {
    Daily,
    Weekly,
}
impl Kind {
    fn as_str(self) -> &'static str {
        match self {
            Self::Daily => "daily",
            Self::Weekly => "weekly",
        }
    }
    fn source(self) -> &'static str {
        match self {
            Self::Daily => "ait_lotto_attendance_daily",
            Self::Weekly => "ait_lotto_attendance_weekly",
        }
    }
    fn start(self, end: i64) -> i64 {
        if self == Self::Daily { end } else { end - 6 }
    }
}
struct Campaign {
    id: String,
    code: String,
    amount: i64,
    available: bool,
}
fn identity(tx: &mut Transaction, user: &[u8], scope: &str) -> ApiResult<String> {
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
        &format!("{scope}:{}", db::text(&row[0], "identity")?),
    )
}
fn active_campaign(tx: &mut Transaction, now: i64, kind: Kind) -> ApiResult<Option<Campaign>> {
    if settings::string_or("AIT_PROMOTIONS_ENABLED", "false") != "true"
        || settings::string("MTLS_PROXY_URL").is_none()
    {
        return Ok(None);
    }
    let rows = db::tx_query(
        tx,
        "SELECT id,provider_promotion_code,reward_amount,(budget_limit_amount >= reward_amount + coalesce((SELECT reserved_amount FROM ait_lotto_promotion_usage WHERE campaign_id=c.id),0) AND (max_grant_count IS NULL OR max_grant_count > coalesce((SELECT grant_count FROM ait_lotto_promotion_usage WHERE campaign_id=c.id),0))) FROM promotion_campaigns c WHERE feature_key=?2 AND status='ACTIVE' AND starts_at<=?1 AND ends_at>?1 ORDER BY starts_at DESC,id DESC LIMIT 1",
        &[Value::Integer(now), Value::Text(kind.source().into())],
    )?;
    rows.first()
        .map(|r| {
            Ok(Campaign {
                id: db::text(&r[0], "id")?,
                code: db::text(&r[1], "code")?,
                amount: db::integer(&r[2], "amount")?,
                available: db::integer(&r[3], "available")? == 1,
            })
        })
        .transpose()
}
fn period_for(tx: &mut Transaction, user: &[u8], kind: Kind, today: i64) -> ApiResult<Option<i64>> {
    match kind {
        Kind::Daily => Ok(attendance::checked(tx, user, today)?.then_some(today)),
        Kind::Weekly => attendance::weekly_period(tx, user, today),
    }
}
fn existing_claim(
    tx: &mut Transaction,
    user: &[u8],
    kind: Kind,
    period: i64,
) -> ApiResult<Option<Vec<Value>>> {
    Ok(db::tx_query(tx,"SELECT status,id,campaign_id,reward_amount,created_at,provider_transaction_key FROM promotion_reward_ledger WHERE user_id=?1 AND source_type=?2 AND source_id=?3 ORDER BY created_at DESC LIMIT 1",&[Value::Blob(user.to_vec()),Value::Text(kind.source().into()),Value::Text(period.to_string())])?.into_iter().next())
}
fn claim_view(r: &[Value], kind: &str, period: Option<i64>, now: i64) -> ApiResult<Json> {
    let status = db::text(&r[0], "status")?;
    let needs_review = status == "pending"
        && (db::nullable_text(&r[2])?.is_none()
            || db::nullable_text(&r[5])?.is_none()
                && now - db::integer(&r[4], "created")? > 600_000);
    Ok(
        json!({"kind":kind,"periodDay":period,"campaignId":db::nullable_text(&r[2])?,"claimId":db::text(&r[1],"claim")?,"amount":db::integer(&r[3],"amount")?,"eligible":false,"available":false,"status":if needs_review{"needs_review"}else{&status}}),
    )
}
fn reserved_period(tx: &mut Transaction, user: &[u8], kind: Kind, end: i64) -> ApiResult<bool> {
    let subject = identity(tx, user, "attendance-reward")?;
    Ok(!db::tx_query(tx,"SELECT 1 FROM ait_lotto_promotion_reservations WHERE subject_hmac=?1 AND reward_kind=?2 AND period_start<=?3 AND period_end>=?4 LIMIT 1",&[Value::Text(subject),Value::Text(kind.as_str().into()),Value::Integer(end),Value::Integer(kind.start(end))])?.is_empty())
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
    kind: Option<Kind>,
    period_day: Option<i64>,
}
pub(crate) async fn claim_promotion(req: &mut Request) -> ApiResult<Json> {
    let input: Claim = body(req).await?;
    if input.campaign_id.as_ref().is_some_and(|v| v.len() > 128)
        || input.claim_id.as_ref().is_some_and(|v| v.len() > 128)
    {
        return Err(bad_request("INVALID_CLAIM", "지급 요청을 확인해 주세요."));
    }
    let mut tx = db::tx()?;
    let user = auth::user(req, &mut tx)?;
    let now = db::now_ms_tx(&mut tx)?;
    if let Some(id) = input.claim_id {
        db::tx_commit(&mut tx)?;
        return reconcile_claim(&user.id, &id).await;
    }
    let kind = input
        .kind
        .ok_or_else(|| bad_request("INVALID_REWARD_KIND", "받을 출석 혜택을 선택해 주세요."))?;
    attendance::sync_cycles(&mut tx, &user.id, now)?;
    let period = input
        .period_day
        .or(period_for(&mut tx, &user.id, kind, kst_day(now))?)
        .ok_or_else(|| forbidden("NOT_ELIGIBLE", "출석 조건을 먼저 채워 주세요."))?;
    if let Some(r) = existing_claim(&mut tx, &user.id, kind, period)? {
        let id = db::text(&r[1], "claim")?;
        db::tx_commit(&mut tx)?;
        return reconcile_claim(&user.id, &id).await;
    }
    if period_for(&mut tx, &user.id, kind, kst_day(now))? != Some(period) {
        return Err(forbidden("NOT_ELIGIBLE", "출석 현황을 다시 확인해 주세요."));
    }
    let campaign = active_campaign(&mut tx, now, kind)?
        .filter(|c| c.available)
        .ok_or_else(|| conflict("PROMOTION_UNAVAILABLE", "진행 중인 출석 프로모션이 없어요."))?;
    if input.campaign_id.as_deref() != Some(&campaign.id) {
        return Err(conflict(
            "CAMPAIGN_CHANGED",
            "프로모션 정보가 바뀌었어요. 다시 확인해 주세요.",
        ));
    }
    if reserved_period(&mut tx, &user.id, kind, period)? {
        return Err(conflict(
            "PROMOTION_ALREADY_CLAIMED",
            "이미 신청한 출석 혜택이에요.",
        ));
    }
    let rows = db::tx_query(
        &mut tx,
        "SELECT anonymous_key_sealed FROM ait_lotto_profiles WHERE user_id=?1",
        &[Value::Blob(user.id.clone())],
    )?;
    let sealed = db::nullable_text(&rows[0][0])?
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
    let current_user = auth::user(req, &mut tx)?;
    if current_user.id != user.id {
        return Err(unauthorized(
            "AUTH_REQUIRED",
            "앱 연결을 다시 확인해 주세요.",
        ));
    }
    let now = db::now_ms_tx(&mut tx)?;
    // The provider verification crosses an await: recheck identity, date, eligibility and capacity.
    if let Some(r) = existing_claim(&mut tx, &user.id, kind, period)? {
        let id = db::text(&r[1], "claim")?;
        db::tx_commit(&mut tx)?;
        return reconcile_claim(&user.id, &id).await;
    }
    if period_for(&mut tx, &user.id, kind, kst_day(now))? != Some(period) {
        return Err(conflict(
            "ATTENDANCE_CHANGED",
            "출석 현황이 바뀌었어요. 다시 확인해 주세요.",
        ));
    }
    let current = active_campaign(&mut tx, now, kind)?
        .filter(|c| c.available)
        .ok_or_else(|| conflict("PROMOTION_UNAVAILABLE", "프로모션 지급을 잠시 쉬고 있어요."))?;
    if current.id != campaign.id
        || current.amount != campaign.amount
        || current.code != campaign.code
    {
        return Err(conflict("CAMPAIGN_CHANGED", "프로모션 정보가 바뀌었어요."));
    }
    if reserved_period(&mut tx, &user.id, kind, period)? {
        return Err(conflict(
            "PROMOTION_ALREADY_CLAIMED",
            "이미 신청한 출석 혜택이에요.",
        ));
    }
    let subject = identity(&mut tx, &user.id, "attendance-reward")?;
    let token = identity(
        &mut tx,
        &user.id,
        &format!("promotion:{}:{}:{period}", current.id, kind.as_str()),
    )?;
    let request_id = format!("ait-attendance-{token}");
    db::tx_execute(
        &mut tx,
        "INSERT INTO ait_lotto_promotion_reservations(campaign_id,identity_hmac,reward_amount,created_at,subject_hmac,reward_kind,period_start,period_end) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
        &[
            Value::Text(current.id.clone()),
            Value::Text(token),
            Value::Integer(current.amount),
            Value::Integer(now),
            Value::Text(subject),
            Value::Text(kind.as_str().into()),
            Value::Integer(kind.start(period)),
            Value::Integer(period),
        ],
    )?;
    let ledger = rewards::insert_promotion_reward_ledger_tx(
        &mut tx,
        rewards::DEFAULT_PROMOTION_REWARD_LEDGER_TABLE,
        rewards::PromotionRewardLedgerInsert {
            id: None,
            user: &user.id,
            campaign_id: Some(&current.id),
            source_type: kind.source(),
            source_id: Some(&period.to_string()),
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
    // Unknown grant outcomes never allocate another payment. Only status is retried.
    let response=proxy_post(proxy::PROMOTION_REWARD_GRANT_PATH,json!({"anonKey":anon_key,"providerRequestId":request_id,"promotionCode":current.code,"amount":current.amount,"requestedAt":now})).await?;
    store_outcome(&ledger.record.id, &request_id, &response, now)?;
    claim_status(&user.id, &ledger.record.id)
}
pub(crate) fn store_outcome(
    id: &str,
    request_id: &str,
    response: &Json,
    now: i64,
) -> ApiResult<()> {
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
        "SELECT status,reward_amount,provider_transaction_key,created_at,campaign_id FROM promotion_reward_ledger WHERE id=?1 AND user_id=?2 AND source_type IN ('ait_lotto_attendance','ait_lotto_attendance_daily','ait_lotto_attendance_weekly')",
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
        "SELECT l.provider_transaction_key,l.provider_request_id,c.provider_promotion_code,l.reward_amount,p.anonymous_key_sealed FROM promotion_reward_ledger l JOIN promotion_campaigns c ON c.id=l.campaign_id JOIN ait_lotto_profiles p ON p.user_id=l.user_id WHERE l.id=?1 AND l.user_id=?2 AND l.source_type IN ('ait_lotto_attendance','ait_lotto_attendance_daily','ait_lotto_attendance_weekly') AND l.status IN ('pending','failed') AND p.disabled=0 AND l.provider_transaction_key IS NOT NULL",
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
