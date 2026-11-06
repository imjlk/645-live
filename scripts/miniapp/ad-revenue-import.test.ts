import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { revenueImport } from "./ad-revenue-import.mjs";

const root = join(import.meta.dir, "../..");
const migration = readFileSync(
	join(
		root,
		"services/trailbase/traildepot/migrations/U1793852300__generation_cadence_v4.sql",
	),
	"utf8",
);
const query = readFileSync(
	join(root, "services/trailbase/sql/23-generation-v4-revenue.sql"),
	"utf8",
);
function database() {
	const db = new Database(":memory:");
	db.exec(
		"ATTACH DATABASE ':memory:' AS analytics; CREATE TABLE analytics.events(user_id BLOB,name TEXT,server_at INTEGER,props_json TEXT,source TEXT); PRAGMA foreign_keys=ON; CREATE TABLE _user(id BLOB PRIMARY KEY); CREATE TABLE promotion_reward_ledger(user_id BLOB,status TEXT,source_type TEXT,reward_amount INTEGER,requested_at INTEGER);",
	);
	db.exec(migration);
	return db;
}
const a = "ait.v2.live.7700cddda6e84a37",
	b = "ait.v2.live.74d57d445b6d4fd9";
const day = new Date(Date.now() + 32400000).toISOString().slice(0, 10);
const report = (groupId: string, value: number) => ({
	groupId,
	report: {
		dailyReports: [{ date: day, impression: 2, estimatedEarning: value }],
	},
});
test("console reports import idempotently, accept corrections, and never invent missing revenue", () => {
	const db = database();
	const first = revenueImport(
		[report(a, 4.5), { groupId: b, report: null }],
		1000,
	);
	expect(first.rows).toBe(1);
	db.exec(first.sql);
	db.exec(first.sql);
	let rows = db.query(query).all() as Record<string, unknown>[];
	expect(rows[0].수집상태).toBe("부분수집");
	expect(rows[0].생성광고_예상수익_원).toBeNull();
	expect(rows[0].관측된부분수익_원).toBe(4.5);
	db.exec(revenueImport([report(a, 7), report(b, 0)], 2000).sql);
	db.exec(first.sql); // Older snapshots cannot undo a later correction.
	rows = db.query(query).all() as Record<string, unknown>[];
	expect(rows[0].수집상태).toBe("수집완료");
	expect(rows[0].생성광고_예상수익_원).toBe(7);
	expect(rows[1].수집상태).toBe("미수집");
	expect(rows[1].생성광고_예상수익_원).toBeNull();
	expect(
		db.query("SELECT count(*) AS n FROM ait_lotto_ad_revenue_daily").get(),
	).toEqual({ n: 2 });
	expect(revenueImport([{ groupId: a, report: null }]).sql).not.toContain(
		"INSERT",
	);
	db.close();
});
test("report rows are validated and shared or unknown ad groups are excluded", () => {
	expect(() => revenueImport([report(a, -1)])).toThrow();
	expect(() => revenueImport([report(a, 1), report(a, 2)])).toThrow();
	expect(revenueImport([report("shared", 500)]).rows).toBe(0);
	const bad = report(a, 1);
	bad.report.dailyReports[0].date = "2026-02-31";
	expect(() => revenueImport([bad])).toThrow();
	const db = database();
	// Every migration-owned group is accepted; arm attribution lives in server data.
	const ids = db
		.query("SELECT group_id FROM ait_lotto_generation_ad_groups")
		.all() as { group_id: string }[];
	expect(revenueImport(ids.map((x) => report(x.group_id, 0))).rows).toBe(4);
	db.close();
});

