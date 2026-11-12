import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "../..");
test("saved metrics SQL separates mature conversion windows and counts each paid ledger row once", () => {
	const db = new Database(":memory:");
	db.exec("ATTACH DATABASE ':memory:' AS analytics");
	db.exec(
		readFileSync(
			join(
				root,
				"services/trailbase/traildepot/migrations/analytics/U1793318400__generation_metrics.sql",
			),
			"utf8",
		)
			.replaceAll("IF NOT EXISTS events", "IF NOT EXISTS analytics.events")
			.replaceAll(
				"INDEX IF NOT EXISTS idx_",
				"INDEX IF NOT EXISTS analytics.idx_",
			),
	);
	db.exec(
		"CREATE TABLE promotion_reward_ledger(user_id BLOB,status TEXT,reward_amount INTEGER,requested_at INTEGER,granted_at INTEGER)",
	);
	const at = Date.now() - 600000;
	const insert = db.prepare(
		"INSERT INTO analytics.events(name,source,user_id,client_at,server_at,props_json) VALUES(?,'short',x'01',?,?,?)",
	);
	const props = JSON.stringify({
		policy: "generation-cadence-v2/short:device:1-3:2-8",
		session_id: "s",
		flow_id: "f",
		app_version: "1.6.0",
	});
	for (const name of [
		"experiment_exposed",
		"cta_viewed",
		"requested",
		"shown",
		"completed",
		"generation_completed",
	])
		insert.run(name, at, at, props);
	db.exec(
		`INSERT INTO promotion_reward_ledger VALUES(x'01','success',3,${at + 1000},${at + 1000}),(x'01','success',1,${at + 2000},NULL),(x'01','success',50,${at - 1000},${at + 1000}),(x'01','pending',99,${at + 1000},NULL)`,
	);
	const query = (name: string) =>
		db
			.query(readFileSync(join(root, "services/trailbase/sql", name), "utf8"))
			.all() as Record<string, unknown>[];
	const funnel = query("11-generation-ab-funnel.sql")[0];
	expect(funnel.평가가능_CTA수).toBe(1);
	expect(funnel.오분내_생성미완료율).toBe(0);
	expect(funnel.표시대비_완료율).toBe(100);
	expect(query("12-generation-ab-retention.sql")[0].D1_재방문율).toBeNull();
	// Successful three-step payouts may have no provider-supplied granted_at.
	// A request made before enrollment stays outside this cohort even if paid later.
	const cost = query("13-generation-ab-cost.sql")[0];
	expect(cost.지급성공금액).toBe(4);
	expect(cost.지급성공건수).toBe(2);

	// A quick tap can occur before the viewport's one-second impression fires.
	db.exec("DELETE FROM analytics.events WHERE name='cta_viewed'");
	const immediate = query("11-generation-ab-funnel.sql")[0];
	expect(immediate.평가가능_CTA수).toBe(1);
	expect(immediate.광고완료수).toBe(1);
	expect(immediate.오분내_생성미완료율).toBe(0);
	db.exec("UPDATE analytics.events SET client_at=unixepoch('now')*1000");
	expect(query("11-generation-ab-funnel.sql")[0].평가가능_CTA수).toBe(0);
	// Preserve legacy cohorts, but stop cost attribution at the next phase.
	db.exec(`UPDATE analytics.events SET client_at=${at}`);
	const nextProps = JSON.stringify({
		...JSON.parse(props),
		policy: "generation-cadence-v3/short:device:1-3:2-8",
		app_version: "1.7.0",
	});
	insert.run("experiment_exposed", at + 3000, at + 3000, nextProps);
	db.exec(
		`INSERT INTO promotion_reward_ledger VALUES(x'01','success',2,${at + 4000},NULL)`,
	);
	const phased = query("13-generation-ab-cost.sql");
	expect(phased.map((row) => [row.실험, row.지급성공금액])).toEqual([
		["generation-cadence-v2", 4],
		["generation-cadence-v3", 2],
	]);
	expect(
		query("11-generation-ab-funnel.sql").find(
			(row) => row.실험 === "generation-cadence-v3",
		)?.평가가능_CTA수,
	).toBe(0);
	db.exec(
		"CREATE TABLE ait_lotto_attendance(user_id BLOB,day INTEGER,created_at INTEGER)",
	);
	const day = Math.floor((at + 3000 + 32400000) / 86400000);
	db.exec(`INSERT INTO ait_lotto_attendance VALUES(x'01',${day},${at + 4000})`);
	expect(query("14-attendance-ab-conversion.sql")[0].관측_출석완료율).toBe(100);
	db.exec(`UPDATE ait_lotto_attendance SET created_at=${at + 1000}`);
	const preexisting = query("14-attendance-ab-conversion.sql")[0];
	expect(preexisting.참여전_출석완료자).toBe(1);
	expect(preexisting.평가가능_이용자).toBe(0);
	expect(preexisting.관측_출석완료율).toBeNull();
	db.close();
});

