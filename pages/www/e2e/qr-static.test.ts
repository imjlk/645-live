import { expect, type Page, test } from "@playwright/test";

test.use({
	launchOptions: {
		args: [
			"--use-fake-device-for-media-stream",
			"--use-fake-ui-for-media-stream",
		],
	},
	permissions: ["camera"],
});

async function installScannerMock(page: Page) {
	await page.addInitScript(() => {
		const state = window as typeof window & {
			__qrCameraRequests: number;
			__qrDetectedValue: string;
		};
		state.__qrCameraRequests = 0;
		state.__qrDetectedValue = "";
		const getUserMedia = navigator.mediaDevices.getUserMedia.bind(
			navigator.mediaDevices,
		);
		navigator.mediaDevices.getUserMedia = async (constraints) => {
			state.__qrCameraRequests += 1;
			return getUserMedia(constraints);
		};
		Object.defineProperty(window, "BarcodeDetector", {
			configurable: true,
			value: class {
				static async getSupportedFormats() {
					return ["qr_code"];
				}
				async detect() {
					const rawValue = state.__qrDetectedValue;
					return rawValue
						? [
								{
									rawValue,
									format: "qr_code",
									boundingBox: new DOMRectReadOnly(10, 10, 100, 100),
									cornerPoints: [
										{ x: 10, y: 10 },
										{ x: 110, y: 10 },
										{ x: 110, y: 110 },
										{ x: 10, y: 110 },
									],
								},
							]
						: [];
				}
			},
		});
	});
}

async function detect(page: Page, qrData: string) {
	await page.evaluate((value) => {
		(
			window as typeof window & { __qrDetectedValue: string }
		).__qrDetectedValue = value;
	}, qrData);
}

test.beforeEach(async ({ page }) => {
	// This suite must never write a real ticket to TrailBase or member services.
	await page.route("**/*", async (route) => {
		if (!["GET", "HEAD", "OPTIONS"].includes(route.request().method())) {
			await route.abort("blockedbyclient");
			return;
		}
		await route.continue();
	});
	await page.route("**/auth/get-session**", (route) =>
		route.fulfill({ json: null }),
	);
	await page.route("**/api/lotto-draws-recent.json", (route) =>
		route.fulfill({ json: { latestRound: 1240, rounds: [] } }),
	);
});

test("renders QR guidance and metadata without JavaScript or member data", async ({
	browser,
	baseURL,
}) => {
	const context = await browser.newContext({
		javaScriptEnabled: false,
		baseURL,
	});
	const page = await context.newPage();
	await page.goto("/qr-scan");
	await expect(
		page.getByRole("heading", { level: 1, name: "QR로 당첨 확인" }),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "QR 확인 도움말" }),
	).toBeVisible();
	await expect(page.locator('meta[name="description"]')).toHaveAttribute(
		"content",
		/로또 용지의 QR 코드/,
	);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		"href",
		"https://645.live/qr-scan",
	);
	await expect(page.locator('form[action="?/scan"]')).toHaveCount(0);
	await expect(page.locator(".result-status")).toHaveCount(0);
	await context.close();
});

test("camera initialization is independent of pending latest-round and session requests", async ({
	page,
}) => {
	await installScannerMock(page);
	await page.route("**/api/lotto-draws-recent.json", () => {});
	await page.route("**/auth/get-session**", () => {});
	await page.goto("/qr-scan", { waitUntil: "domcontentloaded" });
	await page.waitForFunction(
		() =>
			((window as typeof window & { __qrCameraRequests?: number })
				.__qrCameraRequests ?? 0) > 0,
	);
	await expect(
		page.getByRole("heading", { level: 1, name: "QR로 당첨 확인" }),
	).toBeVisible();
	await expect(page.locator(".camera-surface video")).toBeVisible();
	await expect(
		page.getByText("사진에서 QR 확인", { exact: true }),
	).toBeVisible();
});

test("keeps successful and duplicate results visible and shows API failures without saving them", async ({
	page,
}) => {
	await installScannerMock(page);
	const submitted: string[] = [];
	await page.route("**/api/qr-scan", async (route) => {
		const { qrData } = route.request().postDataJSON();
		submitted.push(qrData);
		if (submitted.length === 3) {
			await route.fulfill({
				status: 502,
				json: {
					success: false,
					error: "테스트: 스캔 저장을 다시 시도해주세요.",
				},
			});
			return;
		}
		const duplicate = submitted.length === 2;
		await route.fulfill({
			json: {
				success: true,
				message: duplicate
					? "이미 저장된 티켓을 다시 확인했습니다."
					: "스캔이 성공적으로 처리되었습니다.",
				data: {
					qrData,
					gamesCount: 1,
					uniqueNumbers: [1, 2, 3, 4, 5, 6],
					alreadyScanned: duplicate,
					memberSyncState: "not_applicable",
					memberUserId: null,
					scanRecord: {
						qrData,
						// Canonical fixture hashes for the two decoded tickets.
						ticketHash: duplicate ? "imyl6t" : "dtevi2",
						round: 1240,
						gamesCount: 1,
						scannedAt: new Date().toISOString(),
						resultStatus: "winner",
						summary: "1240회차 1게임 (5등 당첨)",
						isWinner: true,
						isUnreleased: false,
						isExpired: false,
						winningGrade: "5등",
						lastCheckedAt: new Date().toISOString(),
						claimStartAt: null,
						claimDeadlineAt: null,
						winningResults: [
							{
								isWinner: true,
								grade: "5등",
								matchCount: 3,
								bonusMatch: false,
								prize: "5,000원",
								message: "5등 당첨",
							},
						],
					},
				},
			},
		});
	});
	await page.goto("/qr-scan");
	await expect(page.locator(".camera-surface video")).toBeVisible();
	const firstQr = "http://m.dhlottery.co.kr/?v=1240q010203040506";
	await detect(page, firstQr);
	await expect(page.locator(".result-status")).toHaveText("5등 당첨");
	await expect(page.locator(".scanned-games li")).toHaveCount(1);
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					JSON.parse(localStorage.getItem("qr-scan-history") ?? "[]").length,
			),
		)
		.toBe(1);

	await detect(page, "http://m.dhlottery.co.kr/?v=1240q070809101112");
	await expect(
		page
			.locator(".scan-result")
			.getByText("이미 저장된 티켓의 결과를 다시 확인했습니다.", {
				exact: true,
			}),
	).toBeVisible();
	await expect(page.locator(".result-status")).toHaveText("5등 당첨");
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					JSON.parse(localStorage.getItem("qr-scan-history") ?? "[]").length,
			),
		)
		.toBe(2);

	await detect(page, "http://m.dhlottery.co.kr/?v=1240q131415161718");
	await expect(page.locator(".scan-result").getByRole("alert")).toContainText(
		"테스트: 스캔 저장을 다시 시도해주세요.",
	);
	await expect(page.locator(".result-status")).toHaveText("5등 당첨");
	expect(submitted).toHaveLength(3);
	expect(
		await page.evaluate(
			() => JSON.parse(localStorage.getItem("qr-scan-history") ?? "[]").length,
		),
	).toBe(2);

	// Exercise stored-ticket deduplication after the scanner's intentional 500ms cooldown.
	await page.waitForTimeout(600);
	await detect(page, firstQr);
	await expect(
		page.getByText("이미 스캔한 로또 용지입니다", { exact: false }).first(),
	).toBeVisible();
	expect(submitted).toHaveLength(3);
});
