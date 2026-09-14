import { expect, test } from "bun:test";
import { resolveLottoRuntime } from "./runtime-config";

test("development identities are restricted to explicit local preview and private APIs", () => {
	expect(resolveLottoRuntime("local", "http://192.168.45.210:4015").local).toBe(
		true,
	);
	expect(resolveLottoRuntime("local", "http://127.0.0.1:4015").storageKey).toBe(
		"645-live.local",
	);
	expect(() =>
		resolveLottoRuntime("local", "https://trail.645.live"),
	).toThrow();
	expect(() =>
		resolveLottoRuntime("production", "http://192.168.45.210:4015"),
	).toThrow();
	expect(() =>
		resolveLottoRuntime("local", "http://192.168.45.210.evil.example:4015"),
	).toThrow();
	expect(
		resolveLottoRuntime("development", "https://trail.645.live").local,
	).toBe(false);
	expect(resolveLottoRuntime().storageKey).toBe("645-live");
	for (const url of [
		"http://user:password@127.0.0.1:4015",
		"http://127.0.0.1:4015/path",
		"http://127.0.0.1:4015?host=example.com",
		"http://127.0.0.1:65536",
	])
		expect(() => resolveLottoRuntime("local", url)).toThrow();
});
