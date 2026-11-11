import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { revenueWindow, syncRevenue } from "./ad-revenue-sync.mjs";

const root = join(import.meta.dir, "../..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const migration = "services/trailbase/traildepot/migrations/";
function database() {
	const db = new Database(":memory:");
	db.exec("CREATE TABLE _user(id BLOB PRIMARY KEY)");
	db.exec(read(`${migration}U1793852300__generation_cadence_v4.sql`));
	db.exec(read(`${migration}U1794370000__ad_revenue_sync_status.sql`));
	return db;
}
const now = Date.parse("2026-11-11T10:00:00+09:00"),
	start = "2026-11-10",
	end = start;
const a = "ait.v2.live.7700cddda6e84a37";
const report = (value = 5) => [
	{
		groupId: a,
		report: {
			dailyReports: [{ date: start, impression: 2, estimatedEarning: value }],
		},
	},
];
const options = { start, end, fetchedAt: now };
test("KST refresh covers seven completed days across the UTC boundary", () => {
	expect(revenueWindow(Date.parse("2026-11-10T15:01:00Z"))).toEqual({
		start: "2026-11-04",
		end: "2026-11-10",
	});
});
test("preview never writes; apply is atomic, idempotent and preserves newer corrections", () => {
	const db = database();
	try {
		expect(syncRevenue(db, report(), options)).toMatchObject({
			applied: false,
			reportedRows: 1,
			missingGroupDays: 3,
		});
		expect(
			db.query("SELECT count(*) n FROM ait_lotto_ad_revenue_daily").get(),
		).toEqual({ n: 0 });
		const apply = { ...options, apply: true };
		syncRevenue(db, report(), apply);
		syncRevenue(db, report(), apply);
		expect(
			db.query("SELECT count(*) n FROM ait_lotto_ad_revenue_syncs").get(),
		).toEqual({ n: 1 });
		syncRevenue(db, report(8), { ...apply, fetchedAt: now + 1 });
		syncRevenue(db, report(1), apply);
		expect(
			db
				.query(
					"SELECT estimated_revenue_krw value FROM ait_lotto_ad_revenue_daily",
				)
				.get(),
		).toEqual({ value: 8 });
		syncRevenue(db, [{ groupId: a, report: null }], {
			...apply,
			fetchedAt: now + 2,
		});
		expect(
			db
				.query(
					"SELECT estimated_revenue_krw value FROM ait_lotto_ad_revenue_daily",
				)
				.get(),
		).toEqual({ value: 8 });
		const health = db
			.query(read("services/trailbase/sql/28-ad-revenue-collection-health.sql"))
			.all();
		expect(health).toHaveLength(4);
	} finally {
		db.close();
	}
});
test("invalid windows, unrelated reports and changed group mappings fail before any write", () => {
	const db = database();
	try {
		for (const bad of [
			{ ...options, start: "2026-11-09", end: "2026-11-09" },
			{ ...options, end: "2026-11-11" },
			{ ...options, start: "2026-02-31" },
		])
			expect(() =>
				syncRevenue(db, report(), { ...bad, apply: true }),
			).toThrow();
		expect(() =>
			syncRevenue(db, [{ groupId: "unrelated", report: null }], {
				...options,
				apply: true,
			}),
		).toThrow();
		db.exec(
			"UPDATE ait_lotto_generation_ad_groups SET variant='other' WHERE 0",
		);
		db.query("DELETE FROM ait_lotto_generation_ad_groups WHERE group_id=?").run(
			a,
		);
		expect(() =>
			syncRevenue(db, report(), { ...options, apply: true }),
		).toThrow();
		expect(
			db.query("SELECT count(*) n FROM ait_lotto_ad_revenue_daily").get(),
		).toEqual({ n: 0 });
	} finally {
		db.close();
	}
});
test("a missing import journal rolls back report writes", () => {
	const db = database();
	try {
		db.exec("DROP TABLE ait_lotto_ad_revenue_syncs");
		expect(() =>
			syncRevenue(db, report(), { ...options, apply: true }),
		).toThrow();
		expect(
			db.query("SELECT count(*) n FROM ait_lotto_ad_revenue_daily").get(),
		).toEqual({ n: 0 });
	} finally {
		db.close();
	}
});
test("purchase funnel separates missing entry, unresolved attempts and explicit cancellation", () => {
	const db = new Database(":memory:");
	try {
		db.exec(
			"ATTACH DATABASE ':memory:' AS analytics; CREATE TABLE analytics.events(name TEXT,user_id BLOB,source TEXT,props_json TEXT,server_at INTEGER)",
		);
		const insert = db.query(
			"INSERT INTO analytics.events VALUES(?,x'01','short',?,?)",
		);
		const at = Date.now() - 60_000;
		const add = (name: string, flow: string) =>
			insert.run(
				name,
				JSON.stringify({
					policy: "purchase-v1",
					placement: "ad_free_purchase",
					flow_id: flow,
				}),
				at,
			);
		add("purchase_entered", "a");
		add("purchase_opened", "a");
		add("purchase_canceled", "a");
		add("purchase_canceled", "a");
		add("purchase_entered", "b");
		add("purchase_opened", "b");
		add("purchase_succeeded", "b");
		add("purchase_entered", "c");
		add("purchase_succeeded", "orphan");
		const result = db
			.query(read("services/trailbase/sql/25-purchase-funnel.sql"))
			.get();
		expect(result).toMatchObject({
			구매진입_이용자: 1,
			구매진입_시도: 3,
			구매SDK_호출: 2,
			명시적_취소: 1,
			검증후_SDK완료: 1,
			결과미관측: 1,
			진입누락_시도: 1,
			진입대비_성공_pct: 33.3,
		});
	} finally {
		db.close();
	}
});
