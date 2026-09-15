use super::*;
use rusqlite::{Connection, params, params_from_iter};

const ROUND: i64 = 1242;
const MIGRATION: &str = concat!(
    include_str!("../../../traildepot/migrations/U1789452000__weekly_generation_archive.sql"),
    include_str!("../../../traildepot/migrations/U1789460000__generation_result_statistics.sql"),
);

pub(crate) fn fixture(migrate: bool) -> Connection {
    let conn = Connection::open_in_memory().unwrap();
    conn.execute_batch("PRAGMA foreign_keys=ON; CREATE TABLE _user(id BLOB PRIMARY KEY);")
        .unwrap();
    for sql in [
        include_str!("../../../traildepot/migrations/U1789314000__miniapp_lotto.sql"),
        include_str!(
            "../../../traildepot/migrations/U1789318000__miniapp_generation_immutable.sql"
        ),
        include_str!(
            "../../../traildepot/migrations/U1789322000__miniapp_promotion_accounting.sql"
        ),
        include_str!("../../../traildepot/migrations/U1789344000__miniapp_attendance_cycles.sql"),
        include_str!("../../../traildepot/migrations/U1789374000__miniapp_generation_ads.sql"),
        include_str!("../../../traildepot/migrations/U1789434000__web_lotto_generation.sql"),
    ] {
        conn.execute_batch(sql).unwrap();
    }
    conn.execute_batch(
        "INSERT INTO _user VALUES (x'01');
        INSERT INTO web_lotto_profiles VALUES(x'01','fixture','fixture',0,1,1);
        INSERT INTO ait_lotto_attendance VALUES(x'01',20000,1);
        INSERT INTO ait_lotto_entitlements VALUES(x'01','custom',9999999999999);
        INSERT INTO ait_lotto_result_watches VALUES(x'01',1242,1);",
    )
    .unwrap();
    if migrate {
        conn.execute_batch(MIGRATION).unwrap();
    }
    conn
}

fn insert(conn: &Connection, round: i64, at: i64, source: &str, offset: i64) -> i64 {
    let mut numbers = (0..6).map(|i| (offset + i) % 45 + 1).collect::<Vec<_>>();
    numbers.sort_unstable();
    conn.execute(
        "INSERT INTO lotto_public_generations(round,display_name,number_1,number_2,number_3,number_4,number_5,number_6,created_at) VALUES (?1,'fixture',?2,?3,?4,?5,?6,?7,?8)",
        params![round,numbers[0],numbers[1],numbers[2],numbers[3],numbers[4],numbers[5],at],
    ).unwrap();
    let id = conn.last_insert_rowid();
    conn.execute(
        "INSERT INTO ait_lotto_generation_origins VALUES (?1,?2,?3)",
        params![id, if source == "bot" { "bot" } else { "human" }, source],
    )
    .unwrap();
    if source == "miniapp" {
        conn.execute(
            "INSERT INTO ait_lotto_generation_requests VALUES (x'01',?1,?2,?3,?4)",
            params![
                format!("request-{id}"),
                id,
                json!({"round":round,"options":{}}).to_string(),
                at
            ],
        )
        .unwrap();
    } else if source == "web" {
        conn.execute(
            "INSERT INTO web_lotto_generation_batches VALUES (x'01',?1,?2,?3,?4)",
            params![
                format!("request-{id}"),
                json!({"round":round,"games":[numbers]}).to_string(),
                json!([id]).to_string(),
                at
            ],
        )
        .unwrap();
    }
    id
}

pub(crate) fn run(conn: &mut Connection, now: i64) -> rusqlite::Result<()> {
    let tx = conn.transaction()?;
    for step in steps(now) {
        tx.execute(&step.sql, params_from_iter(step.params))?;
    }
    tx.commit()
}

fn scalar(conn: &Connection, sql: &str) -> i64 {
    conn.query_row(sql, [], |row| row.get(0)).unwrap()
}

fn archive(conn: &Connection, round: i64) -> (i64, Vec<i64>, i64, Option<i64>) {
    conn.query_row("SELECT total_generations,number_counts_json,archived_at,purged_at FROM lotto_generation_weekly_archives WHERE round=?1", [round], |row| {
        Ok((row.get(0)?,serde_json::from_str(&row.get::<_,String>(1)?).unwrap(),row.get(2)?,row.get(3)?))
    }).unwrap()
}

