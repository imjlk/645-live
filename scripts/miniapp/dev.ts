import { mkdir } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import { resolve } from "node:path";
import { resolveLottoRuntime } from "../../apps/toss/src/runtime-config";
import { importDrawSnapshot } from "./draw-snapshot.mjs";

const root = resolve(import.meta.dir, "../..");
const networks = Object.entries(networkInterfaces()).sort(
	([a], [b]) => Number(b === "en0") - Number(a === "en0"),
);
const lan = networks
	.flatMap(([, entries]) => entries ?? [])
	.find(
		(entry) =>
			entry.family === "IPv4" &&
			!entry.internal &&
			/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(entry.address),
	)?.address;
const host = process.env.LOTTO_DEV_HOST || lan || "127.0.0.1";
const port = Number(process.env.LOTTO_DEV_PORT || "4015");
if (!Number.isInteger(port) || port < 1024 || port > 65535)
	throw new Error("LOTTO_DEV_PORT must be a port from 1024 to 65535.");
const { apiBase } = resolveLottoRuntime("local", `http://${host}:${port}`);
const env = {
	...process.env,
	LOTTO_DEV_HOST: host,
	LOTTO_DEV_PORT: String(port),
};
const compose = [
	"docker",
	"compose",
	"-p",
	"645-live-toss-dev",
	"-f",
	"services/trailbase/docker-compose.toss-dev.yml",
];
async function run(args: string[], input?: string) {
	const child = Bun.spawn(args, {
		cwd: root,
		env,
		stdin: input === undefined ? "inherit" : "pipe",
		stdout: "inherit",
		stderr: "inherit",
	});
	if (input !== undefined && typeof child.stdin !== "number") {
		child.stdin?.write(input);
		child.stdin?.end();
	}
	if ((await child.exited) !== 0)
		throw new Error(`${args[0]} failed. Check the output above.`);
}
if (process.argv.includes("--stop")) {
	await run([...compose, "stop"]);
	process.exit(0);
}
await mkdir(resolve(root, ".cache/toss-trailbase"), {
	recursive: true,
	mode: 0o700,
});
console.log("[645 local] Starting TrailBase with local data and test ads…");
await run([
	...compose,
	"up",
	"-d",
	"--build",
	"--wait",
	"--wait-timeout",
	"60",
]);
const health = await fetch(`${apiBase}/api/healthcheck`, {
	signal: AbortSignal.timeout(10_000),
});
if (!health.ok) throw new Error("The local TrailBase health check failed.");
// Import only public draw results, never users, QR records or production credentials.
try {
	const response = await fetch(
		"https://trail.645.live/api/records/v1/lotto_draw_results?order=-round&limit=60",
		{ signal: AbortSignal.timeout(12_000) },
	);
	if (!response.ok) throw new Error("Public draw snapshot is unavailable.");
	const data = (await response.json()) as {
		records: Record<string, unknown>[];
	};
	if (!Array.isArray(data.records)) throw new Error("Invalid draw snapshot.");
	const script = `import {Database} from 'bun:sqlite';const db=new Database('/app/traildepot/data/main.db');const rows=await Bun.stdin.json();const result=(${importDrawSnapshot.toString()})(db,rows);db.close();console.log('[645 local] Public draw results ready ('+result.changed+' changed).');`;
	await run(
		[...compose, "exec", "-T", "trailbase", "bun", "-e", script],
		JSON.stringify(data.records),
	);
} catch {
	console.log(
		"[645 local] Public draw refresh unavailable; using existing local results. Number generation is available.",
	);
}
console.log(`[645 local] API: ${apiBase} · test ads on · live payments off`);
if (process.argv.includes("--server-only")) process.exit(0);
const metro = Bun.spawn(["bun", "x", "granite", "dev"], {
	cwd: resolve(root, "apps/toss"),
	env: { ...env, LOTTO_APP_ENV: "local", LOTTO_API_BASE_URL: apiBase },
	stdin: "inherit",
	stdout: "inherit",
	stderr: "inherit",
});
for (const signal of ["SIGINT", "SIGTERM"] as const)
	process.on(signal, () => metro.kill(signal));
process.exit(await metro.exited);
