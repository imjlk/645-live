use super::*;
use rusqlite::{
    Connection, params, params_from_iter,
    types::{Value as SqlValue, ValueRef},
};
struct SqlStore<'a>(&'a Connection);
impl Store for SqlStore<'_> {
    fn execute(&mut self, sql: &str, values: &[Value]) -> ApiResult<()> {
        let values = values
            .iter()
            .map(|v| match v {
                Value::Integer(n) => SqlValue::Integer(*n),
                Value::Text(s) => SqlValue::Text(s.clone()),
                _ => SqlValue::Null,
            })
            .collect::<Vec<_>>();
        self.0
            .execute(sql, params_from_iter(values))
            .map(|_| ())
            .map_err(internal)
    }
    fn query(&mut self, sql: &str, values: &[Value]) -> ApiResult<Vec<Vec<Value>>> {
        let values = values
            .iter()
            .map(|v| match v {
                Value::Integer(n) => SqlValue::Integer(*n),
                Value::Text(s) => SqlValue::Text(s.clone()),
                _ => SqlValue::Null,
            })
            .collect::<Vec<_>>();
        let mut statement = self.0.prepare(sql).map_err(internal)?;
        let columns = statement.column_count();
        statement
            .query_map(params_from_iter(values), |r| {
                (0..columns)
                    .map(|i| {
                        Ok(match r.get_ref(i)? {
                            ValueRef::Integer(n) => Value::Integer(n),
                            ValueRef::Text(s) => {
                                Value::Text(std::str::from_utf8(s).unwrap().into())
                            }
                            ValueRef::Null => Value::Null,
                            _ => panic!("unexpected value"),
                        })
                    })
                    .collect::<rusqlite::Result<Vec<_>>>()
            })
            .map_err(internal)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(internal)
    }
}
fn fixture() -> Connection {
    let conn = crate::generation_archive::tests::fixture(true);
    for sql in [
        include_str!("../../../traildepot/migrations/U1750770000__create_lotto_draw_results.sql"),
        include_str!("../../../traildepot/migrations/U1750771000__create_lotto_number_stats.sql"),
    ] {
        conn.execute_batch(sql).unwrap();
    }
    conn
}
fn migrate(conn: &Connection) {
    conn.execute_batch(include_str!(
        "../../../traildepot/migrations/U1790952000__number_activity_insights.sql"
    ))
    .unwrap();
    conn.execute_batch(include_str!(
        "../../../traildepot/migrations/U1790958000__activity_snapshot_cache.sql"
    ))
    .unwrap();
}
fn generate(conn: &Connection, round: i64, at: i64) -> i64 {
    conn.execute("INSERT INTO lotto_public_generations(round,display_name,number_1,number_2,number_3,number_4,number_5,number_6,created_at) VALUES (?1,'private-fixture',1,2,3,10,20,45,?2)",params![round,at]).unwrap();
    conn.last_insert_rowid()
}
fn scan(conn: &Connection, round: i64, at: i64) {
    conn.execute("INSERT INTO lotto_activity_deltas(source,round,numbers_json,created_at,delta) VALUES('scanned',?1,'[1,2,3,10,20,45]',?2,1)",params![round,at]).unwrap();
}
#[test]
fn aggregates_preserve_archive_and_remove_unshared_active_rows() {
    let conn = fixture();
    let now = lotto::close_time(1242) - 1000;
    let id = generate(&conn, 1242, now);
    migrate(&conn);
    assert_eq!(
        conn.query_row("SELECT combinations FROM lotto_activity_rounds", [], |r| {
            r.get::<_, i64>(0)
        })
        .unwrap(),
        1
    );
    conn.execute("DELETE FROM lotto_public_generations WHERE id=?1", [id])
        .unwrap();
    assert_eq!(
        conn.query_row("SELECT combinations FROM lotto_activity_rounds", [], |r| {
            r.get::<_, i64>(0)
        })
        .unwrap(),
        0
    );
    let id = generate(&conn, 1242, now);
    conn.execute("INSERT INTO lotto_generation_weekly_archives(round,total_generations,number_counts_json,closed_at,archived_at) SELECT round,total_generations,json_array(generation_count_1,generation_count_2,generation_count_3,generation_count_4,generation_count_5,generation_count_6,generation_count_7,generation_count_8,generation_count_9,generation_count_10,generation_count_11,generation_count_12,generation_count_13,generation_count_14,generation_count_15,generation_count_16,generation_count_17,generation_count_18,generation_count_19,generation_count_20,generation_count_21,generation_count_22,generation_count_23,generation_count_24,generation_count_25,generation_count_26,generation_count_27,generation_count_28,generation_count_29,generation_count_30,generation_count_31,generation_count_32,generation_count_33,generation_count_34,generation_count_35,generation_count_36,generation_count_37,generation_count_38,generation_count_39,generation_count_40,generation_count_41,generation_count_42,generation_count_43,generation_count_44,generation_count_45),?1,?1 FROM lotto_draw_generation_counts WHERE round=1242",[now]).unwrap();
    conn.execute("DELETE FROM lotto_public_generations WHERE id=?1", [id])
        .unwrap();
    assert_eq!(
        conn.query_row("SELECT combinations FROM lotto_activity_rounds", [], |r| {
            r.get::<_, i64>(0)
        })
        .unwrap(),
        1
    );
    assert_eq!(
        conn.query_row("SELECT count(*) FROM lotto_activity_deltas", [], |r| r
            .get::<_, i64>(0))
            .unwrap(),
        0
    );
}
#[test]
fn qr_patterns_and_pairs_are_distinct_and_do_not_fabricate_legacy_coverage() {
    let conn = fixture();
    migrate(&conn);
    let now = lotto::close_time(1242) - 1000;
    generate(&conn, 1242, now);
    scan(&conn, 1242, now);
    scan(&conn, 1242, now);
    conn.execute(
        "INSERT INTO lotto_draw_scan_counts(round,total_scans,scan_count_1) VALUES(1242,8,19)",
        [],
    )
    .unwrap();
    let result = snapshot(&mut SqlStore(&conn), 1242, "round", now).unwrap();
    assert_eq!(result["sources"]["generated"]["records"], 1);
    let s = &result["sources"]["scanned"];
    assert_eq!(s["records"], 8);
    assert_eq!(s["numberCounts"][0], 19);
    assert_eq!(s["patterns"]["combinations"], 2);
    assert_eq!(s["patterns"]["oddCounts"][3], 2);
    assert_eq!(s["patterns"]["withConsecutive"], 2);
    assert_eq!(s["pairs"].as_array().unwrap().len(), 15);
    assert!(!result.to_string().contains("private-fixture"));
}
#[test]
fn rolling_hours_and_query_bounds_do_not_mix_future_or_historical_rounds() {
    let conn = fixture();
    migrate(&conn);
    let now = lotto::close_time(1242) - 1000;
    generate(&conn, 1242, now);
    generate(&conn, 1242, now - 25 * 3600000);
    generate(&conn, 1242, now + 2 * 3600000);
    generate(&conn, 1241, now - 7 * 86400000);
    let day = snapshot(&mut SqlStore(&conn), 1242, "day", now).unwrap();
    assert_eq!(day["sources"]["generated"]["records"], 1);
    assert_eq!(day["sources"]["generated"]["patterns"]["combinations"], 0);
    let four = snapshot(&mut SqlStore(&conn), 1242, "four", now).unwrap();
    assert_eq!(four["sources"]["generated"]["records"], 4);
    assert!(snapshot(&mut SqlStore(&conn), 1243, "round", now).is_err());
    assert!(snapshot(&mut SqlStore(&conn), 1241, "day", now).is_err());
}

