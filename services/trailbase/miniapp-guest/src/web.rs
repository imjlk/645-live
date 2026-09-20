use crate::{auth, body, db, lotto, settings};
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use serde::Deserialize;
use serde_json::{Value as Json, json};
use trailbase_guest_common::{responses::*, session::hmac_hex, trailbase_auth};
use trailbase_wasm::{
    db::{Transaction, Value},
    http::{Request, StatusCode},
};

fn enabled() -> ApiResult<()> {
    if settings::string_or("WEB_LOTTO_ENABLED", "true") != "true" {
        return Err(ApiError::new(
            StatusCode::SERVICE_UNAVAILABLE,
            "WEB_LOTTO_UNAVAILABLE",
            "실시간 번호 공유를 잠시 쉬고 있어요.",
        ));
    }
    Ok(())
}

fn user(req: &Request, tx: &mut Transaction) -> ApiResult<auth::User> {
    enabled()?;
    let principal = req
        .user()
        .ok_or_else(|| unauthorized("AUTH_REQUIRED", "번호 생성 연결을 다시 확인해 주세요."))?;
    let id = URL_SAFE_NO_PAD
        .decode(principal.id.trim_end_matches('='))
        .map_err(|_| unauthorized("AUTH_REQUIRED", "번호 생성 연결을 다시 확인해 주세요."))?;
    let rows = db::tx_query(
        tx,
        "SELECT display_name, disabled FROM web_lotto_profiles WHERE user_id=?1",
        &[Value::Blob(id.clone())],
    )?;
    let row = rows
        .first()
        .ok_or_else(|| unauthorized("AUTH_REQUIRED", "웹 번호 생성기를 다시 연결해 주세요."))?;
    if db::integer(&row[1], "disabled")? != 0 {
        return Err(forbidden("ACCOUNT_DISABLED", "사용할 수 없는 연결이에요."));
    }
    Ok(auth::User {
        id,
        name: db::text(&row[0], "name")?,
    })
}

fn limit(tx: &mut Transaction, key: &str, now: i64, count: i64, window: i64) -> ApiResult<()> {
    trailbase_auth::enforce_anonymous_bootstrap_attempt_limit_tx(tx, key, now, count, window)
}

