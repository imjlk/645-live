import { Database } from "bun:sqlite";
import { parseArgs } from "node:util";

/** A consistent local snapshot, never a provider balance or permission to retry payouts/messages. */
export function readOperations(db, asOf = Date.now()) {
	if (!Number.isSafeInteger(asOf) || asOf <= 0)
		throw new Error("Invalid snapshot time");
	return db.transaction(() => {
		const campaigns = db
			.query(
				"SELECT * FROM ait_lotto_ops_campaigns ORDER BY feature_key, starts_at DESC",
			)
			.all()
			.map((row) => ({
				...row,
				remaining_local_budget:
					row.budget_limit_amount === null
						? null
						: Math.max(0, row.budget_limit_amount - row.committed_amount),
				active_window:
					row.status === "ACTIVE" &&
					row.starts_at <= asOf &&
					row.ends_at > asOf,
			}));
		const rewards = db
			.query("SELECT * FROM ait_lotto_ops_rewards ORDER BY source_type,status")
			.all();
		const notifications = db
			.query("SELECT * FROM ait_lotto_ops_notifications ORDER BY status")
			.all();
		const watches = db.query("SELECT * FROM ait_lotto_ops_watches").get();
		const attention = [];
		for (const [index, c] of campaigns.entries()) {
			if (
				c.active_window &&
				(c.remaining_local_budget < c.reward_amount ||
					(c.max_grant_count !== null &&
						c.reserved_grants >= c.max_grant_count))
			)
				attention.push({
					code: "campaign_local_limit_reached",
					campaign_index: index,
				});
			if (
				c.budget_limit_amount !== null &&
				c.committed_amount > c.budget_limit_amount
			)
				attention.push({
					code: "campaign_over_local_limit",
					campaign_index: index,
				});
		}
		for (const r of rewards) {
			if (
				r.status === "pending" &&
				(r.missing_campaign_records > 0 || asOf - r.oldest_created_at > 600000)
			)
				attention.push({
					code: "reward_needs_review",
					source: r.source_type,
					group_records: r.records,
				});
			if (r.status === "failed")
				attention.push({
					code: "reward_failed",
					source: r.source_type,
					records: r.records,
				});
		}
		for (const n of notifications) {
			if (
				n.status === "LOCKED" &&
				n.oldest_locked_at !== null &&
				asOf - n.oldest_locked_at > 600000
			)
				attention.push({
					code: "notification_stale_lock",
					group_records: n.records,
				});
			if (n.status === "READY" && asOf - n.oldest_due_at > 600000)
				attention.push({
					code: "notification_overdue",
					group_records: n.records,
				});
			if (n.status === "FAILED")
				attention.push({ code: "notification_failed", records: n.records });
			if (n.unknown_outcome_records > 0)
				attention.push({
					code: "notification_outcome_unknown",
					records: n.unknown_outcome_records,
				});
		}
		return {
			as_of: new Date(asOf).toISOString(),
			scope: "local_ledger_snapshot",
			campaigns,
			rewards,
			notifications,
			watches,
			attention,
		};
	})();
}

export function readOperationsFile(file, asOf = Date.now()) {
	const db = new Database(file, { readonly: true });
	try {
		return readOperations(db, asOf);
	} finally {
		db.close();
	}
}
if (import.meta.main) {
	try {
		const { values } = parseArgs({
			args: process.argv.slice(2),
			options: {
				database: { type: "string" },
				"as-of": { type: "string" },
				"fail-on-attention": { type: "boolean", default: false },
			},
		});
		if (!values.database) throw new Error("Database path required");
		const report = readOperationsFile(
			values.database,
			values["as-of"] === undefined ? Date.now() : Number(values["as-of"]),
		);
		console.log(JSON.stringify(report, null, 2));
		if (values["fail-on-attention"] && report.attention.length)
			process.exitCode = 2;
	} catch {
		console.error(
			"Operations report unavailable. Use --database <consistent SQLite backup> after applying the operations migration; --as-of accepts Unix milliseconds.",
		);
		process.exitCode = 1;
	}
}