#[test]
fn upgrade_and_saturday_close_preserve_the_snapshot_and_next_round() {
    let mut conn = fixture(false);
    let close = lotto::close_time(ROUND);
    insert(&conn, ROUND, close - 1000, "miniapp", 0);
    insert(&conn, ROUND, close - 1000, "web", 39);
    conn.execute_batch(MIGRATION).unwrap();
    assert_eq!(
        scalar(&conn, "SELECT count(*) FROM lotto_public_generations"),
        2
    );
    run(&mut conn, close - 1).unwrap();
    assert_eq!(
        scalar(
            &conn,
            "SELECT count(*) FROM lotto_generation_weekly_archives WHERE round=1242"
        ),
        0
    );
    run(&mut conn, close).unwrap();
    let (total, counts, archived, purged) = archive(&conn, ROUND);
    assert_eq!(total, 2);
    assert_eq!(
        counts,
        (1..=45)
            .map(|n| i64::from(n <= 6 || n >= 40))
            .collect::<Vec<_>>()
    );
    assert_eq!((archived, purged), (close, Some(close)));
    assert_eq!(
        scalar(&conn, "SELECT count(*) FROM lotto_public_generations"),
        0
    );
    assert_eq!(
        scalar(&conn, "SELECT count(*) FROM ait_lotto_generation_origins"),
        0
    );
    assert_eq!(
        scalar(
            &conn,
            "SELECT count(*) FROM lotto_draw_generation_counts WHERE round=1242"
        ),
        0
    );
    assert_eq!(
        scalar(
            &conn,
            "SELECT total_generations FROM lotto_draw_generation_counts WHERE round=1243"
        ),
        0
    );
    insert(&conn, ROUND + 1, close + 1, "miniapp", 5);
    run(&mut conn, close + 60_000).unwrap();
    assert_eq!(archive(&conn, ROUND), (total, counts, archived, purged));
    assert_eq!(
        scalar(
            &conn,
            "SELECT total_generations FROM lotto_draw_generation_counts WHERE round=1243"
        ),
        1
    );
}

#[test]
fn large_rounds_resume_without_recounting_or_recreating_live_counters() {
    let mut conn = fixture(true);
    let close = lotto::close_time(ROUND);
    conn.execute_batch("BEGIN").unwrap();
    for i in 0..BATCH_SIZE + 250 {
        insert(
            &conn,
            ROUND,
            close - 1000,
            if i % 3 == 0 { "bot" } else { "miniapp" },
            i,
        );
    }
    conn.execute_batch("COMMIT").unwrap();
    let before = scalar(&conn, "PRAGMA freelist_count");
    run(&mut conn, close).unwrap();
    let first = archive(&conn, ROUND);
    assert_eq!(first.0, BATCH_SIZE + 250);
    assert_eq!(first.1.iter().sum::<i64>(), first.0 * 6);
    assert_eq!(first.3, None);
    assert_eq!(
        scalar(
            &conn,
            "SELECT count(*) FROM lotto_public_generations WHERE round=1242"
        ),
        250
    );
    assert!(conn.execute("INSERT INTO lotto_public_generations(round,display_name,number_1,number_2,number_3,number_4,number_5,number_6,created_at) VALUES (1242,'stale',1,2,3,4,5,6,1)",[]).is_err());
    insert(&conn, ROUND + 1, close, "web", 15);
    run(&mut conn, close + 60_000).unwrap();
    let next = archive(&conn, ROUND);
    assert_eq!((next.0, next.1, next.2), (first.0, first.1, first.2));
    assert_eq!(next.3, Some(close + 60_000));
    assert_eq!(
        scalar(
            &conn,
            "SELECT count(*) FROM lotto_draw_generation_counts WHERE round=1242"
        ),
        0
    );
    assert_eq!(
        scalar(
            &conn,
            "SELECT count(*) FROM lotto_public_generations WHERE round=1243"
        ),
        1
    );
    assert!(scalar(&conn, "PRAGMA freelist_count") > before);
    assert_eq!(
        scalar(&conn, "SELECT count(*) FROM pragma_foreign_key_check"),
        0
    );
}

#[test]
fn attendance_and_limits_survive_closing_then_private_details_expire() {
    let mut conn = fixture(true);
    let close = lotto::close_time(ROUND);
    for source in ["miniapp", "web"] {
        insert(&conn, ROUND, close - 1000, source, 0);
        insert(&conn, ROUND, close - 2 * REQUEST_RETENTION_MS, source, 10);
    }
    run(&mut conn, close).unwrap();
    assert_eq!(
        scalar(&conn, "SELECT count(*) FROM ait_lotto_generation_requests"),
        1
    );
    assert_eq!(
        scalar(&conn, "SELECT count(*) FROM web_lotto_generation_batches"),
        1
    );
    // The successful-generation receipt remains usable after its public row is gone.
    assert_eq!(
        scalar(
            &conn,
            "SELECT count(*) FROM ait_lotto_generation_requests WHERE generation_id IS NULL"
        ),
        1
    );
    run(&mut conn, close + REQUEST_RETENTION_MS).unwrap();
    assert_eq!(
        scalar(&conn, "SELECT count(*) FROM ait_lotto_generation_requests"),
        0
    );
    assert_eq!(
        scalar(&conn, "SELECT count(*) FROM web_lotto_generation_batches"),
        0
    );
    assert_eq!(
        scalar(&conn, "SELECT count(*) FROM ait_lotto_attendance"),
        1
    );
    assert_eq!(
        scalar(&conn, "SELECT count(*) FROM ait_lotto_entitlements"),
        1
    );
    assert_eq!(
        scalar(&conn, "SELECT count(*) FROM ait_lotto_result_watches"),
        1
    );
    assert_eq!(archive(&conn, ROUND).0, 4);
}

