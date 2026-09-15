use super::*;
use crate::generation_archive::tests as archive_job;
use rusqlite::{
    Connection, params_from_iter,
    types::{Value as SqlValue, ValueRef},
};

const ROUND: i64 = 1242;
struct SqlStore<'a>(&'a Connection);
fn bindings(values: &[Value]) -> Vec<SqlValue> {
    values
        .iter()
        .map(|v| match v {
            Value::Integer(n) => SqlValue::Integer(*n),
            Value::Text(s) => SqlValue::Text(s.clone()),
            Value::Null => SqlValue::Null,
            _ => panic!("Unexpected fixture binding"),
        })
        .collect()
}
impl Store for SqlStore<'_> {
    fn query(&mut self, sql: &str, params: &[Value]) -> ApiResult<Vec<Vec<Value>>> {
        let mut statement = self.0.prepare(sql).map_err(internal)?;
        let columns = statement.column_count();
        statement
            .query_map(params_from_iter(bindings(params)), |row| {
                (0..columns)
                    .map(|i| {
                        Ok(match row.get_ref(i)? {
                            ValueRef::Null => Value::Null,
                            ValueRef::Integer(n) => Value::Integer(n),
                            ValueRef::Text(s) => {
                                Value::Text(std::str::from_utf8(s).unwrap().into())
                            }
                            _ => panic!("Unexpected fixture result"),
                        })
                    })
                    .collect::<rusqlite::Result<Vec<_>>>()
            })
            .map_err(internal)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(internal)
    }
    fn execute(&mut self, sql: &str, params: &[Value]) -> ApiResult<u64> {
        self.0
            .execute(sql, params_from_iter(bindings(params)))
            .map(|n| n as u64)
            .map_err(internal)
    }
}
fn fixture() -> Connection {
    let conn = archive_job::fixture(true);
    draw_schema(&conn);
    conn
}
fn draw_schema(conn: &Connection) {
    for sql in [
        include_str!("../../../traildepot/migrations/U1750770000__create_lotto_draw_results.sql"),
        include_str!("../../../traildepot/migrations/U1750771000__create_lotto_number_stats.sql"),
        include_str!("../../../traildepot/migrations/U1774670400__create_lotto_bonus_stats.sql"),
    ] {
        conn.execute_batch(sql).unwrap();
    }
}
fn generate(conn: &Connection, numbers: &[i64], copies: usize) {
    for _ in 0..copies {
        let mut values = vec![ROUND];
        values.extend(numbers);
        values.push(lotto::close_time(ROUND) - 1000);
        conn.execute("INSERT INTO lotto_public_generations(round,display_name,number_1,number_2,number_3,number_4,number_5,number_6,created_at) VALUES (?1,'fixture',?2,?3,?4,?5,?6,?7,?8)", params_from_iter(values)).unwrap();
    }
}
fn draw(conn: &Connection, numbers: &[i64], bonus: i64) {
    let mut params = vec![ROUND];
    params.extend(numbers);
    params.push(bonus);
    conn.execute("INSERT INTO lotto_draw_results(round,draw_date,total_sell_amount,first_prize_amount,first_prize_winner_count,first_prize_accumulated_amount,draw_number_1,draw_number_2,draw_number_3,draw_number_4,draw_number_5,draw_number_6,bonus_number)
        VALUES (?1,'2026-09-19',1000,1000,1,1000,?2,?3,?4,?5,?6,?7,?8)
        ON CONFLICT(round) DO UPDATE SET draw_number_1=excluded.draw_number_1,draw_number_2=excluded.draw_number_2,draw_number_3=excluded.draw_number_3,draw_number_4=excluded.draw_number_4,draw_number_5=excluded.draw_number_5,draw_number_6=excluded.draw_number_6,bonus_number=excluded.bonus_number",
        params_from_iter(params)).unwrap();
}
fn run(conn: &mut Connection, now: i64, batch: usize) -> ApiResult<Json> {
    let tx = conn.transaction().map_err(internal)?;
    let result = settle(&mut SqlStore(&tx), now, batch)?;
    tx.commit().map_err(internal)?;
    Ok(result)
}
fn result(conn: &Connection, now: i64) -> Json {
    history(&mut SqlStore(conn), now, Some(ROUND), None).unwrap()["rounds"][0].clone()
}
fn seed(conn: &Connection) {
    for (numbers, copies) in [
        ([1, 2, 3, 4, 5, 6], 2),
        ([1, 2, 3, 4, 5, 7], 3),
        ([1, 2, 3, 4, 5, 8], 1),
        ([1, 2, 3, 4, 8, 9], 1),
        ([1, 2, 3, 8, 9, 10], 4),
        ([8, 9, 10, 11, 12, 13], 5),
    ] {
        generate(conn, &numbers, copies);
    }
}

