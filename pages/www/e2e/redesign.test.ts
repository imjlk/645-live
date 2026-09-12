import { expect, test } from "@playwright/test";

test("theme respects system, persists an override and follows system again", async ({
	page,
}) => {
	await page.emulateMedia({ colorScheme: "dark" });
	await page.goto("/");
	await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
	const theme = page.getByRole("combobox", { name: "화면 테마" });
	await theme.selectOption("light");
	await page.reload();
	await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
	await expect(theme).toHaveValue("light");
	await theme.selectOption("system");
	await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
	await page.emulateMedia({ colorScheme: "light" });
	await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("mobile navigation exposes all destinations without overflowing", async ({
	page,
}) => {
	await page.setViewportSize({ width: 360, height: 800 });
	await page.goto("/");
	await expect(
		page.getByRole("link", { name: "내 로또 QR 스캔하기", exact: true }),
	).toBeVisible();
	await expect(page.locator("#live-scans [data-ball-number]")).toHaveCount(45);
	await page.getByRole("button", { name: "전체 메뉴 열기" }).click();
	await expect(
		page.locator("#mobile-menu").getByRole("link", { name: "당첨점" }),
	).toBeVisible();
	await page
		.locator("#mobile-menu")
		.getByRole("link", { name: "당첨점" })
		.click();
	await expect(page.locator("#mobile-menu")).toBeHidden();
	const fits = await page.evaluate(
		() => document.documentElement.scrollWidth <= innerWidth,
	);
	expect(fits).toBe(true);
});

test("invalid number URLs return 404 instead of server errors", async ({
	request,
}) => {
	for (const path of [
		"/n/46",
		"/n/1.5",
		"/stats/numbers/0",
		"/stats/numbers/46",
	]) {
		const response = await request.get(path);
		expect(response.status(), path).toBe(404);
	}
});

test("period-specific stats have distinct titles and one accurate description", async ({
	page,
}) => {
	const titles = new Set<string>();
	for (const rounds of [10, 20, 50, 100]) {
		await page.goto(`/stats/high-low/recent/${rounds}`);
		const title = await page.title();
		expect(title).toContain(String(rounds));
		titles.add(title);
		await expect(page.locator('meta[name="description"]')).toHaveCount(1);
		const description = await page
			.locator('meta[name="description"]')
			.getAttribute("content");
		expect(description).toContain(String(rounds));
		expect(description).not.toContain("예측");
	}
	expect(titles.size).toBe(4);
});

test("article search summary is independent of its short visible introduction", async ({
	page,
}) => {
	await page.goto("/news/posts/lotto-1240");
	await expect(page.locator("h1")).toHaveCount(1);
	await expect(page.locator('meta[name="description"]')).toHaveCount(1);
	const description = await page
		.locator('meta[name="description"]')
		.getAttribute("content");
	expect(description?.length).toBeGreaterThanOrEqual(90);
	expect(description).toContain("1240");
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		"href",
		"https://645.live/news/posts/lotto-1240",
	);
});
