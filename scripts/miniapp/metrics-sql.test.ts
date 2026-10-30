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
