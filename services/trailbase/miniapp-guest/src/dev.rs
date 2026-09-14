use crate::{ads, auth, body, db, engagement, settings};
use serde::Deserialize;
use serde_json::{Value as Json, json};
use trailbase_guest_common::responses::*;
use trailbase_wasm::{db::Value, http::Request};

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
enum Feature {
    Custom,
    Report,
}
#[derive(Deserialize)]
#[serde(tag = "action", rename_all = "snake_case", deny_unknown_fields)]
enum Action {
    Unlock { feature: Feature },
    Reset,
}

/// Local feature testing never submits synthetic ad events or grants cash rewards.
pub(crate) async fn entitlements(req: &mut Request) -> ApiResult<Json> {
    let unavailable = || not_found("NOT_FOUND", "사용할 수 없는 경로예요.");
    if [
        "AIT_LOCAL_PREVIEW",
        "AIT_ALLOW_DEV_IDENTITY",
        "AIT_TEST_ADS",
    ]
    .iter()
    .any(|key| settings::string_or(key, "false") != "true")
        || settings::string_or("AIT_PROMOTIONS_ENABLED", "false") == "true"
    {
        return Err(unavailable());
    }
    let action: Action = body(req).await?;
    let mut tx = db::tx()?;
    let user = auth::user(req, &mut tx)?;
    let rows = db::tx_query(
        &mut tx,
        "SELECT anonymous_key_sealed FROM ait_lotto_profiles WHERE user_id=?1",
        &[Value::Blob(user.id.clone())],
    )?;
    let sealed = rows
        .first()
        .and_then(|row| row.first())
        .map(db::nullable_text)
        .transpose()?
        .flatten()
        .ok_or_else(unavailable)?;
    if !engagement::unseal(&sealed)?.starts_with("dev-anon") {
        return Err(unavailable());
    }
    let now = db::now_ms_tx(&mut tx)?;
    match action {
        Action::Unlock { feature } => {
            let feature = match feature {
                Feature::Custom => "custom",
                Feature::Report => "report",
            };
            ads::grant_pass(&mut tx, &user.id, feature, now + 86_400_000)?;
        }
        Action::Reset => {
            db::tx_execute(
                &mut tx,
                "DELETE FROM ait_lotto_entitlements WHERE user_id=?1",
                &[Value::Blob(user.id)],
            )?;
        }
    }
    db::tx_commit(&mut tx)?;
    Ok(json!({"ok":true,"localPreview":true}))
}
