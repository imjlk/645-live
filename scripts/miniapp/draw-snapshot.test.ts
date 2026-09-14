import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { importDrawSnapshot } from "./draw-snapshot.mjs";

test("repeated local snapshots and result corrections keep real trigger statistics accurate", async () => {
	const db = new Database(":memory:");
	try {
		for (const name of [
			"U1750770000__create_lotto_draw_results.sql",
			"U1750771000__create_lotto_number_stats.sql",
			"U1774670400__create_lotto_bonus_stats.sql",
		])
			db.exec(
				await Bun.file(
					resolve(
						import.meta.dir,
						"../../services/trailbase/traildepot/migrations",
						name,
					),
				).text(),
			);
		db.exec(
			"CREATE TABLE local_user_fixture (value TEXT); INSERT INTO local_user_fixture VALUES ('preserve')",
		);
		const row = (round: number, numbers: number[], bonus: number) => ({
			round,
			draw_date: "2026-09-12",
			bonus_number: bonus,
			...Object.fromEntries(numbers.map((n, i) => [`draw_number_${i + 1}`, n])),
		});
		const older = row(1240, [1, 2, 3, 4, 5, 6], 7);
		const latest = row(1241, [1, 8, 9, 10, 11, 12], 2);
		const read = () =>
			db
				.query(
					"SELECT draw_count,bonus_count,last_draw_round FROM lotto_number_stats WHERE number=1",
				)
				.get();
		expect(importDrawSnapshot(db, [latest, older]).changed).toBe(2);
		expect(read()).toEqual({
			draw_count: 2,
			bonus_count: 0,
			last_draw_round: 1241,
		});
		expect(importDrawSnapshot(db, [latest, older]).changed).toBe(0);
		expect(read()).toEqual({
			draw_count: 2,
			bonus_count: 0,
			last_draw_round: 1241,
		});
		db.exec("UPDATE lotto_number_stats SET draw_count=99,last_draw_round=1");
		importDrawSnapshot(db, [latest, older]);
		expect(read()).toEqual({
			draw_count: 2,
			bonus_count: 0,
			last_draw_round: 1241,
		});
		expect(
			importDrawSnapshot(db, [row(1241, [14, 15, 16, 17, 18, 19], 1)]).changed,
		).toBe(1);
		expect(read()).toEqual({
			draw_count: 1,
			bonus_count: 1,
			last_draw_round: 1240,
		});
		expect(
			db
				.query(
					"SELECT main_count,bonus_count,combined_count,last_bonus_round FROM lotto_bonus_number_stats WHERE number=1",
				)
				.get(),
		).toEqual({
			main_count: 1,
			bonus_count: 1,
			combined_count: 2,
			last_bonus_round: 1241,
		});
		expect(() =>
			importDrawSnapshot(db, [older, row(1242, [1, 1, 2, 3, 4, 5], 6)]),
		).toThrow("Invalid public draw numbers");
		expect(
			db.query("SELECT count(*) AS count FROM lotto_draw_results").get(),
		).toEqual({ count: 2 });
		expect(db.query("SELECT value FROM local_user_fixture").get()).toEqual({
			value: "preserve",
		});
	} finally {
		db.close();
	}
});
