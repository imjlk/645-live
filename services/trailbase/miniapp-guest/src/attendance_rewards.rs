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
const DEFAULT_WELCOME_STREAK_LIMIT: i64 = 1;
// Never list attendance_restore: a restore always needs a completed rewarded ad.
pub(crate) const AD_SKIP_PLACEMENTS: [&str; 3] = ["generation_continue", "custom", "report"];

/// When a subject's point window starts.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum WindowStart {
    /// The original profile creation, registered on the first read (v1 behavior).
    FirstSeen,
    /// The first own check-in at or after the program start. Each policy version
    /// keeps its own registry, so every subject is new to a new program once.
    FirstCheckIn,
}
impl WindowStart {
    fn as_str(self) -> &'static str {
        match self {
            Self::FirstSeen => "first_seen",
            Self::FirstCheckIn => "first_check_in",
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct RewardSettings {
    pub version: String,
    pub notice_starts_at: Option<i64>,
    pub cohort: Option<RewardCohortPolicy>,
    pub window_start: WindowStart,
    /// Streak point rewards a welcome subject can earn inside its window.
    pub welcome_streak_limit: i64,
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
    let window_start = match get("AIT_REWARD_WINDOW_START").as_deref().map(str::trim) {
        Some("first_check_in") => WindowStart::FirstCheckIn,
        _ => WindowStart::FirstSeen,
    };
    let welcome_streak_limit = get("AIT_REWARD_WELCOME_STREAK_LIMIT")
        .and_then(|v| v.trim().parse::<i64>().ok())
        .filter(|v| (1..=52).contains(v))
        .unwrap_or(DEFAULT_WELCOME_STREAK_LIMIT);
    RewardSettings {
        version,
        notice_starts_at: instant(get("AIT_REWARD_NOTICE_STARTS_AT")),
        cohort,
        window_start,
        welcome_streak_limit,
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

/// Point registrations of a check-in program are scoped by its policy version: a
/// new program registers every subject again, while tickets keep `subject_key`.
fn point_subject_key(
    tx: &mut Transaction,
    user: &[u8],
    config: &RewardSettings,
) -> ApiResult<String> {
    match config.window_start {
        WindowStart::FirstSeen => subject_key(tx, user),
        WindowStart::FirstCheckIn => {
            engagement::identity(tx, user, &format!("reward-subject/{}", config.version))
        }
    }
}

/// The first registration wins. FirstSeen registers on any read with the original
/// profile creation, the earliest first use this app can verify. FirstCheckIn
/// registers only with an own check-in today at or after the program start, so a
/// subject without one has no window yet (None). A re-created profile or a later
/// check-in never moves an existing registration.
pub(crate) fn subject(
    tx: &mut Transaction,
    user: &[u8],
    config: &RewardSettings,
    policy: &RewardCohortPolicy,
    now: i64,
) -> ApiResult<Option<RewardSubjectCohort>> {
    let key = point_subject_key(tx, user, config)?;
    if config.window_start == WindowStart::FirstCheckIn {
        if let Some(found) = cohorts::find_reward_subject_tx(tx, &key)? {
            return Ok(Some(found));
        }
        if now < policy.new_user_cutover_at {
            return Ok(None);
        }
        let Some(at) = attendance::checked_at(tx, user, engagement::kst_day(now))? else {
            return Ok(None);
        };
        let first = at.max(policy.new_user_cutover_at).min(now);
        return cohorts::register_reward_subject_tx(tx, &key, first, policy, now).map(Some);
    }
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
    cohorts::register_reward_subject_tx(tx, &key, created.clamp(0, now), policy, now).map(Some)
}

/// FirstCheckIn counts only conditions met on or after the window's first day, so a
/// streak completed before the program (or before the first check-in) never pays.
pub(crate) fn earned_inside_window(
    config: &RewardSettings,
    subject: &RewardSubjectCohort,
    earned_at: i64,
) -> bool {
    config.window_start == WindowStart::FirstSeen
        || earned_at >= kst_day_start(engagement::kst_day(subject.first_seen_at))
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
        record_points(tx, user, config, policy, now, today)?;
    }
    Ok(())
}

fn record_points(
    tx: &mut Transaction,
    user: &[u8],
    config: &RewardSettings,
    policy: &RewardCohortPolicy,
    now: i64,
    today: i64,
) -> ApiResult<()> {
    let Some(subject) = subject(tx, user, config, policy, now)? else {
        return Ok(());
    };
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
        if !earned_inside_window(config, &subject, earned_at) {
            continue;
        }
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
                // A welcome subject's streak rewards are capped inside its window.
                max_per_subject: (subject.cohort == RewardCohort::Welcome
                    && reward_kind == WEEKLY_KIND)
                    .then_some(config.welcome_streak_limit),
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
            // Without a registration yet, the first own check-in starts the window.
            let window = match subject(tx, user, config, policy, now)? {
                Some(subject) => json!(subject.point_window(policy, now)),
                None => json!({"status": "NOT_STARTED", "cohort": "WELCOME", "endsAt": null}),
            };
            json!({
                "version": config.version,
                "noticeStartsAt": config.notice_starts_at,
                "noticeActive": config.notice_starts_at.is_some_and(|at| now >= at),
                "legacyPointsEndsAt": policy.legacy_points_earn_ends_at,
                "welcomePointDays": policy.welcome_point_days,
                "windowStart": config.window_start.as_str(),
                "welcomeStreakLimit": config.welcome_streak_limit,
                "pointWindow": window,
            })
        }
        None => Json::Null,
    };
    Ok(json!({"adSkips": ad_skips, "rewardPolicy": policy}))
}

#[cfg(test)]
mod tests;
