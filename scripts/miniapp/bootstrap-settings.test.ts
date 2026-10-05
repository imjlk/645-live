import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

test("bootstrap diagnostics stay opt-in and preserve auth settings and generated keys", () => {
	const depot = mkdtempSync(path.join(tmpdir(), "645-bootstrap-settings-"));
	const script = path.resolve(
		import.meta.dir,
		"../../services/trailbase/miniapp-settings.mjs",
	);
	const run = (extra: Record<string, string> = {}) => {
		execFileSync(process.execPath, [script], {
			env: { PATH: process.env.PATH, TRAILDEPOT_PATH: depot, ...extra },
			stdio: "pipe",
		});
		return JSON.parse(
			readFileSync(path.join(depot, "runtime/settings.json"), "utf8"),
		);
	};
	try {
		const initial = run();
		expect(initial.TRAILBASE_BOOTSTRAP_TIMING).toBe("false");
		expect(initial.TRAILBASE_AUTH_BASE_URL).toBe("http://127.0.0.1:4000");
		const savedKeys = readFileSync(
			path.join(depot, "secrets/miniapp-keys.json"),
			"utf8",
		);
		for (const flag of ["", "false", "1", "TRUE", " true ", "invalid-canary"]) {
			expect(
				run({ TRAILBASE_BOOTSTRAP_TIMING: flag }).TRAILBASE_BOOTSTRAP_TIMING,
			).toBe("false");
		}
		const enabled = run({
			TRAILBASE_BOOTSTRAP_TIMING: "true",
			TRAILBASE_AUTH_BASE_URL: "https://private-auth.example.invalid",
			TRAILBASE_AUTH_PASSWORD_SECRET_PREVIOUS: "previous-secret-canary",
			UNRELATED_PRIVATE_VALUE: "do-not-copy-canary",
		});
		expect(enabled.TRAILBASE_BOOTSTRAP_TIMING).toBe("true");
		expect(enabled.TRAILBASE_AUTH_BASE_URL).toBe(
			"https://private-auth.example.invalid",
		);
		expect(enabled.TRAILBASE_AUTH_PASSWORD_SECRET_PREVIOUS).toBe(
			"previous-secret-canary",
		);
		expect(enabled.AIT_IDENTITY_HMAC_SECRET).toBe(
			initial.AIT_IDENTITY_HMAC_SECRET,
		);
		expect(enabled.TRAILBASE_AUTH_PASSWORD_SECRET).toBe(
			initial.TRAILBASE_AUTH_PASSWORD_SECRET,
		);
		expect(enabled.UNRELATED_PRIVATE_VALUE).toBeUndefined();
		expect(
			readFileSync(path.join(depot, "secrets/miniapp-keys.json"), "utf8"),
		).toBe(savedKeys);
		expect(
			statSync(path.join(depot, "runtime/settings.json")).mode & 0o777,
		).toBe(0o600);
		expect(run().TRAILBASE_BOOTSTRAP_TIMING).toBe("false");
	} finally {
		rmSync(depot, { recursive: true, force: true });
	}
});