#[test]
fn unsharing_still_works_after_hourly_retention() {
    let conn = fixture();
    migrate(&conn);
    let now = lotto::close_time(1242) - 1000;
    let id = generate(&conn, 1242, now);
    conn.execute("DELETE FROM lotto_activity_hours", [])
        .unwrap();
    conn.execute("DELETE FROM lotto_public_generations WHERE id=?1", [id])
        .unwrap();
    let result = snapshot(&mut SqlStore(&conn), 1242, "round", now).unwrap();
    assert_eq!(
        result["sources"]["generated"]["patterns"]["combinations"],
        0
    );
    assert_eq!(result["sources"]["generated"]["pairs"], json!([]));
    assert_eq!(result["sources"]["generated"]["hours"], json!([]));
}

#[test]
fn invalid_delta_rolls_back_every_aggregate() {
    let conn = fixture();
    migrate(&conn);
    for numbers in [
        "[1,1,2,3,4,5]",
        "[1,2,3,4,5,46]",
        "[1,2,3,4,5,6.5]",
        "[null,2,3,4,5,6]",
    ] {
        assert!(conn.execute("INSERT INTO lotto_activity_deltas(source,round,numbers_json,created_at,delta) VALUES('scanned',1242,?1,1,1)",[numbers]).is_err());
    }
    assert!(conn.execute("INSERT INTO lotto_activity_deltas(source,round,numbers_json,created_at,delta) VALUES('scanned',1242,'[1,2,3,4,5,6]',1,-1)",[]).is_err());
    for table in [
        "lotto_activity_rounds",
        "lotto_activity_pairs",
        "lotto_activity_hours",
        "lotto_activity_deltas",
    ] {
        assert_eq!(
            conn.query_row(&format!("SELECT count(*) FROM {table}"), [], |r| r
                .get::<_, i64>(0))
                .unwrap(),
            0
        );
    }
}

