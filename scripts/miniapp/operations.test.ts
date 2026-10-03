import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { readOperations, readOperationsFile } from "./operations.mjs";

const root = resolve(import.meta.dir, "../..");
const migration = readFileSync(
	join(
		root,
		"services/trailbase/traildepot/migrations/U1791020000__miniapp_operations_views.sql",
	),
	"utf8",
);
const now = 1791010000000;
function setup(file = ":memory:") {
	const db = new Database(file);
	const source = readFileSync(
		join(
			root,
			"services/trailbase/traildepot/migrations/U1789314000__miniapp_lotto.sql",
		),
		"utf8",
	);
	db.exec(
		"PRAGMA foreign_keys=ON;CREATE TABLE _user(id BLOB PRIMARY KEY);CREATE TABLE lotto_draw_results(round INTEGER PRIMARY KEY);CREATE TABLE ait_lotto_result_watches(user_id BLOB,round INTEGER,created_at INTEGER)",
	);
	db.exec(
		source.slice(
			source.indexOf(
				"-- Kit functional ledger template: message_outbox.core.sql",
			),
		),
	);
	db.exec(
		readFileSync(
			join(
				root,
				"services/trailbase/traildepot/migrations/U1789322000__miniapp_promotion_accounting.sql",
			),
			"utf8",
		),
	);
	db.exec(
		readFileSync(
			join(
				root,
				"services/trailbase/traildepot/migrations/U1789900000__promotion_ledger_three_step.sql",
			),
			"utf8",
		),
	);
	db.exec("INSERT INTO _user VALUES (x'01')");
	db.query(
		"INSERT INTO promotion_campaigns(id,feature_key,provider_promotion_code,reward_amount,status,starts_at,ends_at,budget_limit_amount,created_at,updated_at) VALUES ('daily','ait_lotto_attendance_daily','private-code',1,'ACTIVE',?1,?2,5000,?1,?1)",
	).run(now - 1000, now + 86400000);
	db.exec("INSERT INTO ait_lotto_promotion_usage VALUES ('daily',4999,4999)");
	const rewards = db.query(
		"INSERT INTO promotion_reward_ledger(id,user_id,campaign_id,source_type,reward_amount,status,provider_request_id,provider_transaction_key,requested_at,created_at,updated_at,protocol,execution_started_at) VALUES (?1,x'01',?2,?3,1,'pending',?1,'private-transaction',?4,?4,?4,'three-step',?4)",
	);
	rewards.run("reward", "daily", "ait_lotto_attendance_daily", now - 700000);
	rewards.run("other", "daily", "other_app", now - 700000);
	const messages = db.query(
		"INSERT INTO message_outbox(id,user_id,toss_user_key_hmac,toss_user_key_sealed,purpose,template_code,payload_json,idempotency_key,status,provider_request_id,not_before_at,created_at,updated_at,failure_reason) VALUES (?1,x'01','private-hmac','private-seal','FUNCTIONAL','private-template','{}',?1,?2,?3,?4,?4,?4,?5)",
	);
	messages.run(
		"message",
		"FAILED",
		"ait-result-1243-private",
		now - 700000,
		"delivery_outcome_unknown",
	);
	messages.run(
		"unrelated",
		"FAILED",
		"other-app-private",
		now - 700000,
		"raw-sensitive-error",
	);
	db.query("INSERT INTO ait_lotto_result_watches VALUES (x'01',1243,?1)").run(
		now - 1000,
	);
	db.exec("INSERT INTO lotto_draw_results VALUES (1243)");
	return db;
}
test("operations migration preserves ledgers, excludes private identifiers and scopes app records", () => {
	const db = setup();
	try {
		const before = db
			.query("SELECT count(*) AS total FROM promotion_reward_ledger")
			.get();
		db.exec(migration);
		expect(
			db.query("SELECT count(*) AS total FROM promotion_reward_ledger").get(),
		).toEqual(before);
		const report = readOperations(db, now);
		expect(report.campaigns[0].remaining_local_budget).toBe(1);
		expect(report.rewards).toHaveLength(1);
		expect(report.notifications).toHaveLength(1);
		expect(report.watches.result_available_records).toBe(1);
		expect(report.attention.map((a: { code: string }) => a.code)).toContain(
			"reward_needs_review",
		);
		expect(report.attention.map((a: { code: string }) => a.code)).toContain(
			"notification_outcome_unknown",
		);
		expect(JSON.stringify(report)).not.toContain("private-");
		expect(JSON.stringify(report)).not.toContain("sensitive");
		db.exec("DELETE FROM _user");
		expect(readOperations(db, now).campaigns[0].committed_amount).toBe(4999);
		expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
		const config = readFileSync(
			join(root, "services/trailbase/traildepot/config.textproto"),
			"utf8",
		);
		expect(config).not.toContain("ait_lotto_ops_");
	} finally {
		db.close();
	}
});
test("file reporting cannot modify the database and reports exhausted local limits", () => {
	const folder = mkdtempSync(join(tmpdir(), "lotto-ops-"));
	const file = join(folder, "snapshot.db");
	try {
		const db = setup(file);
		db.exec(migration);
		db.exec("UPDATE ait_lotto_promotion_usage SET reserved_amount=5000");
		db.close();
		const before = readFileSync(file);
		const report = readOperationsFile(file, now);
		expect(report.attention.map((a: { code: string }) => a.code)).toContain(
			"campaign_local_limit_reached",
		);
		expect(readFileSync(file)).toEqual(before);
		const cli = Bun.spawnSync([
			process.execPath,
			join(import.meta.dir, "operations.mjs"),
			"--database",
			file,
			"--as-of",
			String(now),
			"--fail-on-attention",
		]);
		expect(cli.exitCode).toBe(2);
		expect(JSON.parse(cli.stdout.toString())).toEqual(report);
		expect(readFileSync(file)).toEqual(before);
		const readonly = new Database(file, { readonly: true });
		try {
			expect(() => readonly.exec("DELETE FROM promotion_campaigns")).toThrow();
		} finally {
			readonly.close();
		}
	} finally {
		rmSync(folder, { recursive: true, force: true });
	}
});
