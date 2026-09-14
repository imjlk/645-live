import { readFileSync } from "node:fs";
import path from "node:path";

const FEATURES = ["custom", "report", "attendance_restore"];
const REWARDS = { daily: 1, weekly: 50 };
const WEEK = 7 * 86_400_000;
const split = (value = "") =>
	value
		.split(",")
		.map((v) => v.trim())
		.filter(Boolean);
const liveCode = (value) =>
	typeof value === "string" && /^[A-Z0-9]{26}$/.test(value);
const liveAd = (value) =>
	typeof value === "string" && /^ait\.(?:v2\.)?live\.[a-zA-Z0-9]+$/.test(value);

// This report deliberately contains no credentials, identities, or provider payloads.
export function inspectProduction(snapshot, now = Date.now()) {
	const checks = [];
	const check = (code, ok) => {
		checks.push({ code, ok: Boolean(ok) });
		return Boolean(ok);
	};
	const runtimeReady = [
		check("miniapp_enabled", snapshot.enabled),
		check("development_bypasses_disabled", !snapshot.developmentEnabled),
		check("identity_keys_configured", snapshot.keysReady),
		check("private_proxy_forward_health", snapshot.proxyReady),
	].every(Boolean);
	const placementIds = FEATURES.flatMap((feature) => {
		const p = snapshot.placements.find((p) => p.placement === feature);
		return [p?.rewarded_group_id, p?.interstitial_group_id];
	});
	const adIds = [
		snapshot.card,
		snapshot.inline,
		...snapshot.feed,
		...placementIds,
	];
	const configuredAdIds = adIds.filter(
		(id) => typeof id === "string" && id.trim(),
	);
	const adsConfigured = [
		check(
			"all_live_ad_groups_configured",
			snapshot.feed.length >= 3 && adIds.every(liveAd),
		),
		check(
			"ad_groups_are_distinct",
			new Set(configuredAdIds).size === configuredAdIds.length,
		),
		check(
			"ad_placements_enabled",
			FEATURES.every((feature) =>
				snapshot.placements.some(
					(p) => p.placement === feature && p.enabled === 1,
				),
			),
		),
	].every(Boolean);
	const until = snapshot.test.until;
	const testAccessValid = [
		check("verified_test_account_available", snapshot.test.allowedProfiles > 0),
		check(
			"test_window_valid",
			Number.isSafeInteger(until) && until > now && until - now <= WEEK,
		),
	].every(Boolean);
	let campaignsConfigured = true;
	let promotionsVerified = true;
	let testCodesValid = true;
	for (const [kind, amount] of Object.entries(REWARDS)) {
		const candidates = snapshot.campaigns.filter(
			(c) => c.feature_key === `ait_lotto_attendance_${kind}`,
		);
		// Match the backend's active-window selection before inspecting drafts.
		const campaign =
			candidates.find(
				(c) => c.status === "ACTIVE" && c.starts_at <= now && c.ends_at > now,
			) ?? candidates[0];
		const configured = check(
			`${kind}_campaign_configured`,
			campaign &&
				liveCode(campaign.provider_promotion_code) &&
				campaign.provider === "TOSS" &&
				campaign.reward_amount === amount &&
				campaign.budget_limit_amount === 5000 &&
				Number.isSafeInteger(campaign.starts_at) &&
				Number.isSafeInteger(campaign.ends_at) &&
				campaign.starts_at <= now &&
				campaign.ends_at > now &&
				campaign.starts_at < campaign.ends_at &&
				campaign.max_grant_count === 5000 / amount,
		);
		campaignsConfigured = configured && campaignsConfigured;
		const expectedTestCode = `TEST_${campaign?.provider_promotion_code}`;
		testCodesValid =
			check(
				`${kind}_test_code_matches_campaign`,
				configured && snapshot.test.codes[kind] === expectedTestCode,
			) && testCodesValid;
		const tested = check(
			`${kind}_test_grant_confirmed`,
			configured &&
				snapshot.receipts.some(
					(r) =>
						r.code === expectedTestCode &&
						r.amount === amount &&
						r.successes > 0,
				),
		);
		const active = check(
			`${kind}_campaign_active_with_budget`,
			configured &&
				campaign.status === "ACTIVE" &&
				campaign.reserved_amount + amount <= campaign.budget_limit_amount &&
				campaign.grant_count < campaign.max_grant_count,
		);
		promotionsVerified = tested && active && promotionsVerified;
	}
	const testAccessRemoved = check(
		"temporary_test_access_removed",
		!snapshot.test.configured && !snapshot.test.until,
	);
	const promotionsEnabled = check(
		"live_promotions_enabled",
		snapshot.promotionsEnabled,
	);
	return {
		runtimeReady,
		adsConfigured,
		campaignsConfigured,
		readyForPromotionTest: runtimeReady && testAccessValid && testCodesValid,
		readyForLiveServer:
			runtimeReady &&
			adsConfigured &&
			promotionsVerified &&
			promotionsEnabled &&
			testAccessRemoved,
		verifiedProfiles: snapshot.profiles,
		checks,
		consoleChecksRequired: [
			"ad_group_serving_status",
			"promotion_test_status",
			"app_review",
		],
	};
}