test("journey reporting distinguishes enrollment cohorts and ticket/free purchases from ad success", () => {
	const db = new Database(":memory:");
	try {
		db.exec(
			"ATTACH DATABASE ':memory:' AS analytics; CREATE TABLE analytics.events(name TEXT,user_id BLOB,source TEXT,props_json TEXT,server_at INTEGER); CREATE TABLE ait_lotto_generation_experiment_enrollments(user_id BLOB,experiment TEXT,enrolled_at INTEGER)",
		);
		const at = Date.parse("2026-11-08T10:00:00+09:00");
		db.query(
			"INSERT INTO ait_lotto_generation_experiment_enrollments VALUES(x'01','generation-cadence-v4',?)",
		).run(at);
		const insert = db.query(
			"INSERT INTO analytics.events VALUES(?,x'01','control',?,?)",
		);
		const add = (name: string, flow: string, outcome = "", time = at) =>
			insert.run(
				name,
				JSON.stringify({
					policy: "journey-v1",
					placement: "app_journey",
					flow_id: flow,
					outcome,
				}),
				time,
			);
		add("journey_entered", "entry");
		add("journey_generation_started", "ticket", "ticket");
		add("journey_generation_finished", "ticket", "ticket");
		add("journey_generation_finished", "ticket", "ticket");
		add("journey_generation_started", "owned", "ad_free");
		add("journey_generation_finished", "owned", "ad_free");
		add("journey_attendance_succeeded", "check");
		add("journey_entered", "next", "", at + 86400000);
		const query = readFileSync(
			join(root, "services/trailbase/sql/27-generation-attendance-journey.sql"),
			"utf8",
		).replaceAll("'now'", "'2026-11-11 01:00:00'");
		const rows = db.query(query).all() as Record<string, unknown>[];
		expect(rows.find((r) => r.한국시간_날짜 === "2026-11-08")).toMatchObject({
			배정구분: "v4신규배정",
			관측이용자: 1,
			생성성공수: 2,
			광고경로_생성: 0,
			스킵경로_생성: 1,
			광고제거구매자_생성: 1,
			출석성공자: 1,
			D1_재방문자: 1,
			D1_pct: 100,
		});
		expect(rows.find((r) => r.한국시간_날짜 === "2026-11-09")?.배정구분).toBe(
			"이전배정",
		);
	} finally {
		db.close();
	}
});

test("purchase funnel keeps presentation-only visitors out of unresolved checkouts and splits entry paths", () => {
	const db = new Database(":memory:");
	db.exec(
		"ATTACH DATABASE ':memory:' AS analytics; CREATE TABLE analytics.events(name TEXT,source TEXT,user_id BLOB,server_at INTEGER,props_json TEXT)",
	);
	const put = (name: string, flow: string, entry = "attendance") =>
		db.query("INSERT INTO analytics.events VALUES(?,'short',x'01',?,?)").run(
			name,
			Date.now(),
			JSON.stringify({
				placement: "ad_free_purchase",
				policy: "purchase-v1",
				flow_id: flow,
				entry_point: entry,
				app_version: "fixture",
			}),
		);
	put("purchase_info_viewed", "view");
	put("purchase_cta_viewed", "view");
	put("purchase_button_clicked", "click");
	put("purchase_button_clicked", "click");
	put("purchase_entered", "cancel");
	put("purchase_opened", "cancel");
	put("purchase_canceled", "cancel");
	put("purchase_entered", "success");
	put("purchase_succeeded", "success");
	put("purchase_info_viewed", "settings-only", "settings");
	const rows = db
		.query(
			readFileSync(
				join(root, "services/trailbase/sql/25-purchase-funnel.sql"),
				"utf8",
			),
		)
		.all() as Record<string, unknown>[];
	const attendance = rows.find((r) => r.진입경로 === "attendance");
	expect(attendance).toMatchObject({
		상품안내_관측이용자: 1,
		가격버튼_관측이용자: 1,
		구매버튼_클릭수: 1,
		구매진입_시도: 2,
		명시적_취소: 1,
		검증후_SDK완료: 1,
		결과미관측: 0,
		진입누락_시도: 0,
		진입대비_성공_pct: 50,
	});
	expect(rows.find((r) => r.진입경로 === "settings")).toMatchObject({
		구매진입_시도: 0,
		결과미관측: 0,
		진입누락_시도: 0,
		진입대비_성공_pct: null,
	});
	db.close();
});
