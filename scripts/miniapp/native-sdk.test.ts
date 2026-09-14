import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { createContext, runInContext } from "node:vm";
import graniteConfig from "../../apps/toss/granite.config";

const require = createRequire(import.meta.url);
const graniteRequire = createRequire(
	require.resolve("@granite-js/react-native"),
);
const mpackRoot = path.dirname(
	graniteRequire.resolve("@granite-js/mpack/package.json"),
);
const mpackRequire = createRequire(path.join(mpackRoot, "package.json"));
const sdkPath = require.resolve("trailbase");

test("the production-transformed SDK refreshes expired sessions and preserves 64-bit JSON values", async () => {
	const source = readFileSync(sdkPath, "utf8");
	// Use Granite's installed transform steps, including the same private-field assumptions.
	const config = await graniteConfig;
	const conditions = config.pluginConfigs.flatMap(
		(pluginConfig) => pluginConfig.babel?.conditions ?? [],
	);
	const babel = conditions.some((condition) => condition(source, sdkPath));
	const stepName = babel
		? "createFullyTransformStep"
		: "createTransformToHermesSyntaxStep";
	const step = mpackRequire(
		path.join(
			mpackRoot,
			"dist/bundler/plugins/transformPlugin/steps",
			`${stepName}.js`,
		),
	)[stepName]({ dev: false, platform: "ios" });
	const transformed = await step(source, { path: sdkPath });
	const code = (
		await mpackRequire("esbuild").transform(transformed.code, { format: "cjs" })
	).code;
	const token = (expires: number) =>
		`fixture.${Buffer.from(JSON.stringify({ sub: "fixture-user", exp: expires })).toString("base64url")}.fixture`;
	const valid = token(Math.floor(Date.now() / 1000) + 3600);
	const expired = token(1);
	let refreshes = 0;
	let written: string | undefined;
	const transport = async (input: string | URL, options?: RequestInit) => {
		const url = new URL(String(input));
		expect(url.origin).toBe("https://runtime.invalid");
		const headers = new Headers(options?.headers);
		if (url.pathname === "/api/auth/v1/refresh") {
			refreshes++;
			expect(JSON.parse(String(options?.body))).toEqual({
				refresh_token: "fixture-refresh",
			});
			return Response.json({ auth_token: valid, csrf_token: "fixture-csrf" });
		}
		if (url.pathname === "/api/auth/v1/status")
			return Response.json({
				auth_token: valid,
				refresh_token: "fixture-refresh",
			});
		expect(headers.get("Authorization")).toBe(`Bearer ${valid}`);
		if (url.pathname === "/probe") return Response.json({ ok: true });
		if (url.pathname === "/api/records/v1/metrics") {
			written = String(options?.body);
			return Response.json({ ids: ["fixture-row"] });
		}
		if (url.pathname === "/api/records/v1/metrics/fixture-row")
			return new Response('{"amount":9223372036854775807}');
		throw new Error("Unexpected fixture request");
	};
	const module = {
		exports: {} as { initClient: typeof import("trailbase").initClient },
	};
	const realm = createContext({
		module,
		exports: module.exports,
		require: mpackRequire,
		URL,
		URLSearchParams,
		atob,
		btoa,
		fetch: transport,
		console: { debug() {}, error() {} },
	});
	// Hermes lacks native raw JSON. Keep its fallback and BigInt prototype changes in this test realm.
	runInContext("JSON.rawJSON = undefined; JSON.isRawJSON = undefined;", realm);
	runInContext(code, realm, { timeout: 1000 });
	const client = module.exports.initClient("https://runtime.invalid", {
		tokens: {
			auth_token: expired,
			refresh_token: "fixture-refresh",
			csrf_token: null,
		},
	});
	expect((await client.fetch("/probe")).ok).toBe(true);
	expect(refreshes).toBeGreaterThan(0);
	await client.records("metrics").create({ amount: 9223372036854775807n });
	expect(written).toBe('{"amount":9223372036854775807}');
	const row = await client.records("metrics").read("fixture-row");
	expect(row.amount).toBe(9223372036854775807n);
});