test("cohort queries keep receipt-time observations and stop costs at the next phase", () => {
	const db = database();
	db.exec(
		"CREATE TABLE ait_lotto_attendance(user_id BLOB,created_at INTEGER); CREATE TABLE ad_skip_ticket_redemptions(user_id BLOB,placement TEXT,consumed INTEGER,created_at INTEGER);",
	);
	const entered = Date.now() - 3 * 86400000;
	db.exec(
		`INSERT INTO _user VALUES(x'01'); INSERT INTO ait_lotto_generation_experiment_enrollments VALUES(x'01','generation-cadence-v4','control',${entered});`,
	);
	const event = db.prepare(
		"INSERT INTO analytics.events VALUES(x'01',?,?,?,'control')",
	);
	const props = JSON.stringify({
		policy: "generation-cadence-v4/control:device:1-3:2-8",
	});
	event.run("experiment_exposed", entered + 1, props);
	event.run("generation_succeeded", entered + 2, props);
	event.run("completed", entered + 3, props);
	event.run("experiment_exposed", entered + 86400000, props);
	const next = Date.now() - 60000;
	event.run(
		"experiment_exposed",
		next,
		JSON.stringify({ policy: "generation-cadence-v3/control:device:5-8:5-8" }),
	);
	event.run("completed", next + 1, props);
	db.exec(
		`INSERT INTO ait_lotto_attendance VALUES(x'01',${entered + 10}); INSERT INTO promotion_reward_ledger VALUES(x'01','success','ait_lotto_attendance_daily',1,${next - 10}),(x'01','success','ait_lotto_attendance_weekly',50,${next + 10});`,
	);
	const summary = db
		.query(
			readFileSync(
				join(root, "services/trailbase/sql/22-generation-v4-summary.sql"),
				"utf8",
			),
		)
		.get() as Record<string, unknown>;
	expect(summary.등록이용자).toBe(1);
	expect(summary.관측생성수).toBe(1);
	expect(summary.SDK광고완료).toBe(1);
	expect(summary.출석완료_이용자일수).toBe(1);
	expect(summary.D1평가이용자).toBe(1);
	expect(summary.D1재방문율).toBe(100);
	expect(summary.D7재방문율).toBeNull();
	const costs = db.query(query).all() as Record<string, unknown>[];
	expect(
		costs.reduce((sum, row) => sum + Number(row.출석포인트_지급성공액), 0),
	).toBe(1);
	event.run("experiment_exposed", next + 20, props);
	db.exec(
		`INSERT INTO promotion_reward_ledger VALUES(x'01','success','ait_lotto_attendance_daily',2,${next + 30});`,
	);
	const returned = db.query(query).all() as Record<string, unknown>[];
	expect(
		returned.reduce((sum, row) => sum + Number(row.출석포인트_지급성공액), 0),
	).toBe(3);

	db.close();
});

test("skip efficiency uses enrolled server activity without SDK events and waits for complete days and revenue", () => {
	const db = database();
	const day0 = Date.parse("2026-11-06T00:00:00+09:00");
	const tomorrow = day0 + 86_400_000;
	db.exec(`
		CREATE TABLE ait_lotto_generation_requests(user_id BLOB,created_at INTEGER);
		CREATE TABLE ait_lotto_attendance(user_id BLOB,created_at INTEGER);
		CREATE TABLE ad_skip_ticket_grants(user_id BLOB,created_at INTEGER,cause TEXT,quantity INTEGER);
		CREATE TABLE ad_skip_opportunities(user_id BLOB,resolved_at INTEGER,placement TEXT,resolution TEXT);
		INSERT INTO _user VALUES (x'01'),(x'02'),(x'03');
		INSERT INTO ait_lotto_generation_experiment_enrollments VALUES
		  (x'01','generation-cadence-v4','control',${day0 + 100}),
		  (x'02','generation-cadence-v4','control',${day0}),
		  (x'03','generation-cadence-v4','short',${day0});
		INSERT INTO ad_skip_ticket_grants VALUES (x'01',${day0 + 101},'streak_bonus',3);
		INSERT INTO ad_skip_opportunities VALUES
		  (x'01',${day0 + 1},'generation_continue','TICKET'),
		  (x'01',${day0 + 105},'generation_continue','TICKET'),
		  (x'01',${day0 + 110},'generation_continue','AD'),
		  (x'01',${day0 + 115},'generation_continue','FREE'),
		  (x'01',${day0 + 120},'report','TICKET');
		INSERT INTO ait_lotto_generation_requests VALUES (x'01',${tomorrow}), (x'01',${tomorrow + 1});
		INSERT INTO ait_lotto_ad_revenue_daily VALUES ('2026-11-06','${a}',2,5,1000);
	`);
	const sql = readFileSync(
		join(root, "services/trailbase/sql/24-generation-v4-skip-efficiency.sql"),
		"utf8",
	);
	function controlOnSixth(now: string) {
		const rows = db.query(sql.replaceAll("'now'", `'${now}'`)).all() as Record<
			string,
			unknown
		>[];
		return rows.find(
			(row) => row.한국시간_날짜 === "2026-11-06" && row.실험군 === "control",
		);
	}
	expect(controlOnSixth("2026-11-07 14:59:59")).toMatchObject({
		서버활동자: 2,
		SDK노출자: 0,
		출석발급장수: 3,
		생성스킵_사용자: 1,
		활동자_사용률_pct: 50,
		생성스킵_장수: 1,
		광고로_해결: 1,
		무료로_해결: 1,
		해결중_스킵선택_pct: 50,
		생성광고_예상수익_원: null,
		D1_pct: null,
		D7_pct: null,
	});
	db.exec(
		`INSERT INTO ait_lotto_ad_revenue_daily VALUES ('2026-11-06','${b}',0,0,1000)`,
	);
	expect(controlOnSixth("2026-11-07 15:00:00")).toMatchObject({
		생성광고_예상수익_원: 5,
		활동자당_생성수익_원: 2.5,
		D1_재방문자: 1,
		D1_pct: 50,
		D7_pct: null,
	});
	expect(controlOnSixth("2026-11-13 15:00:00")?.D7_pct).toBe(0);
	db.close();
});
