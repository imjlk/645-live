use crate::{ads, attendance, auth, body, db, engagement, generation_ads, settings};
use serde::Deserialize;
use serde_json::{Value as Json, json};
use trailbase_guest_common::responses::*;
use trailbase_wasm::{
    db::{Transaction, Value},
    http::Request,
};

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
    GenerationAd,
    Reset,
}

fn require_local() -> ApiResult<()> {
    if [
        "AIT_LOCAL_PREVIEW",
        "AIT_ALLOW_DEV_IDENTITY",
        "AIT_TEST_ADS",
    ]
    .iter()
    .any(|key| settings::string_or(key, "false") != "true")
        || settings::string_or("AIT_PROMOTIONS_ENABLED", "false") == "true"
    {
        return Err(not_found("NOT_FOUND", "사용할 수 없는 경로예요."));
    }
    Ok(())
}

fn local_user(req: &Request, tx: &mut Transaction) -> ApiResult<auth::User> {
    let unavailable = || not_found("NOT_FOUND", "사용할 수 없는 경로예요.");
    let user = auth::user(req, tx)?;
    let rows = db::tx_query(
        tx,
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
    Ok(user)
}

/// Local feature testing never submits synthetic ad events or grants cash rewards.
pub(crate) async fn entitlements(req: &mut Request) -> ApiResult<Json> {
    require_local()?;
    let action: Action = body(req).await?;
    let mut tx = db::tx()?;
    let user = local_user(req, &mut tx)?;
    let now = db::now_ms_tx(&mut tx)?;
    match action {
        Action::GenerationAd => generation_ads::prepare(&mut tx, &user.id, now)?,
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

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
enum AttendanceScenario {
    Fresh,
    DaySeven,
    MissedYesterday,
    NewCycle,
}

#[derive(Deserialize)]
#[serde(tag = "action", rename_all = "snake_case", deny_unknown_fields)]
enum AttendanceAction {
    Prepare { scenario: AttendanceScenario },
    Restore,
}

/// Change only this local principal's attendance fixture. Generation records and
/// reward ledgers remain intact; today's generation requirement still applies.
pub(crate) async fn attendance_fixture(req: &mut Request) -> ApiResult<Json> {
    require_local()?;
    let action: AttendanceAction = body(req).await?;
    let mut tx = db::tx()?;
    let user = local_user(req, &mut tx)?;
    let now = db::now_ms_tx(&mut tx)?;
    let today = engagement::kst_day(now);
    match action {
        AttendanceAction::Prepare { scenario } => {
            for table in [
                "ait_lotto_attendance_restores",
                "ait_lotto_attendance_cycles",
                "ait_lotto_attendance",
            ] {
                db::tx_execute(
                    &mut tx,
                    &format!("DELETE FROM {table} WHERE user_id=?1"),
                    &[Value::Blob(user.id.clone())],
                )?;
            }
            let range = match scenario {
                AttendanceScenario::Fresh => None,
                AttendanceScenario::DaySeven => Some(-6..=-1),
                AttendanceScenario::MissedYesterday => Some(-6..=-2),
                AttendanceScenario::NewCycle => Some(-7..=-1),
            };
            if let Some(range) = range {
                for offset in range {
                    db::tx_execute(
                        &mut tx,
                        "INSERT INTO ait_lotto_attendance(user_id,day,created_at) VALUES (?1,?2,?3)",
                        &[
                            Value::Blob(user.id.clone()),
                            Value::Integer(today + offset),
                            Value::Integer(now + offset * 86_400_000),
                        ],
                    )?;
                }
            }
        }
        AttendanceAction::Restore => {
            attendance::require_restore(&mut tx, &user.id, now)?;
            // A null session explicitly distinguishes this local fixture from an ad completion.
            db::tx_execute(
                &mut tx,
                "INSERT INTO ait_lotto_attendance_restores(user_id,day,ad_session_id,created_at) VALUES (?1,?2,NULL,?3)",
                &[
                    Value::Blob(user.id.clone()),
                    Value::Integer(today - 1),
                    Value::Integer(now),
                ],
            )?;
        }
    }
    let mut state = attendance::status(&mut tx, &user.id, now)?;
    state["localPreview"] = json!(true);
    db::tx_commit(&mut tx)?;
    Ok(state)
}
