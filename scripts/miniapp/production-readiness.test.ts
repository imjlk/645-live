import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
	collectProduction,
	inspectProduction,
} from "./production-readiness.mjs";

const now = 1_800_000_000_000;
const daily = "1".padStart(26, "0");
const weekly = "2".padStart(26, "0");
const ad = (id: number) => `ait.v2.live.${id.toString(16).padStart(16, "0")}`;
function ready() {
	return {
		enabled: true,
		developmentEnabled: false,
		keysReady: true,
		proxyReady: true,
		promotionsEnabled: true,
		profiles: 1,
		card: ad(1),
		inline: ad(2),
		feed: [ad(3), ad(4), ad(5)],
		placements: [
			"custom",
			"report",
			"attendance_restore",
			"generation_continue",
		].map((placement, i) => ({
			placement,
			enabled: 1,
			rewarded_group_id: ad(6 + i * 2),
			interstitial_group_id: ad(7 + i * 2),
		})),
		test: {
			configured: false,
			until: 0,
			allowedProfiles: 0,
			codes: { daily: `TEST_${daily}`, weekly: `TEST_${weekly}` },
		},
		campaigns: [
			["daily", daily, 1],
			["weekly", weekly, 50],
		].map(([kind, code, amount]) => ({
			feature_key: `ait_lotto_attendance_${kind}`,
			provider: "TOSS",
			provider_promotion_code: code,
			reward_amount: amount,
			status: "ACTIVE",
			starts_at: now - 1000,
			ends_at: now + 1000,
			budget_limit_amount: 5000,
			max_grant_count: 5000 / Number(amount),
			reserved_amount: 0,
			grant_count: 0,
		})),
		receipts: [
			{ code: `TEST_${daily}`, amount: 1, successes: 1 },
			{ code: `TEST_${weekly}`, amount: 50, successes: 1 },
		],
	};
}

test("live readiness requires both confirmed tests, budget and test access cleanup", () => {
	expect(inspectProduction(ready(), now).readyForLiveServer).toBe(true);
	for (const mutate of [
		(s: ReturnType<typeof ready>) => {
			s.receipts[1].code = "TEST_OLD_CAMPAIGN";
		},
		(s: ReturnType<typeof ready>) => {
			s.receipts[1].amount = 1;
		},
		(s: ReturnType<typeof ready>) => {
			s.campaigns[1].reserved_amount = 4951;
		},
		(s: ReturnType<typeof ready>) => {
			s.campaigns[1].grant_count = 100;
		},
		(s: ReturnType<typeof ready>) => {
			s.campaigns[1].ends_at = now;
		},
		(s: ReturnType<typeof ready>) => {
			s.test.configured = true;
		},
		(s: ReturnType<typeof ready>) => {
			s.developmentEnabled = true;
		},
		(s: ReturnType<typeof ready>) => {
			s.proxyReady = false;
		},
	]) {
		const snapshot = ready();
		mutate(snapshot);
		expect(inspectProduction(snapshot, now).readyForLiveServer).toBe(false);
	}
	const lastGrant = ready();
	lastGrant.campaigns[1].reserved_amount = 4950;
	expect(inspectProduction(lastGrant, now).readyForLiveServer).toBe(true);
});

test("test readiness is bounded to the matching campaigns and a verified account", () => {
	const snapshot = ready();
	snapshot.promotionsEnabled = false;
	snapshot.campaigns.forEach((c) => {
		c.status = "DRAFT";
	});
	snapshot.test = {
		...snapshot.test,
		configured: true,
		allowedProfiles: 1,
		until: now + 7 * 86_400_000,
	};
	expect(inspectProduction(snapshot, now).readyForPromotionTest).toBe(true);
	expect(inspectProduction(snapshot, now).readyForLiveServer).toBe(false);
	for (const until of [now, now + 7 * 86_400_000 + 1, Number.NaN]) {
		expect(
			inspectProduction({ ...snapshot, test: { ...snapshot.test, until } }, now)
				.readyForPromotionTest,
		).toBe(false);
	}
	snapshot.test.codes.weekly = `TEST_${daily}`;
	expect(inspectProduction(snapshot, now).readyForPromotionTest).toBe(false);
});