export async function collectProduction(depot, fetcher = fetch) {
	const settings = JSON.parse(
		readFileSync(path.join(depot, "runtime/settings.json"), "utf8"),
	);
	const { Database } = await import("bun:sqlite");
	const db = new Database(path.join(depot, "data/main.db"), {
		readonly: true,
		create: false,
	});
	try {
		const testers = split(settings.AIT_PROMOTION_TEST_USER_IDS);
		let allowedProfiles = 0;
		const testerQuery = db.query(
			"SELECT count(*) AS count FROM ait_lotto_profiles WHERE user_id=? AND disabled=0 AND anonymous_key_sealed IS NOT NULL",
		);
		for (const id of new Set(testers)) {
			if (
				/^[A-Za-z0-9_-]{22}$/.test(id) &&
				Buffer.from(id, "base64url").toString("base64url") === id
			)
				allowedProfiles += testerQuery.get(Buffer.from(id, "base64url")).count;
		}
		const snapshot = {
			enabled: settings.AIT_ENABLED === "true",
			developmentEnabled: [
				"AIT_LOCAL_PREVIEW",
				"AIT_ALLOW_DEV_IDENTITY",
				"AIT_TEST_ADS",
			].some((k) => settings[k] === "true"),
			keysReady: [
				"AIT_IDENTITY_HMAC_SECRET",
				"AIT_IDENTITY_ENCRYPTION_KEY",
				"TRAILBASE_AUTH_PASSWORD_SECRET",
			].every((k) => Boolean(settings[k]?.trim())),
			promotionsEnabled: settings.AIT_PROMOTIONS_ENABLED === "true",
			proxyReady: false,
			card: settings.AIT_BANNER_CARD_GROUP_ID,
			inline:
				settings.AIT_BANNER_INLINE_GROUP_ID || settings.AIT_BANNER_GROUP_ID,
			feed: split(settings.AIT_FEED_INLINE_GROUP_IDS).slice(0, 20),
			placements: db
				.query(
					"SELECT placement,enabled,rewarded_group_id,interstitial_group_id FROM ait_lotto_ad_placements",
				)
				.all(),
			profiles: db
				.query(
					"SELECT count(*) AS count FROM ait_lotto_profiles WHERE disabled=0 AND anonymous_key_sealed IS NOT NULL",
				)
				.get().count,
			test: {
				allowedProfiles,
				configured:
					testers.length > 0 ||
					Boolean(settings.AIT_PROMOTION_TEST_UNTIL?.trim()),
				until: Number(settings.AIT_PROMOTION_TEST_UNTIL || 0),
				codes: {
					daily: settings.AIT_PROMOTION_TEST_DAILY_CODE,
					weekly: settings.AIT_PROMOTION_TEST_WEEKLY_CODE,
				},
			},
			campaigns: db
				.query(
					"SELECT c.feature_key,c.provider,c.provider_promotion_code,c.reward_amount,c.status,c.starts_at,c.ends_at,c.budget_limit_amount,c.max_grant_count,coalesce(u.reserved_amount,0) AS reserved_amount,coalesce(u.grant_count,0) AS grant_count FROM promotion_campaigns c LEFT JOIN ait_lotto_promotion_usage u ON u.campaign_id=c.id WHERE c.feature_key IN ('ait_lotto_attendance_daily','ait_lotto_attendance_weekly') ORDER BY c.starts_at DESC,c.id DESC",
				)
				.all(),
			receipts: db
				.query(
					"SELECT source_id AS code,reward_amount AS amount,count(*) AS successes FROM promotion_reward_ledger WHERE source_type='ait_lotto_promotion_test' AND status='success' AND provider='TOSS' AND provider_status='GRANTED' AND length(trim(provider_transaction_key)) > 0 GROUP BY source_id,reward_amount",
				)
				.all(),
		};
		if (settings.MTLS_PROXY_URL && settings.MTLS_PROXY_TOKEN) {
			try {
				const url = new URL(settings.MTLS_PROXY_URL);
				// Never send the private bearer token to an arbitrary configured host or redirect.
				if (
					url.origin === "http://645-live-toss-mtls:8787" &&
					!url.username &&
					!url.password &&
					url.pathname === "/" &&
					!url.search &&
					!url.hash
				) {
					const response = await fetcher(
						new URL("/internal/apps-in-toss/health", url),
						{
							headers: { authorization: `Bearer ${settings.MTLS_PROXY_TOKEN}` },
							redirect: "error",
							signal: AbortSignal.timeout(5000),
						},
					);
					const body = await response.json();
					snapshot.proxyReady =
						response.ok && body.ok === true && body.mode === "forward";
				}
			} catch {
				/* An unavailable proxy is reported without exposing error payloads. */
			}
		}
		return snapshot;
	} finally {
		db.close();
	}
}

if (import.meta.main) {
	const args = process.argv.slice(2);
	if (args.includes("--help")) {
		console.log(
			"bun production-readiness.mjs [--depot /app/traildepot] [--require test|live]\nRead-only server checks. No grants, configuration changes, or credentials in output. Console serving status and app review require separate verification.",
		);
	} else {
		try {
			const options = new Map();
			for (let i = 0; i < args.length; i += 2) {
				if (!["--depot", "--require"].includes(args[i]) || !args[i + 1])
					throw new Error("Invalid arguments");
				options.set(args[i], args[i + 1]);
			}
			const required = options.get("--require");
			if (required && !["test", "live"].includes(required))
				throw new Error("Invalid phase");
			const report = inspectProduction(
				await collectProduction(
					options.get("--depot") ||
						process.env.TRAILDEPOT_PATH ||
						"/app/traildepot",
				),
			);
			console.log(JSON.stringify(report, null, 2));
			if (
				required &&
				!report[
					required === "test" ? "readyForPromotionTest" : "readyForLiveServer"
				]
			)
				process.exitCode = 2;
		} catch {
			console.error(
				JSON.stringify({
					error: "READINESS_CHECK_FAILED",
					hint: "Check arguments, depot access, and applied miniapp migrations. Use --help for usage.",
				}),
			);
			process.exitCode = 2;
		}
	}
}
