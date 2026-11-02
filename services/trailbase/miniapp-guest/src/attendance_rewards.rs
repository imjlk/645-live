use crate::{attendance, db, engagement, settings};
use serde_json::{Value as Json, json};
use trailbase_guest_common::{
    ad_skip_tickets::{self as tickets, AdSkipGrant},
    responses::*,
    reward_cohorts::{
        self as cohorts, KST_OFFSET_MS, PointEligibility, PointEligibilityInput, RewardCohort,
        RewardCohortPolicy, RewardSubjectCohort, local_day, local_day_start,
    },
};
use trailbase_wasm::db::{Transaction, Value};

// Attendance rewards: every user earns ad skip tickets for attendance; Toss points
// are limited by cohort (legacy grace or a per-subject welcome window). Every
// operational instant is unset by default, which keeps both features inactive.
pub(crate) const DAILY_TICKETS: i64 = 1;
pub(crate) const STREAK_BONUS_TICKETS: i64 = 3;
const DAILY_CAUSE: &str = "daily_attendance";
const STREAK_CAUSE: &str = "streak_bonus";
const DEFAULT_POLICY_VERSION: &str = "attendance-rewards-v1";
const DEFAULT_WELCOME_POINT_DAYS: i64 = 7;
// Never list attendance_restore: a restore always needs a completed rewarded ad.
pub(crate) const AD_SKIP_PLACEMENTS: [&str; 3] = ["generation_continue", "custom", "report"];

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct RewardSettings {
    pub version: String,
    pub notice_starts_at: Option<i64>,
    pub cohort: Option<RewardCohortPolicy>,
    pub tickets_start_at: Option<i64>,
    pub redemption_enabled: bool,
}

fn instant(value: Option<String>) -> Option<i64> {
    value
        .and_then(|v| v.trim().parse::<i64>().ok())
        .filter(|v| *v > 0)
}

/// Instants are epoch milliseconds. A partial or invalid cohort configuration stays
/// inactive instead of guessing a boundary.
pub(crate) fn parse(get: impl Fn(&str) -> Option<String>) -> RewardSettings {
    // An invalid version must never make check-ins fail in the grant validation.
    let version = get("AIT_REWARD_POLICY_VERSION")
        .map(|v| v.trim().to_string())
        .filter(|v| {
            (1..=64).contains(&v.len())
                && v.bytes()
                    .all(|b| b.is_ascii_alphanumeric() || b"._-".contains(&b))
        })
        .unwrap_or_else(|| DEFAULT_POLICY_VERSION.into());
    let cutover = instant(get("AIT_REWARD_NEW_USER_CUTOVER_AT"));
    let legacy_end = instant(get("AIT_REWARD_LEGACY_POINTS_ENDS_AT"));
    let welcome_days = get("AIT_REWARD_WELCOME_POINT_DAYS")
        .and_then(|v| v.trim().parse::<i64>().ok())
        .unwrap_or(DEFAULT_WELCOME_POINT_DAYS);
    let cohort = match (cutover, legacy_end) {
        (Some(cutover), Some(end)) => Some(RewardCohortPolicy::kst(
            version.clone(),
            cutover,
            end,
            welcome_days,
        ))
        .filter(|p| p.validate().is_ok()),
        _ => None,
    };
    RewardSettings {
        version,
        notice_starts_at: instant(get("AIT_REWARD_NOTICE_STARTS_AT")),
        cohort,
        tickets_start_at: instant(get("AIT_AD_SKIP_REWARDS_STARTS_AT")),
        redemption_enabled: get("AIT_AD_SKIP_REDEMPTION_ENABLED").as_deref() != Some("false"),
    }
}

pub(crate) fn current() -> RewardSettings {
    parse(settings::string)
}

impl RewardSettings {
    pub(crate) fn tickets_active(&self, now: i64) -> bool {
        self.tickets_start_at.is_some_and(|start| now >= start)
    }
    /// An empty list pauses redemption while keeping balances and grants.
    pub(crate) fn allowed_placements(&self) -> &'static [&'static str] {
        if self.redemption_enabled {
            &AD_SKIP_PLACEMENTS
        } else {
            &[]
        }
    }
}

