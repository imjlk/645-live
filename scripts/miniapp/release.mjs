import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	appendFileSync,
	copyFileSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(import.meta.dirname, "../..");
const APP = path.join(ROOT, "apps/toss");
const OUTPUT = path.join(ROOT, ".cache/toss-release");
const RECEIPT = path.join(OUTPUT, "release.json");
const APP_NAME = "645-live";
const API_BASE = "https://trail.645.live";
const git = (...args) =>
	execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const manifest = () =>
	JSON.parse(readFileSync(path.join(APP, "package.json"), "utf8"));

export function releaseTag(version) {
	assert(
		/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version),
		"A stable SemVer is required",
	);
	return `${APP_NAME}-v${version}`;
}

export function syncReleaseLock(source, version) {
	releaseTag(version);
	const entry =
		/("apps\/toss"\s*:\s*\{\s*"name"\s*:\s*"@645\/toss"\s*,\s*"version"\s*:\s*")[^"]+("\s*,)/g;
	assert.equal(
		[...source.matchAll(entry)].length,
		1,
		"Expected one miniapp workspace lock entry",
	);
	return source.replace(
		entry,
		(_, before, after) => `${before}${version}${after}`,
	);
}

export function validateRuntime(source) {
	for (const [key, expected] of Object.entries({
		LOTTO_APP_ENV: "production",
		LOTTO_API_BASE_URL: API_BASE,
	})) {
		const values = [
			...source.matchAll(
				new RegExp(`["']?${key}["']?\\s*:\\s*["']([^"']+)["']`, "g"),
			),
		];
		assert(
			values.length > 0 && values.every((match) => match[1] === expected),
			`Bundle has an invalid ${key}`,
		);
	}
}

export function validateReceipt(receipt, { version, commit, tag, digest }) {
	assert.equal(receipt.appName, APP_NAME, "Wrong miniapp artifact");
	assert.equal(receipt.version, version, "Artifact version changed; rebuild");
	assert.equal(receipt.commit, commit, "Artifact commit changed; rebuild");
	assert.equal(receipt.tag, tag, "Artifact release tag changed; rebuild");
	assert.equal(receipt.sha256, digest, "Artifact bytes changed; rebuild");
}

function verifyReleaseCheckout(version, tag) {
	assert.equal(
		tag,
		releaseTag(version),
		"Release tag must match the miniapp version",
	);
	const commit = git("rev-parse", "HEAD");
	assert.equal(
		git("rev-parse", "--verify", `refs/tags/${tag}^{commit}`),
		commit,
		"Checkout must match the release tag",
	);
	git("merge-base", "--is-ancestor", commit, "origin/main");
	return commit;
}

async function inspect(bytes) {
	const { AITReader } = await import("@apps-in-toss/ait-format");
	const reader = AITReader.fromBuffer(bytes);
	assert.equal(reader.appName, APP_NAME, "Wrong .ait appName");
	const sdk = reader.toAppJson()._metadata.sdkVersion;
	assert.equal(
		sdk,
		manifest().dependencies["@apps-in-toss/framework"],
		"Artifact SDK differs from the pinned SDK",
	);
	const bundles = reader
		.listEntries()
		.filter((name) => /^bundle\.(ios|android)\..*\.js$/.test(name));
	assert(
		bundles.some((name) => name.startsWith("bundle.ios.")) &&
			bundles.some((name) => name.startsWith("bundle.android.")),
		"Both native platforms must be bundled",
	);
	for (const name of bundles)
		validateRuntime(new TextDecoder().decode(await reader.readEntry(name)));
	return { deploymentId: reader.deploymentId, sdk, bundles };
}

async function run(command) {
	const { version } = manifest();
	const tag = process.env.RELEASE_TAG || null;
	if (command === "describe") {
		const value = releaseTag(version);
		if (process.env.GITHUB_OUTPUT)
			appendFileSync(process.env.GITHUB_OUTPUT, `tag=${value}\n`);
		console.log(value);
		return;
	}
	if (command === "sync-lock") {
		// Sampo's Bun refresh updates unrelated dependency ranges. Retain the
		// already-reviewed main lock and change only this private app's version.
		const baseManifest = JSON.parse(
			git("show", "origin/main:apps/toss/package.json"),
		);
		assert.deepEqual(
			manifest(),
			{ ...baseManifest, version },
			"Unexpected manifest changes in release PR",
		);
		writeFileSync(
			path.join(ROOT, "bun.lock"),
			`${syncReleaseLock(git("show", "origin/main:bun.lock"), version)}\n`,
		);
		return;
	}
	assert(
		command === "build" || command === "upload",
		"Usage: release.mjs describe|build|upload",
	);
	if (tag) verifyReleaseCheckout(version, tag);
	const commit = git("rev-parse", "HEAD");
	const file = `${releaseTag(version)}.ait`;
	const artifact = path.join(OUTPUT, file);
	if (command === "build") {
		mkdirSync(OUTPUT, { recursive: true });
		rmSync(RECEIPT, { force: true });
		const generated = path.join(APP, `${APP_NAME}.ait`);
		rmSync(generated, { force: true });
		execFileSync("bun", ["run", "build:production"], {
			cwd: APP,
			stdio: "inherit",
			env: {
				...process.env,
				LOTTO_APP_ENV: "production",
				LOTTO_API_BASE_URL: API_BASE,
			},
		});
		const bytes = readFileSync(generated);
		const details = await inspect(bytes);
		copyFileSync(generated, artifact);
		const receipt = {
			appName: APP_NAME,
			version,
			tag,
			commit,
			file,
			sha256: hash(bytes),
			...details,
		};
		writeFileSync(RECEIPT, `${JSON.stringify(receipt, null, 2)}\n`);
		console.log(JSON.stringify(receipt));
		return;
	}
	assert(tag, "Uploads require RELEASE_TAG naming an existing release tag");
	const key = process.env.AIT_API_KEY?.trim();
	assert(
		key,
		"Set the app-scoped AIT_API_KEY GitHub Actions secret before submitting a release",
	);
	const receipt = JSON.parse(readFileSync(RECEIPT, "utf8"));
	const bytes = readFileSync(artifact);
	validateReceipt(receipt, { version, commit, tag, digest: hash(bytes) });
	await inspect(bytes);
	if (receipt.uploadedAt) {
		console.log("This artifact has already been uploaded.");
		return;
	}
	const result = spawnSync(
		"bun",
		[
			"x",
			"ait",
			"deploy",
			"--api-key",
			key,
			"--location",
			artifact,
			"--memo",
			`${tag} (${commit.slice(0, 12)})`,
			"--timeout",
			"300",
			"--scheme-only",
		],
		{ cwd: APP, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
	);
	const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.replaceAll(
		key,
		"[REDACTED]",
	);
	if (result.error || result.status !== 0) {
		console.error(output);
		throw new Error(
			"Apps in Toss upload did not complete. Check the console and workflow artifact before retrying.",
		);
	}
	const scheme = output.match(/intoss-private:\/\/[^\s"'<>]+/)?.[0];
	assert(
		scheme,
		"Upload returned no test scheme; check the console before retrying",
	);
	const submitted = {
		...receipt,
		uploadedAt: new Date().toISOString(),
		scheme,
	};
	writeFileSync(RECEIPT, `${JSON.stringify(submitted, null, 2)}\n`);
	if (process.env.GITHUB_STEP_SUMMARY)
		appendFileSync(
			process.env.GITHUB_STEP_SUMMARY,
			`### ${tag}\n\nApps in Toss bundle uploaded.\n\n- Commit: ${commit}\n- SHA-256: ${receipt.sha256}\n- Test scheme: \`${scheme}\`\n\nRequest review and publish from the Apps in Toss console.\n`,
		);
	console.log(`Uploaded ${tag}`);
}

if (
	process.argv[1] &&
	path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	await run(process.argv[2]);
}
