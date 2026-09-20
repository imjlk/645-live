use crate::{auth, db, engagement, lotto, settings};
use serde_json::{Value as Json, json};
use trailbase_guest_common::{apps_in_toss_messages as messages, responses::*};
use trailbase_wasm::{db::Value, http::Json as JobJson};

fn job_result(result: ApiResult<Json>) -> JobJson<Json> {
    match result {
        Ok(value) => JobJson(value),
        Err(err) => {
            eprintln!("miniapp job {}: {}", err.code, err.message);
            JobJson(json!({"ok":false,"code":err.code}))
        }
    }
}
pub async fn activity_job() -> JobJson<Json> {
    job_result(activity())
}
fn activity() -> ApiResult<Json> {
    let mut tx = db::tx()?;
    let now = db::now_ms_tx(&mut tx)?;
    let active = db::tx_query(
        &mut tx,
        "SELECT (SELECT count(*) FROM ait_lotto_profiles WHERE disabled = 0 AND last_seen_at > ?1-90000) + (SELECT count(*) FROM web_lotto_profiles WHERE disabled = 0 AND last_seen_at > ?1-90000)",
        &[Value::Integer(now)],
    )?;
    let active = db::integer(&active[0][0], "active")?;
    let recent = db::tx_query(
        &mut tx,
        "SELECT coalesce(max(created_at),0),count(*) FILTER (WHERE created_at > ?1-90000) FROM lotto_public_generations g JOIN ait_lotto_generation_origins o ON o.generation_id=g.id WHERE o.actor_kind = 'bot' AND g.round = ?2",
        &[
            Value::Integer(now),
            Value::Integer(lotto::target_round(now)),
        ],
    )?;
    let mut created = false;
    if crate::enabled().is_ok()
        && settings::string_or("AIT_BOTS_ENABLED", "true") == "true"
        && active > 0
        && active <= settings::i64_or("AIT_BOT_MAX_ACTIVE_USERS", 10).clamp(1, 100)
        && now - db::integer(&recent[0][0], "last")?
            > settings::i64_or("AIT_BOT_INTERVAL_MS", 30_000).clamp(15_000, 300_000)
        && db::integer(&recent[0][1], "recent")? < 2
    {
        let numbers = lotto::choose(&lotto::Options::default(), lotto::random_index);
        // Bots share the user display-name format so feed activity reads the same.
        let name = lotto::display_name(lotto::random_index(5), &lotto::random_id());
        lotto::insert(
            &mut tx,
            lotto::target_round(now),
            &name,
            lotto::GenerationOrigin::Bot,
            &numbers,
            now,
        )?;
        created = true;
    }
    auth::update_presence(&mut tx, now)?;
    db::tx_commit(&mut tx)?;
    Ok(json!({"ok":true,"generated":created}))
}