/// A scoped HMAC of the verified anonymous identity: stable across reinstalls and
/// withdrawal, never the raw key. Only its kit digest is stored.
fn subject_key(tx: &mut Transaction, user: &[u8]) -> ApiResult<String> {
    engagement::identity(tx, user, "reward-subject")
}

/// The first registration wins. The original profile creation is the earliest
/// first use this app can verify; a re-created profile keeps the earlier record.
pub(crate) fn subject(
    tx: &mut Transaction,
    user: &[u8],
    policy: &RewardCohortPolicy,
    now: i64,
) -> ApiResult<RewardSubjectCohort> {
    let key = subject_key(tx, user)?;
    let rows = db::tx_query(
        tx,
        "SELECT created_at FROM ait_lotto_profiles WHERE user_id=?1",
        &[Value::Blob(user.to_vec())],
    )?;
    let created = rows
        .first()
        .map(|r| db::integer(&r[0], "created"))
        .transpose()?
        .ok_or_else(|| unauthorized("AUTH_REQUIRED", "연결을 다시 확인해 주세요."))?;
    cohorts::register_reward_subject_tx(tx, &key, created.clamp(0, now), policy, now)
}

pub(crate) fn kst_day_start(day: i64) -> i64 {
    local_day_start(day, KST_OFFSET_MS)
}

/// The first claim of a daily reward stays open for that KST day; a completed
/// streak keeps the existing seven-day claim period including its last day.
pub(crate) fn claim_deadline(reward_kind: &str, period_end: i64) -> i64 {
    kst_day_start(period_end + if reward_kind == WEEKLY_KIND { 7 } else { 1 })
}
pub(crate) const DAILY_KIND: &str = "attendance_daily";
pub(crate) const WEEKLY_KIND: &str = "attendance_weekly";

/// A daily ticket needs an own check-in on a KST day that has started its
/// ticket period; a restored day never earns one.
pub(crate) fn daily_ticket_due(tickets_start_at: i64, now: i64, day: i64, checked: bool) -> bool {
    checked && now >= tickets_start_at && day >= local_day(tickets_start_at, KST_OFFSET_MS)
}

/// A streak bonus belongs to cycles completed (committed) at or after the start,
/// including a cycle that began before it. Older cycles are never backfilled.
pub(crate) fn streak_bonus_due(tickets_start_at: i64, completed_at: i64) -> bool {
    completed_at >= tickets_start_at
}

/// Apply attendance rewards for what the server has already accepted. Runs inside
/// the check-in, restore and status transactions after cycles are synchronized;
/// every grant and snapshot is idempotent, so retries and reads never add more.
pub(crate) fn sync_attendance(
    tx: &mut Transaction,
    user: &[u8],
    config: &RewardSettings,
    now: i64,
) -> ApiResult<()> {
    let today = engagement::kst_day(now);
    if let Some(start) = config
        .tickets_start_at
        .filter(|_| config.tickets_active(now))
    {
        let key = subject_key(tx, user)?;
        let grant = |cause, period_start, period_end, quantity| AdSkipGrant {
            subject_key: &key,
            cause,
            period_start,
            period_end,
            quantity,
            policy_version: &config.version,
        };
        let checked = attendance::checked(tx, user, today)?;
        if daily_ticket_due(start, now, today, checked) {
            tickets::grant_ad_skip_tickets_tx(
                tx,
                user,
                &grant(DAILY_CAUSE, today, today, DAILY_TICKETS),
                now,
            )?;
        }
        for (cycle_start, cycle_end, completed_at) in attendance::recent_cycles(tx, user, today)? {
            if streak_bonus_due(start, completed_at) {
                tickets::grant_ad_skip_tickets_tx(
                    tx,
                    user,
                    &grant(STREAK_CAUSE, cycle_start, cycle_end, STREAK_BONUS_TICKETS),
                    now,
                )?;
            }
        }
    }
    if let Some(policy) = &config.cohort {
        record_points(tx, user, policy, now, today)?;
    }
    Ok(())
}