test("repeated and test advertisement groups cannot pass the rotation checks", () => {
	const snapshot = ready();
	snapshot.feed[1] = snapshot.inline;
	expect(inspectProduction(snapshot, now).adsConfigured).toBe(false);
	snapshot.feed[1] = "ait-ad-test-banner-id";
	expect(inspectProduction(snapshot, now).adsConfigured).toBe(false);
});

test("collector reads real SQLite without writes and omits secrets and identifiers", async () => {
	const depot = mkdtempSync(path.join(tmpdir(), "645-readiness-"));
	const secret = "secret-canary-never-output";
	const userId = Buffer.alloc(16, 7);
	try {
		mkdirSync(path.join(depot, "data"));
		mkdirSync(path.join(depot, "runtime"));
		const settings = {
			AIT_ENABLED: "true",
			AIT_IDENTITY_HMAC_SECRET: secret,
			AIT_IDENTITY_ENCRYPTION_KEY: secret,
			TRAILBASE_AUTH_PASSWORD_SECRET: secret,
			MTLS_PROXY_TOKEN: secret,
			MTLS_PROXY_URL: "http://645-live-toss-mtls:8787",
			AIT_PROMOTION_TEST_USER_IDS: userId.toString("base64url"),
		};
		const settingsFile = path.join(depot, "runtime/settings.json");
		writeFileSync(settingsFile, JSON.stringify(settings));
		await expect(collectProduction(depot)).rejects.toThrow();
		expect(existsSync(path.join(depot, "data/main.db"))).toBe(false);
		const db = new Database(path.join(depot, "data/main.db"));
		db.exec(
			"CREATE TABLE ait_lotto_profiles(user_id BLOB, disabled INTEGER, anonymous_key_sealed TEXT); CREATE TABLE ait_lotto_ad_placements(placement TEXT,enabled INTEGER,rewarded_group_id TEXT,interstitial_group_id TEXT); CREATE TABLE promotion_campaigns(id TEXT,feature_key TEXT,provider TEXT,provider_promotion_code TEXT,reward_amount INTEGER,status TEXT,starts_at INTEGER,ends_at INTEGER,budget_limit_amount INTEGER,max_grant_count INTEGER); CREATE TABLE ait_lotto_promotion_usage(campaign_id TEXT,reserved_amount INTEGER,grant_count INTEGER); CREATE TABLE promotion_reward_ledger(source_type TEXT,source_id TEXT,reward_amount INTEGER,status TEXT,provider TEXT,provider_status TEXT,provider_transaction_key TEXT);",
		);
		db.query("INSERT INTO ait_lotto_profiles VALUES(?,0,?)").run(
			userId,
			secret,
		);
		for (const [status, providerStatus] of [
			["pending", "GRANTED"],
			["recorded", "GRANTED"],
			["success", "PENDING"],
			["success", "GRANTED"],
		])
			db.query(
				"INSERT INTO promotion_reward_ledger VALUES('ait_lotto_promotion_test',?,1,?,'TOSS',?,?)",
			).run(`TEST_${daily}`, status, providerStatus, secret);
		db.query(
			"INSERT INTO promotion_reward_ledger VALUES('ait_lotto_promotion_test',?,1,'success','TOSS','GRANTED','')",
		).run(`TEST_${daily}`);
		db.close();
		const before = readFileSync(path.join(depot, "data/main.db"));
		let calls = 0;
		const fetcher = async (_url: URL, options: RequestInit) => {
			calls++;
			expect(options.redirect).toBe("error");
			return Response.json({ ok: true, mode: "forward", privateValue: secret });
		};
		const snapshot = await collectProduction(depot, fetcher);
		expect(snapshot.test.allowedProfiles).toBe(1);
		expect(snapshot.receipts).toEqual([
			{ code: `TEST_${daily}`, amount: 1, successes: 1 },
		]);
		expect(JSON.stringify(snapshot)).not.toContain(secret);
		expect(JSON.stringify(snapshot)).not.toContain(
			userId.toString("base64url"),
		);
		expect(readFileSync(path.join(depot, "data/main.db"))).toEqual(before);
		writeFileSync(
			settingsFile,
			JSON.stringify({
				...settings,
				MTLS_PROXY_URL: "https://unexpected.example",
			}),
		);
		expect((await collectProduction(depot, fetcher)).proxyReady).toBe(false);
		expect(calls).toBe(1);
	} finally {
		rmSync(depot, { recursive: true, force: true });
	}
});