#[test]
fn upgrading_an_old_archive_recovers_only_complete_source_combinations() {
    for removed in 0..=2 {
        let mut conn = archive_job::fixture(false);
        draw_schema(&conn);
        generate(&conn, &[1, 2, 3, 4, 5, 6], 2);
        conn.execute_batch(include_str!(
            "../../../traildepot/migrations/U1789452000__weekly_generation_archive.sql"
        ))
        .unwrap();
        let columns = (1..=45)
            .map(|n| format!("generation_count_{n}"))
            .collect::<Vec<_>>()
            .join(",");
        let now = lotto::close_time(ROUND);
        conn.execute(&format!("INSERT INTO lotto_generation_weekly_archives(round,total_generations,number_counts_json,closed_at,archived_at) SELECT round,total_generations,json_array({columns}),?1,?1 FROM lotto_draw_generation_counts WHERE round=?2"), [now, ROUND]).unwrap();
        conn.execute("DELETE FROM lotto_public_generations WHERE id IN (SELECT id FROM lotto_public_generations LIMIT ?1)", [removed]).unwrap();
        if removed == 2 {
            conn.execute(
                "UPDATE lotto_generation_weekly_archives SET purged_at=?1",
                [now],
            )
            .unwrap();
        }
        conn.execute_batch(include_str!(
            "../../../traildepot/migrations/U1789460000__generation_result_statistics.sql"
        ))
        .unwrap();
        archive_job::run(&mut conn, now + 1000).unwrap();
        draw(&conn, &[1, 2, 3, 4, 5, 6], 7);
        run(&mut conn, now + 2000, 100).unwrap();
        let value = result(&conn, now + 2000);
        if removed == 0 {
            assert_eq!(value["rankCounts"], json!([0, 2, 0, 0, 0, 0]));
            assert_eq!(value["status"], "ready");
        } else {
            assert_eq!(value["status"], "unavailable");
            assert!(value["rankCounts"].is_null());
            assert_eq!(value["totalGenerations"], 2);
        }
    }
}

#[test]
fn real_archive_and_paged_comparison_preserve_multiplicity_and_all_six_outcomes() {
    let mut conn = fixture();
    let now = lotto::close_time(ROUND);
    seed(&conn);
    archive_job::run(&mut conn, now).unwrap();
    assert_eq!(result(&conn, now)["status"], "waiting");
    assert!(result(&conn, now)["rankCounts"].is_null());
    draw(&conn, &[1, 2, 3, 4, 5, 6], 7);
    run(&mut conn, now + 1000, 2).unwrap();
    assert_eq!(result(&conn, now)["status"], "processing");
    assert!(result(&conn, now)["rankCounts"].is_null());
    run(&mut conn, now + 2000, 2).unwrap();
    run(&mut conn, now + 3000, 2).unwrap();
    let ready = result(&conn, now);
    assert_eq!(ready["status"], "ready");
    assert_eq!(ready["totalGenerations"], 16);
    assert_eq!(ready["rankCounts"], json!([5, 2, 3, 1, 1, 4]));
    assert_eq!(run(&mut conn, now + 4000, 2).unwrap()["processed"], 0);
    assert_eq!(result(&conn, now), ready);
}

