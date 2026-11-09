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
fn check_in_programs_default_to_first_seen_and_one_streak_reward() {
    let base = config(&[]);
    assert_eq!(base.window_start, WindowStart::FirstSeen);
    assert_eq!(base.welcome_streak_limit, 1);
    for invalid in ["0", "53", "two", ""] {
        assert_eq!(
            config(&[("AIT_REWARD_WELCOME_STREAK_LIMIT", invalid)]).welcome_streak_limit,
            1
        );
    }
    assert_eq!(
        config(&[("AIT_REWARD_WINDOW_START", "first-check-in")]).window_start,
        WindowStart::FirstSeen
    );
    let settings = config(&[
        ("AIT_REWARD_POLICY_VERSION", "attendance-rewards-v2"),
        ("AIT_REWARD_NEW_USER_CUTOVER_AT", &CUTOVER.to_string()),
        ("AIT_REWARD_LEGACY_POINTS_ENDS_AT", &CUTOVER.to_string()),
        ("AIT_REWARD_WELCOME_POINT_DAYS", "15"),
        ("AIT_REWARD_WINDOW_START", " first_check_in "),
        ("AIT_REWARD_WELCOME_STREAK_LIMIT", "2"),
    ]);
    assert_eq!(settings.window_start, WindowStart::FirstCheckIn);
    assert_eq!(settings.welcome_streak_limit, 2);
    let policy = settings.cohort.unwrap();
    // A first check-in at 23:59 KST on day 3 keeps points through day 17.
    let first = CUTOVER + 3 * 86_400_000 - 60_000;
    assert_eq!(
        policy.welcome_points_ends_at(first),
        CUTOVER + 17 * 86_400_000
    );
}

#[test]
fn first_check_in_windows_never_pay_conditions_met_before_their_first_day() {
    let mut settings = config(&[("AIT_REWARD_WINDOW_START", "first_check_in")]);
    let subject = RewardSubjectCohort {
        subject_hash: "0".repeat(64),
        cohort: RewardCohort::Welcome,
        // First check-in at 15:00 KST on the window's first day.
        first_seen_at: CUTOVER + 15 * 3_600_000,
        welcome_points_ends_at: Some(CUTOVER + 15 * 86_400_000),
        policy_version: "attendance-rewards-v2".into(),
    };
    // A restore that completed a streak earlier the same day still counts.
    assert!(earned_inside_window(&settings, &subject, CUTOVER));
    assert!(earned_inside_window(
        &settings,
        &subject,
        CUTOVER + 86_400_000
    ));
    // A streak completed the previous day, before the program, does not.
    assert!(!earned_inside_window(&settings, &subject, CUTOVER - 1));
    settings.window_start = WindowStart::FirstSeen;
    assert!(earned_inside_window(&settings, &subject, CUTOVER - 1));
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

#[test]
fn reward_history_is_pruned_a_year_after_its_period() {
    use crate::maintenance::{
        PRUNE_POINT_ELIGIBILITIES, PRUNE_REWARD_SUBJECTS, PRUNE_TICKET_GRANTS, REWARD_HISTORY_MS,
    };
    let conn = crate::generation_archive::tests::fixture(false);
    for sql in [
        include_str!("../../../traildepot/migrations/U1794000000__ad_skip_tickets.sql"),
        include_str!("../../../traildepot/migrations/U1794000100__reward_subject_cohorts.sql"),
        include_str!(
            "../../../traildepot/migrations/U1794000200__promotion_reward_eligibilities.sql"
        ),
    ] {
        conn.execute_batch(sql).unwrap();
    }
    let cutoff = CUTOVER + 400 * 86_400_000 - REWARD_HISTORY_MS;
    let day = engagement::kst_day(cutoff);
    let subject = |c: char| c.to_string().repeat(64);
    let id = |c: char| c.to_string().repeat(48);
    conn.execute_batch(
        "INSERT INTO promotion_campaigns(id,feature_key,provider_promotion_code,reward_amount,status,created_at,updated_at)
           VALUES ('c1','ait_lotto_attendance_weekly','CODE',50,'ENDED',1,1);
         INSERT INTO promotion_reward_ledger(id,user_id,campaign_id,source_type,reward_amount,status,provider_request_id,requested_at,created_at,updated_at)
           VALUES ('pending',x'01','c1','ait_lotto_attendance_weekly',50,'pending','p1',1,1,1),
                  ('paid',x'01','c1','ait_lotto_attendance_weekly',50,'success','p2',1,1,1);",
    )
    .unwrap();
    for (c, end) in [('a', day - 1), ('b', day)] {
        conn.execute(
            "INSERT INTO ad_skip_ticket_grants(user_id,subject_hash,cause,period_start,period_end,quantity,policy_version,created_at)
               VALUES (NULL,?1,'daily_attendance',?2,?2,1,'v1',1)",
            rusqlite::params![subject(c), end],
        )
        .unwrap();
    }
    for (c, deadline, ledger) in [
        ('a', cutoff - 1, None),
        ('b', cutoff - 1, Some("pending")),
        ('c', cutoff - 1, Some("paid")),
        ('d', cutoff, None),
    ] {
        conn.execute(
            "INSERT INTO promotion_reward_eligibilities VALUES (?1,NULL,?2,'attendance_weekly',1,7,'c1','CODE',50,'LEGACY_GRACE','v1',0,?3,?4,?5,0)",
            rusqlite::params![id(c), subject(c), deadline, ledger, ledger.map(|_| 1)],
        )
        .unwrap();
    }
    for (c, cohort, ends) in [
        ('a', "WELCOME", Some(cutoff - 1)),
        ('b', "WELCOME", Some(cutoff)),
        ('c', "LEGACY", None),
    ] {
        conn.execute(
            "INSERT INTO reward_subject_cohorts VALUES (?1,?2,0,?3,'v1',0)",
            rusqlite::params![subject(c), cohort, ends],
        )
        .unwrap();
    }
    let kept = |table: &str, column: &str| -> Vec<String> {
        let mut stmt = conn
            .prepare(&format!(
                "SELECT substr({column},1,1) FROM {table} ORDER BY 1"
            ))
            .unwrap();
        stmt.query_map([], |r| r.get(0))
            .unwrap()
            .map(Result::unwrap)
            .collect()
    };
    conn.execute(PRUNE_TICKET_GRANTS, [day]).unwrap();
    conn.execute(PRUNE_POINT_ELIGIBILITIES, [cutoff]).unwrap();
    // Without a configured legacy end, legacy subjects stay.
    conn.execute(
        PRUNE_REWARD_SUBJECTS,
        rusqlite::params![cutoff, None::<i64>],
    )
    .unwrap();
    assert_eq!(kept("ad_skip_ticket_grants", "subject_hash"), ["b"]);
    // A pending claim keeps its snapshot; a settled or unclaimed old one goes.
    assert_eq!(kept("promotion_reward_eligibilities", "id"), ["b", "d"]);
    assert_eq!(kept("reward_subject_cohorts", "subject_hash"), ["b", "c"]);
    conn.execute(PRUNE_REWARD_SUBJECTS, [cutoff, cutoff])
        .unwrap();
    assert_eq!(kept("reward_subject_cohorts", "subject_hash"), ["b", "c"]);
    conn.execute(PRUNE_REWARD_SUBJECTS, [cutoff, cutoff - 1])
        .unwrap();
    assert_eq!(kept("reward_subject_cohorts", "subject_hash"), ["b"]);
}