pub async fn notification_job() -> JobJson<Json> {
    job_result(notifications().await)
}
async fn notifications() -> ApiResult<Json> {
    if crate::enabled().is_err() {
        return Ok(json!({"skipped":true}));
    }
    let Some(template) = engagement::notification_template() else {
        return Ok(json!({"skipped":true}));
    };
    let mut tx = db::tx()?;
    let now = db::now_ms_tx(&mut tx)?;
    let approved=!db::tx_query(&mut tx,"SELECT 1 FROM message_templates WHERE template_code = ?1 AND purpose = 'FUNCTIONAL' AND status = 'APPROVED' AND requires_agreement = 1 AND agreement_template_code = ?1",&[Value::Text(template.clone())])?.is_empty();
    if !approved {
        db::tx_commit(&mut tx)?;
        return Ok(json!({"skipped":true,"reason":"template_not_approved"}));
    }
    let watches = db::tx_query(
        &mut tx,
        "SELECT w.user_id,w.round,p.anonymous_hash_hmac,p.anonymous_key_sealed FROM ait_lotto_result_watches w JOIN ait_lotto_profiles p ON p.user_id=w.user_id JOIN lotto_draw_results d ON d.round=w.round JOIN notification_template_agreements a ON a.user_id=w.user_id AND a.template_code=?1 AND a.status='OPTED_IN' WHERE p.disabled=0 AND p.anonymous_key_sealed IS NOT NULL AND w.created_at > ?2-1209600000 ORDER BY w.created_at LIMIT 100",
        &[Value::Text(template.clone()), Value::Integer(now)],
    )?;
    for row in &watches {
        let user = db::blob(&row[0], "user")?;
        let round = db::integer(&row[1], "round")?;
        let hmac = db::text(&row[2], "hmac")?;
        let sealed = db::text(&row[3], "sealed")?;
        let request_id = format!("ait-result-{round}-{hmac}");
        messages::enqueue_message_outbox_tx(
            &mut tx,
            messages::MessageOutboxEnqueueInput {
                id: None,
                user: &user,
                toss_user_key_hmac: &hmac,
                toss_user_key_sealed: Some(&sealed),
                campaign_id: None,
                purpose: messages::MessagePurpose::Functional,
                template_code: &template,
                payload: json!({"context":{"round":round.to_string()},"templateSetCode":template}),
                idempotency_key: &request_id,
                provider: None,
                provider_request_id: &request_id,
                not_before_at: now,
                now,
            },
        )?;
        db::tx_execute(
            &mut tx,
            "DELETE FROM ait_lotto_result_watches WHERE user_id = ?1 AND round = ?2",
            &[Value::Blob(user), Value::Integer(round)],
        )?;
    }
    // A process crash during provider delivery has an unknown outcome. Do not auto-send it twice.
    db::tx_execute(
        &mut tx,
        "UPDATE message_outbox SET status='FAILED',failure_reason='delivery_outcome_unknown',updated_at=?1 WHERE status='LOCKED' AND locked_at < ?1-600000",
        &[Value::Integer(now)],
    )?;
    let pending = messages::claim_ready_message_outbox_tx(&mut tx, 10, now)?;
    db::tx_commit(&mut tx)?;
    let mut sent = 0;
    for message in pending {
        let mut tx = db::tx()?;
        let allowed=!db::tx_query(&mut tx,"SELECT 1 FROM ait_lotto_profiles p JOIN notification_template_agreements a ON a.user_id=p.user_id JOIN message_templates t ON t.template_code=a.template_code WHERE p.user_id=?1 AND p.disabled=0 AND a.status='OPTED_IN' AND a.template_code=?2 AND t.status='APPROVED'",&[Value::Blob(message.user_id.clone()),Value::Text(template.clone())])?.is_empty() && message.template_code==template;
        if !allowed {
            messages::skip_message_outbox_tx(
                &mut tx,
                &message.id,
                "agreement_or_account_changed",
                now,
            )?;
            db::tx_commit(&mut tx)?;
            continue;
        }
        db::tx_commit(&mut tx)?;
        let result = deliver(&message).await;
        let mut tx = db::tx()?;
        match result {
            Ok(response) => {
                if response.is_sent() {
                    sent += 1;
                }
                messages::complete_message_outbox_tx(&mut tx, &message.id, &response, None, now)?;
            }
            Err(_) => messages::fail_message_outbox_tx(
                &mut tx,
                &message.id,
                "delivery_failed_or_unknown",
                now,
            )?,
        }
        db::tx_commit(&mut tx)?;
    }
    Ok(json!({"ok":true,"enqueued":watches.len(),"sent":sent}))
}
async fn deliver(
    message: &messages::MessageOutboxRecord,
) -> ApiResult<messages::MessageProviderResponse> {
    let sealed = message
        .toss_user_key_sealed
        .as_deref()
        .ok_or_else(|| internal("Recipient unavailable"))?;
    let key = engagement::unseal(sealed)?;
    let payload: Json = serde_json::from_str(&message.payload_json)
        .map_err(|_| internal("Invalid outbox payload"))?;
    // Kit's generic mTLS relay supports the official anonymous recipient header.
    let response=engagement::proxy_post("/internal/mtls/request",json!({"method":"POST","path":"/api-partner/v1/apps-in-toss/messenger/send-message","headers":{"x-anon-key":key},"body":payload})).await?;
    let status = response["status"].as_i64().unwrap_or(500);
    let payload = &response["body"];
    let success = status >= 200 && status < 300 && payload["resultType"] == "SUCCESS";
    let summary = &payload["success"];
    let delivered = summary["sentPushCount"].as_i64().unwrap_or(0)
        + summary["sentInboxCount"].as_i64().unwrap_or(0)
        > 0;
    Ok(messages::parse_message_proxy_response(
        &json!({"ok":success&&delivered,"providerStatus":if success&&delivered {"SENT"}else{"FAILED"},"resultType":payload["resultType"],"sentPushCount":summary["sentPushCount"],"sentInboxCount":summary["sentInboxCount"],"msgCount":summary["msgCount"]}),
        &message.provider_request_id,
        Some(message.created_at),
    ))
}