#[test]
fn a_failed_purge_rolls_back_the_snapshot_and_can_retry() {
    let mut conn = fixture(true);
    let close = lotto::close_time(ROUND);
    insert(&conn, ROUND, close - 1000, "miniapp", 0);
    conn.execute_batch("CREATE TRIGGER fail_purge BEFORE DELETE ON lotto_public_generations BEGIN SELECT RAISE(ABORT,'fixture'); END;").unwrap();
    assert!(run(&mut conn, close).is_err());
    assert_eq!(
        scalar(
            &conn,
            "SELECT count(*) FROM lotto_generation_weekly_archives WHERE round=1242"
        ),
        0
    );
    assert_eq!(
        scalar(
            &conn,
            "SELECT total_generations FROM lotto_draw_generation_counts WHERE round=1242"
        ),
        1
    );
    assert_eq!(
        scalar(&conn, "SELECT count(*) FROM lotto_public_generations"),
        1
    );
    conn.execute_batch("DROP TRIGGER fail_purge").unwrap();
    run(&mut conn, close + 60_000).unwrap();
    assert_eq!(archive(&conn, ROUND).0, 1);
}

#[test]
fn inconsistent_counters_stop_archival_before_any_detail_is_lost() {
    let mut conn = fixture(true);
    let close = lotto::close_time(ROUND);
    insert(&conn, ROUND, close - 1000, "miniapp", 0);
    conn.execute_batch(
        "UPDATE lotto_draw_generation_counts SET generation_count_45=1 WHERE round=1242",
    )
    .unwrap();
    assert!(run(&mut conn, close).is_err());
    assert_eq!(
        scalar(&conn, "SELECT count(*) FROM lotto_public_generations"),
        1
    );
    assert_eq!(
        scalar(
            &conn,
            "SELECT count(*) FROM lotto_generation_weekly_archives"
        ),
        0
    );
}

#[test]
fn missed_weeks_catch_up_without_replacing_pending_totals_with_zero() {
    let mut conn = fixture(true);
    let close = lotto::close_time(ROUND);
    for round in ROUND - 9..=ROUND {
        insert(&conn, round, lotto::close_time(round) - 1000, "bot", 0);
    }
    run(&mut conn, close).unwrap();
    assert_eq!(
        scalar(
            &conn,
            "SELECT count(*) FROM lotto_generation_weekly_archives"
        ),
        8
    );
    assert_eq!(
        scalar(
            &conn,
            "SELECT count(*) FROM lotto_generation_weekly_archives WHERE round=1242"
        ),
        0
    );
    run(&mut conn, close + 60_000).unwrap();
    assert_eq!(
        scalar(
            &conn,
            "SELECT count(*) FROM lotto_generation_weekly_archives"
        ),
        10
    );
    assert_eq!(archive(&conn, ROUND).0, 1);
    assert_eq!(
        scalar(&conn, "SELECT count(*) FROM lotto_public_generations"),
        0
    );
}

#[test]
fn unsharing_open_rounds_still_decrements_their_live_totals() {
    let mut conn = fixture(true);
    let close = lotto::close_time(ROUND);
    let id = insert(&conn, ROUND, close - 1000, "miniapp", 0);
    conn.execute("DELETE FROM lotto_public_generations WHERE id=?1", [id])
        .unwrap();
    assert_eq!(
        scalar(
            &conn,
            "SELECT total_generations FROM lotto_draw_generation_counts WHERE round=1242"
        ),
        0
    );
    run(&mut conn, close).unwrap();
    assert_eq!(archive(&conn, ROUND).0, 0);
}

#[test]
fn pruning_seeks_archived_rounds_without_scanning_or_sorting_active_requests() {
    let conn = fixture(true);
    for step in steps(lotto::close_time(ROUND)) {
        let index = match step.name {
            "removedRequests" => "ait_lotto_requests_archive",
            "removedWebBatches" => "web_lotto_batches_archive",
            _ => continue,
        };
        let plan = conn
            .prepare(&format!("EXPLAIN QUERY PLAN {}", step.sql))
            .unwrap()
            .query_map(params_from_iter(step.params), |row| row.get::<_, String>(3))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert!(
            plan.iter().any(|line| line.contains(index)
                && line.starts_with("SEARCH ")
                && line.contains("created_at<?")),
            "{plan:?}"
        );
        assert!(
            !plan.iter().any(|line| line.contains("TEMP B-TREE")),
            "{plan:?}"
        );
    }
}
