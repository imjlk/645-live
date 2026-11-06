// Use a fresh browser identity with the disposable TrailBase from local-smoke.py.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, webkit } from "playwright";

const api = new URL(process.argv[2]);
assert.equal(api.protocol, "http:");
assert.equal(api.hostname, "127.0.0.1");
const dist = await mkdtemp(join(tmpdir(), "645-webview-generation-"));
let browser;
try {
	execFileSync("bun", ["x", "vite", "build", "--outDir", dist], {
		cwd: new URL("../../apps/toss/", import.meta.url),
		env: {
			...process.env,
			LOTTO_APP_ENV: "local",
			LOTTO_API_BASE_URL: api.origin,
		},
		stdio: "inherit",
	});
	browser =
		process.argv[3] === "webkit"
			? await webkit.launch()
			: await chromium.launch({
					channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL,
				});
	const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
	const errors = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.route("**/*", async (route) => {
		const url = new URL(route.request().url());
		if (url.origin !== api.origin) return route.abort();
		if (url.pathname.startsWith("/api/")) return route.continue();
		return route.fulfill({
			path: join(
				dist,
				url.pathname.startsWith("/assets/") ? url.pathname : "index.html",
			),
		});
	});
	await page.goto(api.origin);
	await page.getByRole("button", { name: "번호 만들기", exact: true }).click();
	await page.getByRole("button", { name: "오늘의 출석과 혜택 보기" }).click();
	await page
		.getByRole("button", { name: "오늘 출석하기", exact: true })
		.click();
	await page.getByText("오늘 출석 완료", { exact: true }).waitFor();
	assert.deepEqual(errors, []);
	console.log(
		"WebView generated numbers, completed attendance and remained interactive",
	);
} finally {
	await browser?.close();
	await rm(dist, { recursive: true, force: true });
}
