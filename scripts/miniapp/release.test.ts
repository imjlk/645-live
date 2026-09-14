import { expect, test } from "bun:test";
import {
	releaseTag,
	syncReleaseLock,
	validateReceipt,
	validateRuntime,
} from "./release.mjs";

test("release lock refresh preserves every dependency resolution", () => {
	const lock =
		'{"workspaces":{"apps/toss":{"name":"@645/toss","version":"0.1.0","dependencies":{"react":"19.2.3"}},"pages/www":{"name":"www","version":"0.1.0"}},"packages":{"react":["react@19.2.3","",{},"sha512-original"]}}';
	expect(syncReleaseLock(lock, "1.0.0")).toBe(
		lock.replace('"version":"0.1.0"', '"version":"1.0.0"'),
	);
	expect(() => syncReleaseLock("{}", "1.0.0")).toThrow();
	expect(() => syncReleaseLock(lock + lock, "1.0.0")).toThrow();
});

test("release uploads reject development and mixed-runtime artifacts", () => {
	expect(() =>
		validateRuntime(
			'const env = { LOTTO_APP_ENV: "production", LOTTO_API_BASE_URL: "https://trail.645.live" };',
		),
	).not.toThrow();
	for (const source of [
		'LOTTO_APP_ENV: "local", LOTTO_API_BASE_URL: "http://127.0.0.1:4015"',
		'LOTTO_APP_ENV: "production", LOTTO_API_BASE_URL: "https://wrong.example"',
		'LOTTO_APP_ENV: "production", LOTTO_APP_ENV: "local", LOTTO_API_BASE_URL: "https://trail.645.live"',
		"// No runtime configuration was compiled",
	])
		expect(() => validateRuntime(source)).toThrow();
});

test("release identity binds the version, tag, commit and exact artifact bytes", () => {
	expect(releaseTag("1.0.0")).toBe("645-live-v1.0.0");
	for (const version of [
		"01.0.0",
		"1.0.0-rc.1",
		"1.0",
		"../main",
		"1.0.0\nmain",
	])
		expect(() => releaseTag(version)).toThrow();
	const expected = {
		version: "1.0.0",
		commit: "abc123",
		tag: "645-live-v1.0.0",
		digest: "digest",
	};
	const receipt = {
		appName: "645-live",
		version: expected.version,
		commit: expected.commit,
		tag: expected.tag,
		sha256: expected.digest,
	};
	expect(() => validateReceipt(receipt, expected)).not.toThrow();
	for (const key of Object.keys(receipt))
		expect(() =>
			validateReceipt({ ...receipt, [key]: "changed" }, expected),
		).toThrow();
});