#[test]
fn cumulative_cache_reuses_pair_queries_and_refreshes_after_expiry() {
    struct Counted<'a> {
        inner: SqlStore<'a>,
        pairs: usize,
    }
    impl Store for Counted<'_> {
        fn query(&mut self, sql: &str, params: &[Value]) -> ApiResult<Vec<Vec<Value>>> {
            if sql.contains("FROM lotto_activity_pairs") {
                self.pairs += 1;
            }
            self.inner.query(sql, params)
        }
        fn execute(&mut self, sql: &str, params: &[Value]) -> ApiResult<()> {
            self.inner.execute(sql, params)
        }
    }
    let conn = fixture();
    migrate(&conn);
    let now = lotto::close_time(1242) - 3_600_000;
    generate(&conn, 1242, now);
    let mut store = Counted {
        inner: SqlStore(&conn),
        pairs: 0,
    };
    let first = cached_snapshot(&mut store, 1242, "all", now).unwrap();
    assert_eq!(store.pairs, 2);
    generate(&conn, 1242, now + 1000);
    assert_eq!(
        cached_snapshot(&mut store, 1242, "all", now + 2000).unwrap(),
        first
    );
    assert_eq!(store.pairs, 2);
    assert_eq!(
        cached_snapshot(&mut store, 1242, "round", now + 2000).unwrap()["sources"]["generated"]["records"],
        2
    );
    let expired = cached_snapshot(&mut store, 1242, "all", now + 15_000).unwrap();
    assert_eq!(expired["sources"]["generated"]["records"], 2);
    assert_eq!(expired["updatedAt"], now + 15_000);
    assert_eq!(store.pairs, 6);
}

#[test]
fn cumulative_cache_is_bounded_and_cannot_cross_the_current_round_boundary() {
    let conn = fixture();
    migrate(&conn);
    let now = lotto::close_time(1242) - 1000;
    let first = cached_snapshot(&mut SqlStore(&conn), 1242, "all", now).unwrap();
    assert_eq!(first["currentRound"], 1242);
    assert_eq!(
        cached_snapshot(&mut SqlStore(&conn), 1242, "all", now + 2000).unwrap()["currentRound"],
        1243
    );
    for round in 1..=40 {
        cached_snapshot(&mut SqlStore(&conn), round, "all", now + round).unwrap();
    }
    assert_eq!(
        conn.query_row("SELECT count(*) FROM lotto_activity_all_cache", [], |r| r
            .get::<_, i64>(
            0
        ))
        .unwrap(),
        32
    );
    assert!(cached_snapshot(&mut SqlStore(&conn), 1243, "all", now).is_err());
}