fn record_points(
    tx: &mut Transaction,
    user: &[u8],
    policy: &RewardCohortPolicy,
    now: i64,
    today: i64,
) -> ApiResult<()> {
    let subject = subject(tx, user, policy, now)?;
    let mut met = vec![];
    if let Some(at) = attendance::checked_at(tx, user, today)? {
        met.push((engagement::Kind::Daily, today, today, at));
    }
    if let Some((start, end, at)) = attendance::recent_cycles(tx, user, today)?
        .into_iter()
        .filter(|(_, end, _)| *end >= today - 6)
        .max_by_key(|(_, end, _)| *end)
    {
        met.push((engagement::Kind::Weekly, start, end, at));
    }
    for (kind, start, end, earned_at) in met {
        // Snapshot the campaign the server would choose now; without one there is no
        // amount to promise, and the status shows the campaign as unavailable.
        let Some(campaign) = engagement::active_campaign(tx, now, kind)? else {
            continue;
        };
        let reward_kind = kind.reward_kind();
        cohorts::record_point_eligibility_tx(
            tx,
            user,
            &subject,
            policy,
            &PointEligibilityInput {
                reward_kind,
                period_start: start,
                period_end: end,
                campaign_id: &campaign.id,
                earned_at: earned_at.min(now),
                claim_deadline_at: claim_deadline(reward_kind, end),
                // A welcome subject gets one streak reward inside its window.
                max_per_subject: (subject.cohort == RewardCohort::Welcome
                    && reward_kind == WEEKLY_KIND)
                    .then_some(1),
            },
            now,
        )?;
    }
    Ok(())
}

pub(crate) fn eligibility_for(
    tx: &mut Transaction,
    user: &[u8],
    reward_kind: &str,
    period_start: i64,
    period_end: i64,
) -> ApiResult<Option<PointEligibility>> {
    let rows = db::tx_query(
        tx,
        "SELECT id FROM promotion_reward_eligibilities WHERE user_id=?1 AND reward_kind=?2 AND period_start=?3 AND period_end=?4",
        &[
            Value::Blob(user.to_vec()),
            Value::Text(reward_kind.into()),
            Value::Integer(period_start),
            Value::Integer(period_end),
        ],
    )?;
    match rows.first() {
        Some(r) => cohorts::find_point_eligibility_tx(tx, user, &db::text(&r[0], "id")?),
        None => Ok(None),
    }
}

/// Status fields shared by every screen that shows the balance or point window.
pub(crate) fn status(
    tx: &mut Transaction,
    user: &[u8],
    config: &RewardSettings,
    now: i64,
) -> ApiResult<Json> {
    let today = engagement::kst_day(now);
    let granted = |rows: Vec<Vec<Value>>| -> ApiResult<Option<i64>> {
        rows.first()
            .map(|r| db::nullable_integer(&r[0]))
            .transpose()
            .map(Option::flatten)
    };
    let today_granted = granted(db::tx_query(
        tx,
        "SELECT quantity FROM ad_skip_ticket_grants WHERE user_id=?1 AND cause=?2 AND period_start=?3",
        &[
            Value::Blob(user.to_vec()),
            Value::Text(DAILY_CAUSE.into()),
            Value::Integer(today),
        ],
    )?)?;
    let streak_end = granted(db::tx_query(
        tx,
        "SELECT max(period_end) FROM ad_skip_ticket_grants WHERE user_id=?1 AND cause=?2",
        &[Value::Blob(user.to_vec()), Value::Text(STREAK_CAUSE.into())],
    )?)?;
    let ad_skips = json!({
        "balance": tickets::ad_skip_balance_tx(tx, user)?,
        "active": config.tickets_active(now),
        "startsAt": config.tickets_start_at,
        "dailyTickets": DAILY_TICKETS,
        "streakBonusTickets": STREAK_BONUS_TICKETS,
        "todayGranted": today_granted.unwrap_or(0),
        "lastStreakBonusEndDay": streak_end,
        "placements": config.allowed_placements(),
    });
    let policy = match &config.cohort {
        Some(policy) => {
            let window = subject(tx, user, policy, now)?.point_window(policy, now);
            json!({
                "version": config.version,
                "noticeStartsAt": config.notice_starts_at,
                "noticeActive": config.notice_starts_at.is_some_and(|at| now >= at),
                "legacyPointsEndsAt": policy.legacy_points_earn_ends_at,
                "welcomePointDays": policy.welcome_point_days,
                "pointWindow": window,
            })
        }
        None => Json::Null,
    };
    Ok(json!({"adSkips": ad_skips, "rewardPolicy": policy}))
}

#[cfg(test)]
mod tests;
