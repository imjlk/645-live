use super::*;
use std::collections::HashMap;

// Fixed fixture instants (UTC ms): 2026-12-01 00:00 KST and later boundaries.
const CUTOVER: i64 = 1_796_050_800_000;
const LEGACY_END: i64 = CUTOVER + 7 * 86_400_000;

fn config(values: &[(&str, &str)]) -> RewardSettings {
    let map: HashMap<String, String> = values
        .iter()
        .map(|(k, v)| (k.to_string(), v.to_string()))
        .collect();
    parse(|name| map.get(name).cloned())
}

#[test]
fn unset_operational_dates_keep_everything_inactive() {
    let settings = config(&[]);
    assert_eq!(settings.cohort, None);
    assert_eq!(settings.tickets_start_at, None);
    assert!(!settings.tickets_active(i64::MAX));
    assert_eq!(settings.version, "attendance-rewards-v1");
    assert_eq!(
        config(&[("AIT_REWARD_POLICY_VERSION", "reward v2")]).version,
        "attendance-rewards-v1"
    );
    // Redemption stays allowed so that already granted tickets remain usable.
    assert_eq!(settings.allowed_placements(), AD_SKIP_PLACEMENTS);
    assert!(!AD_SKIP_PLACEMENTS.contains(&"attendance_restore"));
}

#[test]
fn partial_or_invalid_cohort_configuration_stays_inactive() {
    let cutover = CUTOVER.to_string();
    assert_eq!(
        config(&[("AIT_REWARD_NEW_USER_CUTOVER_AT", &cutover)]).cohort,
        None
    );
    assert_eq!(
        config(&[
            ("AIT_REWARD_NEW_USER_CUTOVER_AT", "2026-12-01"),
            ("AIT_REWARD_LEGACY_POINTS_ENDS_AT", &LEGACY_END.to_string()),
        ])
        .cohort,
        None
    );
    assert_eq!(
        config(&[
            ("AIT_REWARD_NEW_USER_CUTOVER_AT", &cutover),
            ("AIT_REWARD_LEGACY_POINTS_ENDS_AT", &LEGACY_END.to_string()),
            ("AIT_REWARD_WELCOME_POINT_DAYS", "0"),
        ])
        .cohort,
        None
    );
}

#[test]
fn complete_configuration_uses_kst_days_and_seven_welcome_days() {
    let settings = config(&[
        ("AIT_REWARD_POLICY_VERSION", "reward-fixture-v1"),
        ("AIT_REWARD_NOTICE_STARTS_AT", &CUTOVER.to_string()),
        ("AIT_REWARD_NEW_USER_CUTOVER_AT", &CUTOVER.to_string()),
        ("AIT_REWARD_LEGACY_POINTS_ENDS_AT", &LEGACY_END.to_string()),
        ("AIT_AD_SKIP_REWARDS_STARTS_AT", &CUTOVER.to_string()),
        ("AIT_AD_SKIP_REDEMPTION_ENABLED", "false"),
    ]);
    let policy = settings.cohort.clone().unwrap();
    assert_eq!(policy.policy_version, "reward-fixture-v1");
    assert_eq!(policy.welcome_point_days, 7);
    // First seen at 23:59 KST on day 1 still ends at 00:00 KST on day 8.
    let first_seen = CUTOVER + 86_400_000 - 60_000;
    assert_eq!(
        policy.welcome_points_ends_at(first_seen),
        CUTOVER + 7 * 86_400_000
    );
    assert!(settings.tickets_active(CUTOVER));
    assert!(!settings.tickets_active(CUTOVER - 1));
    assert!(settings.allowed_placements().is_empty());
}

#[test]
fn daily_ticket_needs_own_check_in_on_a_started_kst_day() {
    // Start at 12:00 KST: a 09:00 check-in on the start day is reconciled once.
    let start = CUTOVER + 12 * 3_600_000;
    let start_day = engagement::kst_day(start);
    assert!(daily_ticket_due(start, start, start_day, true));
    assert!(!daily_ticket_due(start, start - 1, start_day, true));
    assert!(!daily_ticket_due(start, start, start_day - 1, true));
    assert!(!daily_ticket_due(start, start, start_day, false));
}

