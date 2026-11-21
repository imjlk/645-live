// Use a fresh browser identity with the disposable TrailBase from local-smoke.py.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
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
	for (const [recovery, fontScale] of [
		["none", 100],
		["lost_request", 130],
		["lost_response", 160],
	]) {
		const page = await browser.newPage({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			reducedMotion: "reduce",
			deviceScaleFactor: 2,
			userAgent: `Mozilla/5.0 (Linux; Android 13; SM-A525F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 TossFontScale/${fontScale}`,
		});
		const screenshot = async (stage) => {
			if (!process.env.MINIAPP_SCREENSHOT_DIR) return;
			await mkdir(process.env.MINIAPP_SCREENSHOT_DIR, { recursive: true });
			await page.screenshot({
				path: join(
					process.env.MINIAPP_SCREENSHOT_DIR,
					`${recovery}-${fontScale}-${stage}.png`,
				),
			});
		};
		// TDS paints its background on an inner layer; compare the actual label color.
		const labelColor = (button) =>
			button.evaluate((el) => {
				const label =
					[...el.querySelectorAll("*")].find(
						(node) =>
							node.childElementCount === 0 &&
							node.textContent === el.textContent,
					) ?? el;
				return getComputedStyle(label).color;
			});
		const checkInRequests = [];
		const errors = [];
		page.on("pageerror", (error) => errors.push(error.message));
		await page.route("**/*", async (route) => {
			const url = new URL(route.request().url());
			if (url.origin !== api.origin) return route.abort();
			if (url.pathname === "/api/app/v1/attendance/check-in") {
				checkInRequests.push(url);
				if (checkInRequests.length === 1 && recovery !== "none") {
					if (recovery === "lost_response") {
						// Commit in the real local server, then lose only the response.
						const response = await route.fetch();
						assert.equal(response.status(), 200);
						assert.equal((await response.json()).checkedIn, true);
					}
					return route.abort("failed");
				}
			}
			if (url.pathname.startsWith("/api/")) return route.continue();
			return route.fulfill({
				path: join(
					dist,
					url.pathname.startsWith("/assets/") ? url.pathname : "index.html",
				),
			});
		});
		await page.goto(api.origin);
		const generate = page.getByRole("button", {
			name: "번호 만들기",
			exact: true,
		});
		await generate.waitFor();
		await page
			.getByText("오늘 번호를 한 번 만들면 출석할 수 있어요.", { exact: true })
			.first()
			.waitFor();
		const primaryColor = await labelColor(generate);
		await screenshot("entry");
		await generate.click();
		const attendanceEntry = page.getByRole("button", {
			name: "오늘 출석하기",
			exact: true,
		});
		await page
			.getByText("번호 완성! 오늘 출석도 잊지 마세요", { exact: true })
			.waitFor();
		await attendanceEntry.scrollIntoViewIfNeeded();
		assert.equal(await labelColor(attendanceEntry), primaryColor);
		assert.notEqual(
			await labelColor(
				page.getByRole("button", {
					name: /^(새 번호 만들기|광고 보고 계속 만들기)$/,
				}),
			),
			primaryColor,
		);
		assert.equal(
			await page.evaluate(
				() => document.documentElement.scrollWidth > innerWidth,
			),
			false,
		);
		await screenshot("attendance");
		if (process.env.MINIAPP_SCREENSHOT_PATH)
			await page.screenshot({ path: process.env.MINIAPP_SCREENSHOT_PATH });
		await page.waitForFunction(
			(el) => {
				const { left, right, top, bottom } = el.getBoundingClientRect();
				return [
					[(left + right) / 2, top + 2],
					[(left + right) / 2, bottom - 2],
				].every(([x, y]) => el.contains(document.elementFromPoint(x, y)));
			},
			await attendanceEntry.elementHandle(),
			{ timeout: 5000 },
		);
		await attendanceEntry.click();
		const attendance = page.getByRole("dialog");
		await page.getByText("오늘 출석 완료", { exact: true }).waitFor();
		await attendance
			.getByText("내일 출석하면 2번째 도장이에요.", { exact: true })
			.waitFor();
		const save = attendance.getByRole("button", { name: /보관하기$/ });
		await save.scrollIntoViewIfNeeded();
		assert.equal(await labelColor(save), primaryColor);
		await screenshot("first-save");
		await save.click();
		await attendance
			.getByText(/^✓ 보관 완료 · \d+월 \d+일 추첨 후 보관함에서 확인$/)
			.waitFor();
		assert.deepEqual(errors, []);
		assert.equal(checkInRequests.length, recovery === "lost_request" ? 2 : 1);
		assert.equal(checkInRequests[0].search, "");
		if (recovery === "lost_request")
			assert.match(checkInRequests[1].searchParams.get("expectedDay"), /^\d+$/);
		await page.close();
		console.log(
			`Android WebView layout (${fontScale}%) generated numbers, completed attendance and saved after ${recovery}`,
		);
	}
} finally {
	await browser?.close();
	await rm(dist, { recursive: true, force: true });
}
