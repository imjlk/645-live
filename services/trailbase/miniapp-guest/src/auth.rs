use crate::{body, db, enabled, settings};
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use serde::Deserialize;
use serde_json::{Value as Json, json};
use trailbase_guest_common::{responses::*, session::hmac_hex, trailbase_auth};
use trailbase_wasm::{
    db::{Transaction, Value},
    http::Request,
};

pub(crate) struct User {
    pub id: Vec<u8>,
    pub name: String,
}
pub(crate) fn user(req: &Request, tx: &mut Transaction) -> ApiResult<User> {
    enabled()?;
    let token_user = req
        .user()
        .ok_or_else(|| unauthorized("AUTH_REQUIRED", "연결을 다시 확인해 주세요."))?;
    let id = URL_SAFE_NO_PAD
        .decode(token_user.id.trim_end_matches('='))
        .map_err(|_| unauthorized("AUTH_REQUIRED", "세션을 다시 시작해 주세요."))?;
    let rows = db::tx_query(
        tx,
        "SELECT display_name, disabled FROM ait_lotto_profiles WHERE user_id = ?1",
        &[Value::Blob(id.clone())],
    )?;
    let row = rows
        .first()
        .ok_or_else(|| unauthorized("AUTH_REQUIRED", "세션을 다시 시작해 주세요."))?;
    if db::integer(&row[1], "disabled")? != 0 {
        return Err(forbidden("ACCOUNT_DISABLED", "사용할 수 없는 계정이에요."));
    }
    Ok(User {
        id,
        name: db::text(&row[0], "display_name")?,
    })
}
fn user_json(user: &User) -> Json {
    json!({ "id": URL_SAFE_NO_PAD.encode(&user.id), "displayName": user.name })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Bootstrap {
    anonymous_hash: String,
}

pub(crate) async fn bootstrap(req: &mut Request) -> ApiResult<Json> {
    enabled()?;
    let input: Bootstrap = body(req).await?;
    let raw = input.anonymous_hash.trim();
    let dev_allowed = settings::string_or("AIT_ALLOW_DEV_IDENTITY", "false") == "true";
    if raw.len() < 12
        || raw.len() > 512
        || !(raw.starts_with("ait:") || dev_allowed && raw.starts_with("dev-anon"))
    {
        return Err(bad_request(
            "INVALID_IDENTITY",
            "토스 앱에서 다시 열어 주세요.",
        ));
    }
    let secret = settings::required("AIT_IDENTITY_HMAC_SECRET")?;
    let digest = hmac_hex(&secret, raw)?;
    let now;
    {
        let mut tx = db::tx()?;
        now = db::now_ms_tx(&mut tx)?;
        trailbase_auth::enforce_anonymous_bootstrap_attempt_limit_tx(
            &mut tx,
            &format!("ait-identity:{digest}"),
            now,
            30,
            600_000,
        )?;
        // A rotating claimed identity must not bypass the coarse creation limit.
        trailbase_auth::enforce_anonymous_bootstrap_attempt_limit_tx(
            &mut tx,
            "ait-global-bootstrap",
            now,
            3000,
            600_000,
        )?;
        if let Some(ip) = req.header("cf-connecting-ip").and_then(|v| v.to_str().ok()) {
            let bucket = hmac_hex(&secret, &format!("ip:{ip}"))?;
            trailbase_auth::enforce_anonymous_bootstrap_attempt_limit_tx(
                &mut tx,
                &format!("ait-ip:{bucket}"),
                now,
                300,
                600_000,
            )?;
        }
        db::tx_commit(&mut tx)?;
    }
    // A claimed prefix is not proof of an Apps in Toss identity. Only the explicit
    // disposable development identity path bypasses provider verification.
    if !dev_allowed || !raw.starts_with("dev-anon") {
        let verified = crate::engagement::proxy_post(
            "/internal/apps-in-toss/anonymous-key/verify",
            json!({"anonKey":raw.strip_prefix("ait:").unwrap_or(raw)}),
        )
        .await?;
        if verified["valid"] != true || verified["mode"] != "forward" {
            return Err(unauthorized(
                "IDENTITY_VERIFICATION_FAILED",
                "토스 앱의 연결 정보를 확인해 주세요.",
            ));
        }
    }
    let password_secret = settings::required("TRAILBASE_AUTH_PASSWORD_SECRET")?;
    let credentials = trailbase_auth::anonymous_auth_user_credentials(&digest, &password_secret)?;
    let current_user;
    {
        let mut tx = db::tx()?;
        let principal = trailbase_auth::ensure_verified_auth_user_tx(&mut tx, &credentials)?;
        let sealed = settings::string("AIT_IDENTITY_ENCRYPTION_KEY")
            .map(|key| {
                trailbase_toss_identity::seal_toss_user_key(
                    &key,
                    raw.strip_prefix("ait:").unwrap_or(raw),
                )
                .map_err(internal)
            })
            .transpose()?;
        let name = format!(
            "{}공 {}",
            ["노랑", "파랑", "빨강", "회색", "초록"][usize::from(principal.id[0]) % 5],
            &crate::lotto::random_id()[..4].to_uppercase()
        );
        let rows = db::tx_query(&mut tx,
            "INSERT INTO ait_lotto_profiles(user_id, anonymous_hash_hmac, anonymous_key_sealed, display_name, created_at, last_seen_at) VALUES (?1, ?2, ?3, ?4, ?5, ?5)
             ON CONFLICT(user_id) DO UPDATE SET anonymous_key_sealed = coalesce(excluded.anonymous_key_sealed, ait_lotto_profiles.anonymous_key_sealed)
             RETURNING display_name, disabled",
            &[Value::Blob(principal.id.clone()), Value::Text(digest.clone()), sealed.map(Value::Text).unwrap_or(Value::Null), Value::Text(name), Value::Integer(now)])?;
        if db::integer(&rows[0][1], "disabled")? != 0 {
            return Err(forbidden("ACCOUNT_DISABLED", "사용할 수 없는 계정이에요."));
        }
        current_user = User {
            id: principal.id,
            name: db::text(&rows[0][0], "display_name")?,
        };
        db::tx_commit(&mut tx)?;
    }
    let tokens = trailbase_auth::login_anonymous_auth_user_with_password_rotation(
        &settings::string_or("TRAILBASE_AUTH_BASE_URL", "http://127.0.0.1:4000"),
        &digest,
        &password_secret,
        settings::string("TRAILBASE_AUTH_PASSWORD_SECRET_PREVIOUS").as_deref(),
    )
    .await?;
    Ok(
        json!({"user":user_json(&current_user),"authTokens":{"authToken":tokens.auth_token,"refreshToken":tokens.refresh_token,"csrfToken":tokens.csrf_token}}),
    )
}
pub(crate) async fn session(req: &mut Request) -> ApiResult<Json> {
    let mut tx = db::tx()?;
    let user = user(req, &mut tx)?;
    db::tx_commit(&mut tx)?;
    Ok(json!({"user":user_json(&user)}))
}
pub(crate) fn update_presence(tx: &mut Transaction, now: i64) -> ApiResult<()> {
    db::tx_execute(
        tx,
        "UPDATE ait_lotto_presence SET active_users = (SELECT count(*) FROM ait_lotto_profiles WHERE disabled = 0 AND last_seen_at > ?1 - 90000), updated_at = ?1 WHERE id = 1",
        &[Value::Integer(now)],
    )?;
    Ok(())
}
pub(crate) async fn heartbeat(req: &mut Request) -> ApiResult<Json> {
    presence(req, true)
}
pub(crate) async fn disconnect(req: &mut Request) -> ApiResult<Json> {
    presence(req, false)
}
fn presence(req: &Request, active: bool) -> ApiResult<Json> {
    let mut tx = db::tx()?;
    let user = user(req, &mut tx)?;
    let now = db::now_ms_tx(&mut tx)?;
    db::tx_execute(
        &mut tx,
        "UPDATE ait_lotto_profiles SET last_seen_at = ?1 WHERE user_id = ?2",
        &[
            Value::Integer(if active { now } else { 0 }),
            Value::Blob(user.id),
        ],
    )?;
    update_presence(&mut tx, now)?;
    db::tx_commit(&mut tx)?;
    Ok(json!({"serverTime":now}))
}
pub(crate) async fn withdraw(req: &mut Request) -> ApiResult<Json> {
    let mut tx = db::tx()?;
    let user = user(req, &mut tx)?;
    db::tx_execute(
        &mut tx,
        "DELETE FROM lotto_public_generations WHERE id IN (SELECT generation_id FROM ait_lotto_generation_requests WHERE user_id = ?1)",
        &[Value::Blob(user.id.clone())],
    )?;
    // Personal ledgers cascade. Campaign budget totals and campaign-scoped anti-replay
    // HMACs are independent; withdrawal must not replenish a monetary campaign.
    db::tx_execute(
        &mut tx,
        "DELETE FROM _user WHERE id = ?1",
        &[Value::Blob(user.id)],
    )?;
    let now = db::now_ms_tx(&mut tx)?;
    update_presence(&mut tx, now)?;
    db::tx_commit(&mut tx)?;
    Ok(json!({"deleted":true}))
}