pub async fn retention_job() -> JobJson<Json> {
    job_result(retention())
}
fn retention() -> ApiResult<Json> {
    // Privacy retention and shared presence must keep running when participation is disabled.
    // Generation archives have their own bounded job; an archive failure must not
    // prevent retention of unrelated profiles, ads or notification records.
    let mut tx = db::tx()?;
    let now = db::now_ms_tx(&mut tx)?;
    for sql in [
        "DELETE FROM _user WHERE id IN (SELECT user_id FROM web_lotto_profiles WHERE last_seen_at < ?1-7776000000)",
        "DELETE FROM anonymous_bootstrap_attempts WHERE last_attempt_at < ?1-86400000 AND bucket_key LIKE 'web-lotto-%'",
        "DELETE FROM anonymous_bootstrap_attempts WHERE last_attempt_at < ?1-86400000 AND bucket_key LIKE 'ait-%'",
        "DELETE FROM ait_lotto_ad_sessions WHERE created_at < ?1-2592000000",
        "DELETE FROM ait_lotto_result_watches WHERE created_at < ?1-1209600000",
        "DELETE FROM ait_lotto_entitlements WHERE expires_at < ?1-86400000",
        "DELETE FROM message_outbox WHERE created_at < ?1-7776000000 AND status IN ('SENT','FAILED','SKIPPED','CANCELLED')",
        "DELETE FROM ait_lotto_promotion_reservations WHERE campaign_id IN (SELECT id FROM promotion_campaigns WHERE ends_at < ?1-7776000000)",
    ] {
        db::tx_execute(&mut tx, sql, &[Value::Integer(now)])?;
    }
    db::tx_commit(&mut tx)?;
    Ok(json!({"ok":true}))
}

pub async fn promotion_job() -> JobJson<Json> {
    job_result(reconcile_promotions().await)
}
async fn reconcile_promotions() -> ApiResult<Json> {
    if crate::enabled().is_err() {
        return Ok(json!({"skipped":true}));
    }
    if settings::string_or("AIT_PROMOTIONS_ENABLED", "false") != "true" {
        return Ok(json!({"skipped":true}));
    }
    let mut tx = db::tx()?;
    let rows = db::tx_query(
        &mut tx,
        "SELECT l.id,l.user_id FROM promotion_reward_ledger l JOIN promotion_campaigns c ON c.id=l.campaign_id JOIN ait_lotto_profiles p ON p.user_id=l.user_id WHERE l.source_type IN ('ait_lotto_attendance','ait_lotto_attendance_daily','ait_lotto_attendance_weekly') AND l.status='pending' AND l.provider_transaction_key IS NOT NULL AND p.disabled=0 ORDER BY l.updated_at LIMIT 5",
        &[],
    )?;
    db::tx_commit(&mut tx)?;
    let mut checked = 0;
    for r in rows {
        if engagement::reconcile_claim(&db::blob(&r[1], "user")?, &db::text(&r[0], "id")?)
            .await
            .is_ok()
        {
            checked += 1;
        }
    }
    Ok(json!({"ok":true,"checked":checked}))
}