#[test]
fn streak_bonus_follows_completion_time_not_cycle_start() {
    let start = CUTOVER;
    // A cycle that began before the start but completes after it earns its bonus.
    assert!(streak_bonus_due(start, start + 1));
    assert!(streak_bonus_due(start, start));
    // A cycle completed before the start is never backfilled by a later read.
    assert!(!streak_bonus_due(start, start - 1));
}

#[test]
fn claim_deadlines_keep_existing_first_claim_periods() {
    let day = engagement::kst_day(CUTOVER);
    assert_eq!(claim_deadline(DAILY_KIND, day), CUTOVER + 86_400_000);
    // A streak completed on day 7 stays claimable through day 13 (exclusive day 14).
    assert_eq!(claim_deadline(WEEKLY_KIND, day), CUTOVER + 7 * 86_400_000);
    assert_eq!(kst_day_start(day), CUTOVER);
}

#[test]
fn migrations_keep_tickets_private_to_the_account_and_subjects_beyond_it() {
    let conn = crate::generation_archive::tests::fixture(false);
    for sql in [
        include_str!("../../../traildepot/migrations/U1794000000__ad_skip_tickets.sql"),
        include_str!("../../../traildepot/migrations/U1794000100__reward_subject_cohorts.sql"),
        include_str!(
            "../../../traildepot/migrations/U1794000200__promotion_reward_eligibilities.sql"
        ),
        include_str!("../../../traildepot/migrations/U1794000300__ad_session_skip_opportunity.sql"),
    ] {
        conn.execute_batch(sql).unwrap();
    }
    let subject = "a".repeat(64);
    conn.execute_batch(&format!(
        "INSERT INTO ad_skip_ticket_wallets VALUES (x'01',4,1);
        INSERT INTO ad_skip_ticket_grants(user_id,subject_hash,cause,period_start,period_end,quantity,policy_version,created_at)
          VALUES (x'01','{subject}','daily_attendance',20000,20000,1,'attendance-rewards-v1',1);
        INSERT INTO ad_skip_opportunities VALUES (x'01','custom','prompt-1','TICKET','{r}',1);
        INSERT INTO reward_subject_cohorts VALUES ('{subject}','LEGACY',1,NULL,'attendance-rewards-v1',1);
        INSERT INTO ait_lotto_ad_sessions(id,user_id,placement,format,group_id,created_at,expires_at,pass_duration_ms,ad_skip_opportunity_key)
          VALUES ('ad-1',x'01','custom','rewarded','group',1,2,0,'prompt-2');",
        r = "r".repeat(48),
    ))
    .unwrap();
    // The schema bounds the opaque prompt key.
    assert!(
        conn.execute(
            "UPDATE ait_lotto_ad_sessions SET ad_skip_opportunity_key=?1",
            [&"k".repeat(129)],
        )
        .is_err()
    );
    conn.execute_batch("DELETE FROM _user").unwrap();
    let count = |table: &str| -> i64 {
        conn.query_row(&format!("SELECT count(*) FROM {table}"), [], |r| r.get(0))
            .unwrap()
    };
    // Withdrawal forfeits the balance and prompt state but keeps once-only history.
    assert_eq!(count("ad_skip_ticket_wallets"), 0);
    assert_eq!(count("ad_skip_opportunities"), 0);
    assert_eq!(count("ad_skip_ticket_grants"), 1);
    assert_eq!(count("reward_subject_cohorts"), 1);
    let owner: Option<Vec<u8>> = conn
        .query_row("SELECT user_id FROM ad_skip_ticket_grants", [], |r| {
            r.get(0)
        })
        .unwrap();
    assert_eq!(owner, None);
}