fn ip_limit(
    req: &Request,
    tx: &mut Transaction,
    action: &str,
    now: i64,
    count: i64,
    window: i64,
) -> ApiResult<()> {
    if let Some(ip) = req.header("cf-connecting-ip").and_then(|v| v.to_str().ok()) {
        let digest = hmac_hex(
            &settings::required("AIT_IDENTITY_HMAC_SECRET")?,
            &format!("web-lotto-ip:{ip}"),
        )?;
        limit(
            tx,
            &format!("web-lotto-{action}-ip:{digest}"),
            now,
            count,
            window,
        )?;
    }
    Ok(())
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Bootstrap {
    installation_key: String,
}

fn installation_digest(raw: &str, secret: &str) -> ApiResult<String> {
    if raw.len() != 43 {
        return Err(bad_request(
            "INVALID_IDENTITY",
            "브라우저의 연결 정보를 확인해 주세요.",
        ));
    }
    let bytes = URL_SAFE_NO_PAD
        .decode(raw)
        .map_err(|_| bad_request("INVALID_IDENTITY", "브라우저의 연결 정보를 확인해 주세요."))?;
    if bytes.len() != 32 || URL_SAFE_NO_PAD.encode(&bytes) != raw {
        return Err(bad_request(
            "INVALID_IDENTITY",
            "브라우저의 연결 정보를 확인해 주세요.",
        ));
    }
    // A web credential cannot collide with a verified Toss anonymous key.
    hmac_hex(secret, &format!("web-lotto:v1:{raw}"))
}

pub(crate) async fn bootstrap(req: &mut Request) -> ApiResult<Json> {
    enabled()?;
    let input: Bootstrap = body(req).await?;
    let digest = installation_digest(
        &input.installation_key,
        &settings::required("AIT_IDENTITY_HMAC_SECRET")?,
    )?;
    {
        let mut tx = db::tx()?;
        let now = db::now_ms_tx(&mut tx)?;
        limit(
            &mut tx,
            &format!("web-lotto-identity:{digest}"),
            now,
            30,
            600_000,
        )?;
        limit(&mut tx, "web-lotto-bootstrap-global", now, 1000, 600_000)?;
        ip_limit(req, &mut tx, "bootstrap", now, 60, 600_000)?;
        db::tx_commit(&mut tx)?;
    }
    let password_secret = settings::required("TRAILBASE_AUTH_PASSWORD_SECRET")?;
    let credentials = trailbase_auth::anonymous_auth_user_credentials(&digest, &password_secret)?;
    let current_user;
    {
        let mut tx = db::tx()?;
        let now = db::now_ms_tx(&mut tx)?;
        let principal = trailbase_auth::ensure_verified_auth_user_tx(&mut tx, &credentials)?;
        let name = lotto::display_name(usize::from(principal.id[0]) % 5, &lotto::random_id());
        let rows = db::tx_query(
            &mut tx,
            "INSERT INTO web_lotto_profiles(user_id,installation_hmac,display_name,created_at,last_seen_at) VALUES (?1,?2,?3,?4,?4) ON CONFLICT(user_id) DO UPDATE SET last_seen_at=excluded.last_seen_at RETURNING display_name,disabled",
            &[
                Value::Blob(principal.id.clone()),
                Value::Text(digest.clone()),
                Value::Text(name),
                Value::Integer(now),
            ],
        )?;
        if db::integer(&rows[0][1], "disabled")? != 0 {
            return Err(forbidden("ACCOUNT_DISABLED", "사용할 수 없는 연결이에요."));
        }
        current_user = json!({"id":URL_SAFE_NO_PAD.encode(&principal.id),"displayName":db::text(&rows[0][0],"name")?});
        auth::update_presence(&mut tx, now)?;
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
        json!({"user":current_user,"authTokens":{"authToken":tokens.auth_token,"refreshToken":tokens.refresh_token,"csrfToken":tokens.csrf_token}}),
    )
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Generate {
    request_id: String,
    round: i64,
    games: Vec<Vec<i64>>,
}

fn validate(input: &mut Generate) -> ApiResult<()> {
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
    if input.games.is_empty() || input.games.len() > 100 {
        return Err(bad_request(
            "INVALID_GAMES",
            "한 번에 1~100게임을 만들 수 있어요.",
        ));
    }
    for numbers in &mut input.games {
        numbers.sort_unstable();
        if numbers.len() != 6
            || numbers.iter().any(|n| !(1..=45).contains(n))
            || numbers.windows(2).any(|p| p[0] == p[1])
        {
            return Err(bad_request(
                "INVALID_NUMBERS",
                "각 게임에 서로 다른 1~45번 번호 6개가 필요해요.",
            ));
        }
    }
    Ok(())
}

pub(crate) async fn generate(req: &mut Request) -> ApiResult<Json> {
    let mut input: Generate = body(req).await?;
    validate(&mut input)?;
    let payload = serde_json::to_string(&json!({"round":input.round,"games":input.games}))
        .map_err(internal)?;
    let mut tx = db::tx()?;
    let user = user(req, &mut tx)?;
    let now = db::now_ms_tx(&mut tx)?;
    let existing = db::tx_query(
        &mut tx,
        "SELECT payload_json,generation_ids_json FROM web_lotto_generation_batches WHERE user_id=?1 AND request_id=?2",
        &[
            Value::Blob(user.id.clone()),
            Value::Text(input.request_id.clone()),
        ],
    )?;
    if let Some(row) = existing.first() {
        if db::text(&row[0], "payload")? != payload {
            return Err(conflict(
                "REQUEST_CONFLICT",
                "다른 조합에서 사용한 요청이에요.",
            ));
        }
        let rows = db::tx_query(
            &mut tx,
            &format!(
                "SELECT {} FROM lotto_public_generations WHERE id IN (SELECT value FROM json_each(?1)) ORDER BY id",
                lotto::SELECT_GENERATION
            ),
            &[Value::Text(db::text(&row[1], "ids")?)],
        )?;
        let generations = rows
            .iter()
            .map(|r| lotto::generation_json(r))
            .collect::<ApiResult<Vec<_>>>()?;
        if generations.len() != input.games.len() {
            return Err(conflict(
                "GENERATION_DELETED",
                "공유가 삭제된 조합이에요. 새 번호를 만들어 주세요.",
            ));
        }
        db::tx_commit(&mut tx)?;
        return Ok(json!({"generations":generations,"replayed":true}));
    }
    if input.round != lotto::target_round(now) {
        return Err(conflict(
            "ROUND_CHANGED",
            "대상 회차가 바뀌었어요. 새 회차로 다시 만들어 주세요.",
        ));
    }
    let recent = db::tx_query(
        &mut tx,
        "SELECT coalesce(sum(json_array_length(generation_ids_json)),0),coalesce(max(created_at),0) FROM web_lotto_generation_batches WHERE user_id=?1 AND created_at>?2-86400000",
        &[Value::Blob(user.id.clone()), Value::Integer(now)],
    )?;
    if db::integer(&recent[0][0], "count")? + input.games.len() as i64 > 1000
        || now - db::integer(&recent[0][1], "last")? < 800
    {
        return Err(too_many_requests(
            "GENERATION_LIMIT",
            "많은 번호를 만들었어요. 잠시 후 다시 시도해 주세요.",
        ));
    }
    limit(&mut tx, "web-lotto-generation-global", now, 600, 60_000)?;
    ip_limit(req, &mut tx, "generation", now, 60, 60_000)?;
    let mut generations = Vec::with_capacity(input.games.len());
    for numbers in &input.games {
        generations.push(lotto::insert(
            &mut tx,
            input.round,
            &user.name,
            lotto::GenerationOrigin::Web,
            numbers,
            now,
        )?);
    }
    let ids: Vec<_> = generations
        .iter()
        .map(|g| g["id"].as_i64().unwrap())
        .collect();
    db::tx_execute(
        &mut tx,
        "INSERT INTO web_lotto_generation_batches(user_id,request_id,payload_json,generation_ids_json,created_at) VALUES (?1,?2,?3,?4,?5)",
        &[
            Value::Blob(user.id.clone()),
            Value::Text(input.request_id),
            Value::Text(payload),
            Value::Text(serde_json::to_string(&ids).map_err(internal)?),
            Value::Integer(now),
        ],
    )?;
    db::tx_execute(
        &mut tx,
        "UPDATE web_lotto_profiles SET last_seen_at=?1 WHERE user_id=?2",
        &[Value::Integer(now), Value::Blob(user.id)],
    )?;
    auth::update_presence(&mut tx, now)?;
    db::tx_commit(&mut tx)?;
    Ok(json!({"generations":generations,"replayed":false}))
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Delete {
    id: i64,
}
pub(crate) async fn delete_generation(req: &mut Request) -> ApiResult<Json> {
    let input: Delete = body(req).await?;
    let mut tx = db::tx()?;
    let user = user(req, &mut tx)?;
    let count = db::tx_execute(
        &mut tx,
        "DELETE FROM lotto_public_generations WHERE id=?1 AND id IN (SELECT j.value FROM web_lotto_generation_batches b,json_each(b.generation_ids_json) j WHERE b.user_id=?2)",
        &[Value::Integer(input.id), Value::Blob(user.id)],
    )?;
    db::tx_commit(&mut tx)?;
    Ok(json!({"deleted":count>0}))
}

pub(crate) async fn heartbeat(req: &mut Request) -> ApiResult<Json> {
    let mut tx = db::tx()?;
    let user = user(req, &mut tx)?;
    let now = db::now_ms_tx(&mut tx)?;
    db::tx_execute(
        &mut tx,
        "UPDATE web_lotto_profiles SET last_seen_at=?1 WHERE user_id=?2",
        &[Value::Integer(now), Value::Blob(user.id)],
    )?;
    auth::update_presence(&mut tx, now)?;
    db::tx_commit(&mut tx)?;
    Ok(json!({"serverTime":now}))
}

pub(crate) async fn withdraw(req: &mut Request) -> ApiResult<Json> {
    let mut tx = db::tx()?;
    let user = user(req, &mut tx)?;
    db::tx_execute(
        &mut tx,
        "DELETE FROM lotto_public_generations WHERE id IN (SELECT j.value FROM web_lotto_generation_batches b,json_each(b.generation_ids_json) j WHERE b.user_id=?1)",
        &[Value::Blob(user.id.clone())],
    )?;
    db::tx_execute(
        &mut tx,
        "DELETE FROM _user WHERE id=?1",
        &[Value::Blob(user.id)],
    )?;
    let now = db::now_ms_tx(&mut tx)?;
    auth::update_presence(&mut tx, now)?;
    db::tx_commit(&mut tx)?;
    Ok(json!({"deleted":true}))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn batches_validate_every_game_and_normalize_retry_payloads() {
        let mut input = Generate {
            request_id: "0123456789abcdef".into(),
            round: 1242,
            games: vec![vec![45, 1, 20, 10, 30, 40]; 100],
        };
        validate(&mut input).unwrap();
        assert_eq!(input.games[0], vec![1, 10, 20, 30, 40, 45]);
        input.games[99][0] = 10;
        assert!(validate(&mut input).is_err());
        input.games.clear();
        assert!(validate(&mut input).is_err());
    }
    #[test]
    fn web_identity_has_fixed_entropy_and_a_distinct_namespace() {
        let raw = URL_SAFE_NO_PAD.encode([7_u8; 32]);
        assert_ne!(
            installation_digest(&raw, "test-secret").unwrap(),
            hmac_hex("test-secret", &format!("ait:{raw}")).unwrap()
        );
        assert!(installation_digest("ait:pretend-toss-user", "test-secret").is_err());
        assert!(installation_digest(&URL_SAFE_NO_PAD.encode([0_u8; 16]), "test-secret").is_err());
        assert!(installation_digest(&format!("{raw}="), "test-secret").is_err());
    }
}