#[test]
fn a_draw_correction_restarts_the_cursor_and_never_exposes_old_rank_counts() {
    let mut conn = fixture();
    let now = lotto::close_time(ROUND);
    seed(&conn);
    archive_job::run(&mut conn, now).unwrap();
    draw(&conn, &[1, 2, 3, 4, 5, 6], 7);
    run(&mut conn, now + 1000, 100).unwrap();
    draw(&conn, &[8, 9, 10, 11, 12, 13], 7);
    assert_eq!(result(&conn, now)["status"], "processing");
    assert!(result(&conn, now)["rankCounts"].is_null());
    run(&mut conn, now + 2000, 2).unwrap();
    run(&mut conn, now + 3000, 100).unwrap();
    assert_eq!(result(&conn, now)["rankCounts"], json!([7, 5, 0, 0, 0, 4]));
    archive_job::run(&mut conn, now + 604800000 + 4000).unwrap();
    assert_eq!(
        conn.query_row(
            "SELECT count(*) FROM lotto_generation_result_combinations",
            [],
            |r| r.get::<_, i64>(0)
        )
        .unwrap(),
        0
    );
    assert_eq!(result(&conn, now)["status"], "ready");
    draw(&conn, &[1, 2, 3, 4, 5, 6], 7);
    assert_eq!(result(&conn, now)["status"], "unavailable");
    assert!(result(&conn, now)["rankCounts"].is_null());
}

#[test]
fn owner_deletion_during_a_large_archive_cannot_erase_comparison_coverage() {
    let mut conn = fixture();
    let now = lotto::close_time(ROUND);
    generate(&conn, &[1, 2, 3, 4, 5, 6], 1001);
    archive_job::run(&mut conn, now).unwrap();
    conn.execute(
        "DELETE FROM lotto_public_generations WHERE round=?1",
        [ROUND],
    )
    .unwrap();
    draw(&conn, &[1, 2, 3, 4, 5, 6], 7);
    assert_eq!(run(&mut conn, now + 1000, 100).unwrap()["processed"], 0);
    archive_job::run(&mut conn, now + 60000).unwrap();
    run(&mut conn, now + 61000, 100).unwrap();
    assert_eq!(
        result(&conn, now)["rankCounts"],
        json!([0, 1001, 0, 0, 0, 0])
    );
}

#[test]
fn missing_source_and_missing_draws_are_never_reported_as_zero_wins() {
    let mut conn = fixture();
    let now = lotto::close_time(ROUND);
    seed(&conn);
    archive_job::run(&mut conn, now).unwrap();
    archive_job::run(&mut conn, now + 1209600000 + 1000).unwrap();
    draw(&conn, &[1, 2, 3, 4, 5, 6], 7);
    assert_eq!(result(&conn, now)["status"], "unavailable");
    assert!(result(&conn, now)["rankCounts"].is_null());
    assert_eq!(run(&mut conn, now, 100).unwrap()["processed"], 0);
}

#[test]
fn lost_bins_fail_without_publishing_a_partial_result() {
    let mut conn = fixture();
    let now = lotto::close_time(ROUND);
    seed(&conn);
    archive_job::run(&mut conn, now).unwrap();
    draw(&conn, &[1, 2, 3, 4, 5, 6], 7);
    conn.execute(
        "DELETE FROM lotto_generation_result_combinations WHERE number_mask=?1",
        [mask(&[1, 2, 3, 4, 5, 6]).unwrap()],
    )
    .unwrap();
    assert!(run(&mut conn, now, 100).is_err());
    assert!(result(&conn, now)["rankCounts"].is_null());
    assert_eq!(result(&conn, now)["comparedGenerations"], 0);
}

#[test]
fn public_history_paginates_by_round_and_includes_the_current_open_round() {
    let mut conn = fixture();
    let now = lotto::close_time(ROUND);
    for round in ROUND - 30..=ROUND {
        conn.execute(
            "INSERT INTO lotto_draw_generation_counts(round,updated_at) VALUES (?1,0)",
            [round],
        )
        .unwrap();
    }
    for _ in 0..4 {
        archive_job::run(&mut conn, now).unwrap();
    }
    let first = history(&mut SqlStore(&conn), now, None, None).unwrap();
    assert_eq!(first["rounds"][0]["status"], "open");
    assert_eq!(first["rounds"][0]["round"], ROUND + 1);
    assert_eq!(first["rounds"].as_array().unwrap().len(), PAGE_SIZE + 1);
    let before = first["nextBeforeRound"].as_i64().unwrap();
    let second = history(&mut SqlStore(&conn), now, None, Some(before)).unwrap();
    assert!(
        second["rounds"]
            .as_array()
            .unwrap()
            .iter()
            .all(|r| r["round"].as_i64().unwrap() < before)
    );
    assert!(second["nextBeforeRound"].is_null());
    for bad in ["0", "-1", "1244", "nope", "1 OR 1=1"] {
        assert!(parse_round(Some(bad.into()), ROUND + 1).is_err());
    }
}
