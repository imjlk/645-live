use crate::{db, engagement, lotto, settings};
use trailbase_guest_common::responses::*;
use trailbase_wasm::db::{Transaction, Value};

pub(crate) const PLACEMENT: &str = "generation_continue";

fn interval(tx: &mut Transaction) -> ApiResult<i64> {
    let rows = db::tx_query(
        tx,
        "SELECT min_generations,max_generations FROM ait_lotto_generation_ad_policy WHERE id=1",
        &[],
    )?;
    let row = rows
        .first()
        .ok_or_else(|| internal("generation ad policy missing"))?;
    let min = db::integer(&row[0], "min")?;
    let max = db::integer(&row[1], "max")?;
    Ok(min + lotto::random_index((max - min + 1) as usize) as i64)
}

fn configured(tx: &mut Transaction) -> ApiResult<Option<(i64, i64)>> {
    let rows = db::tx_query(
        tx,
        "SELECT enabled,coalesce(trim(rewarded_group_id),'') <> '' OR coalesce(trim(interstitial_group_id),'') <> '',cooldown_ms,daily_cap FROM ait_lotto_ad_placements WHERE placement=?1",
        &[Value::Text(PLACEMENT.into())],
    )?;
    let Some(row) = rows.first() else {
        return Ok(None);
    };
    let test = settings::string_or("AIT_TEST_ADS", "false") == "true";
    if !test && (db::integer(&row[0], "enabled")? != 1 || db::integer(&row[1], "groups")? != 1) {
        return Ok(None);
    }
    Ok(Some((
        db::integer(&row[2], "cooldown")?,
        db::integer(&row[3], "cap")?,
    )))
}

pub(crate) fn due_cycle(tx: &mut Transaction, user: &[u8]) -> ApiResult<Option<i64>> {
    let rows = db::tx_query(
        tx,
        "SELECT cycle FROM ait_lotto_generation_ad_progress WHERE user_id=?1 AND remaining=0",
        &[Value::Blob(user.to_vec())],
    )?;
    rows.first()
        .map(|r| db::integer(&r[0], "cycle"))
        .transpose()
}

pub(crate) fn required(tx: &mut Transaction, user: &[u8], now: i64) -> ApiResult<bool> {
    if due_cycle(tx, user)?.is_none() {
        return Ok(false);
    }
    let Some((cooldown, cap)) = configured(tx)? else {
        return Ok(false);
    };
    let generations = db::tx_query(
        tx,
        "SELECT count(*) FROM ait_lotto_generation_requests WHERE user_id=?1 AND created_at>?2",
        &[Value::Blob(user.to_vec()), Value::Integer(now - 86_400_000)],
    )?;
    // Never ask someone to watch an ad when the next generation is rate-limited.
    if db::integer(&generations[0][0], "count")? >= lotto::DAILY_GENERATION_LIMIT {
        return Ok(false);
    }
    let usage = db::tx_query(
        tx,
        "SELECT count(*),coalesce(max(created_at),0) FROM ait_lotto_ad_sessions WHERE user_id=?1 AND created_at>=?2",
        &[
            Value::Blob(user.to_vec()),
            Value::Integer(engagement::kst_day(now) * 86_400_000 - 32_400_000),
        ],
    )?;
    // Ad availability and the shared pressure limits must never lock basic generation.
    Ok(db::integer(&usage[0][0], "count")? < cap
        && now - db::integer(&usage[0][1], "last")? >= cooldown)
}

pub(crate) fn generated(tx: &mut Transaction, user: &[u8], now: i64) -> ApiResult<bool> {
    if configured(tx)?.is_some() {
        let rows = db::tx_query(
            tx,
            "SELECT 1 FROM ait_lotto_generation_ad_progress WHERE user_id=?1",
            &[Value::Blob(user.to_vec())],
        )?;
        if rows.is_empty() {
            let remaining = interval(tx)?;
            db::tx_execute(
                tx,
                "INSERT INTO ait_lotto_generation_ad_progress(user_id,remaining,updated_at) VALUES (?1,?2,?3)",
                &[
                    Value::Blob(user.to_vec()),
                    Value::Integer(remaining),
                    Value::Integer(now),
                ],
            )?;
        }
        db::tx_execute(
            tx,
            "UPDATE ait_lotto_generation_ad_progress SET remaining=max(0,remaining-1),updated_at=?2 WHERE user_id=?1",
            &[Value::Blob(user.to_vec()), Value::Integer(now)],
        )?;
    }
    required(tx, user, now)
}

pub(crate) fn continued(
    tx: &mut Transaction,
    user: &[u8],
    cycle: Option<i64>,
    now: i64,
) -> ApiResult<()> {
    let Some(cycle) = cycle else {
        return Err(conflict("AD_EXPIRED", "번호 생성 광고를 다시 열어 주세요."));
    };
    // Late callbacks from an earlier cycle cannot reset a newer random interval.
    let remaining = interval(tx)?;
    db::tx_execute(
        tx,
        "UPDATE ait_lotto_generation_ad_progress SET remaining=?3,cycle=cycle+1,updated_at=?4 WHERE user_id=?1 AND cycle=?2 AND remaining=0",
        &[
            Value::Blob(user.to_vec()),
            Value::Integer(cycle),
            Value::Integer(remaining),
            Value::Integer(now),
        ],
    )?;
    Ok(())
}

pub(crate) fn prepare_local(tx: &mut Transaction, user: &[u8], now: i64) -> ApiResult<()> {
    db::tx_execute(
        tx,
        "INSERT INTO ait_lotto_generation_ad_progress(user_id,remaining,updated_at) VALUES (?1,0,?2) ON CONFLICT(user_id) DO UPDATE SET remaining=0,updated_at=excluded.updated_at",
        &[Value::Blob(user.to_vec()), Value::Integer(now)],
    )?;
    Ok(())
}
