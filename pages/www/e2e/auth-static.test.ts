import { expect, type Page, type Route, test } from "@playwright/test";

type TestUser = { id: string; name: string; email: string };
const alice = { id: "test-alice", name: "회원 A", email: "alice@example.test" };
const bob = { id: "test-bob", name: "회원 B", email: "bob@example.test" };
const sessionFor = (user: TestUser | null) =>
	user
		? {
				user: {
					...user,
					emailVerified: true,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					image: null,
				},
				session: {
					id: `session-${user.id}`,
					userId: user.id,
					token: "mock-only",
					expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
			}
		: null;
const summary = {
	totalTickets: 12,
	pendingResults: 2,
	winningTickets: 1,
	lastScannedAt: null,
};
const deferred = () => {
	let resolve!: () => void;
	const promise = new Promise<void>((done) => {
		resolve = done;
	});
	return { promise, resolve };
};

async function mockAccount(page: Page, initialUser: TestUser | null = null) {
	const state = {
		user: initialUser,
		getSession: null as ((route: Route) => Promise<void>) | null,
		memberGate: null as Promise<void> | null,
		memberRequests: [] as string[],
		signupHeaders: [] as Record<string, string>[],
		signinBody: null as Record<string, unknown> | null,
		socialBodies: [] as Array<{
			body: Record<string, unknown>;
			headers: Record<string, string>;
		}>,
		deleteCalls: 0,
		deleteFailure: false,
	};
	await page.route(
		(url) => url.pathname.startsWith("/auth/"),
		async (route) => {
			const path = new URL(route.request().url()).pathname;
			if (path === "/auth/get-session") {
				if (state.getSession) return state.getSession(route);
				return route.fulfill({ json: sessionFor(state.user) });
			}
			if (path === "/auth/sign-in/email") {
				state.signinBody = route.request().postDataJSON() as Record<
					string,
					unknown
				>;
				state.user = alice;
				return route.fulfill({
					json: {
						token: "mock-only",
						user: sessionFor(alice)?.user,
						redirect: false,
					},
				});
			}
			if (path === "/auth/sign-up/email") {
				state.signupHeaders.push(route.request().headers());
				state.user = alice;
				return route.fulfill({
					json: { token: "mock-only", user: sessionFor(alice)?.user },
				});
			}
			if (path === "/auth/sign-in/social") {
				state.socialBodies.push({
					body: route.request().postDataJSON() as Record<string, unknown>,
					headers: route.request().headers(),
				});
				return route.fulfill({
					status: 400,
					json: {
						code: "MOCK_SOCIAL_STOP",
						message: "No external provider navigation in this test.",
					},
				});
			}
			if (path === "/auth/sign-out") {
				state.user = null;
				return route.fulfill({ json: { success: true } });
			}
			if (path === "/auth/delete-user") {
				state.deleteCalls++;
				if (state.deleteFailure)
					return route.fulfill({
						status: 400,
						json: { code: "SESSION_EXPIRED", message: "Session expired" },
					});
				state.user = null;
				return route.fulfill({
					json: { success: true, message: "User deleted" },
				});
			}
			return route.fulfill({
				status: 404,
				json: { error: "Mock endpoint not configured" },
			});
		},
	);
	await page.route("**/api/auth/providers.json", (route) =>
		route.fulfill({
			json: {
				socialProviders: [
					{ id: "google", label: "Google" },
					{ id: "kakao", label: "카카오" },
					{ id: "naver", label: "네이버" },
				],
			},
		}),
	);
	await page.route(
		(url) => url.pathname.startsWith("/rpc/"),
		async (route) => {
			const path = new URL(route.request().url()).pathname;
			if (!path.startsWith("/rpc/myScans/"))
				return route.fulfill({
					status: 401,
					json: { json: { code: "UNAUTHORIZED", message: "Mock only" } },
				});
			const expectedUser = route.request().headers()["x-645-member-id"];
			state.memberRequests.push(expectedUser ?? "missing");
			const user = state.user;
			if (state.memberGate) await state.memberGate;
			if (!user || expectedUser !== user.id)
				return route.fulfill({
					status: 409,
					json: { json: { code: "CONFLICT", message: "User changed" } },
				});
			const value = path.endsWith("/summary")
				? summary
				: path.endsWith("/upsertPending")
					? { syncedTicketHashes: [] }
					: [
							{
								id: `ticket-${user.id}`,
								ticketHash: "mock-ticket",
								qrData: "mock-private-data",
								round: 1240,
								gamesCount: 1,
								resultStatus: "unknown",
								lastCheckedAt: null,
								winningGrade: null,
								claimStartAt: null,
								claimDeadlineAt: null,
								summary: `${user.name}의 비공개 기록`,
								createdAt: new Date().toISOString(),
								updatedAt: new Date().toISOString(),
							},
						];
			return route.fulfill({ json: { json: value } });
		},
	);
	return state;
}

test("static member shell includes no user data before hydration", async ({
	browser,
	baseURL,
}) => {
	const noJs = await browser.newContext({ javaScriptEnabled: false });
	const staticPage = await noJs.newPage();
	await staticPage.goto(new URL("/my", baseURL).toString());
	await expect(
		staticPage.getByRole("heading", { name: "내 스캔 기록" }),
	).toBeVisible();
	await expect(
		staticPage.getByRole("link", { name: "내 계정", exact: true }),
	).toBeVisible();
	await expect(staticPage.getByText("회원 A")).toHaveCount(0);
	await expect(
		staticPage.getByRole("button", { name: "로그아웃", exact: true }),
	).toHaveCount(0);
	await noJs.close();
});

test("email login uses cookie API and normalizes a dangerous next path", async ({
	page,
}) => {
	const state = await mockAccount(page);
	await page.goto("/login?next=%2F%5C%5Cexample.test");
	await page.getByLabel("이메일", { exact: true }).fill(alice.email);
	await page.getByLabel("비밀번호", { exact: true }).fill("example-password");
	await page
		.locator("form")
		.getByRole("button", { name: "로그인", exact: true })
		.click();
	await expect(page).toHaveURL(/\/my$/);
	await expect(
		page.getByText("회원 A의 비공개 기록", { exact: true }),
	).toBeVisible();
	expect(state.signinBody?.callbackURL).toBe("/my");
	expect(state.memberRequests.length).toBeGreaterThan(0);
	expect(state.memberRequests.every((id) => id === alice.id)).toBe(true);
});

test("signup requires age acknowledgement and sends it only on signup", async ({
	page,
}) => {
	const state = await mockAccount(page);
	await page.goto("/login");
	await page.getByRole("button", { name: "회원가입", exact: true }).click();
	await page.getByLabel("닉네임", { exact: true }).fill("테스트 회원");
	await page.getByLabel("이메일", { exact: true }).fill(alice.email);
	await page.getByLabel("비밀번호", { exact: true }).fill("example-password");
	const checkbox = page.getByRole("checkbox", {
		name: "만 14세 이상입니다. (필수)",
	});
	await expect(checkbox).not.toBeChecked();
	await page
		.locator("form")
		.getByRole("button", { name: "회원가입", exact: true })
		.click();
	await expect(page.getByRole("alert")).toContainText("연령 확인");
	expect(state.signupHeaders).toHaveLength(0);
	await checkbox.check();
	await page
		.locator("form")
		.getByRole("button", { name: "회원가입", exact: true })
		.click();
	await expect(page).toHaveURL(/\/my$/);
	expect(state.signupHeaders[0]?.["x-645-age-confirmed"]).toBe("true");
});

test("social login and explicit social signup have different age flags", async ({
	page,
}) => {
	const state = await mockAccount(page);
	await page.goto("/login");
	await page.getByRole("button", { name: "Google로 계속하기" }).click();
	await expect(page.getByRole("alert")).toBeVisible();
	expect(state.socialBodies[0]?.body.requestSignUp).toBe(false);
	expect(state.socialBodies[0]?.headers["x-645-age-confirmed"]).toBeUndefined();
	await page.getByRole("button", { name: "회원가입", exact: true }).click();
	await page
		.getByRole("checkbox", { name: "만 14세 이상입니다. (필수)" })
		.check();
	await page.getByRole("button", { name: "Google로 계속하기" }).click();
	await expect.poll(() => state.socialBodies.length).toBe(2);
	expect(state.socialBodies[1]?.body.requestSignUp).toBe(true);
	expect(state.socialBodies[1]?.headers["x-645-age-confirmed"]).toBe("true");
});

test("logout clears the dashboard before a delayed member request returns", async ({
	page,
}) => {
	const state = await mockAccount(page, alice);
	const gate = deferred();
	state.memberGate = gate.promise;
	await page.goto("/my");
	await expect.poll(() => state.memberRequests.length).toBeGreaterThan(0);
	await page
		.getByRole("button", { name: "로그아웃", exact: true })
		.first()
		.click();
	await expect(
		page.getByRole("link", { name: "로그인 · 회원가입" }),
	).toBeVisible();
	gate.resolve();
	await expect(
		page.getByText("회원 A의 비공개 기록", { exact: true }),
	).toHaveCount(0);
	await expect(
		page.getByRole("link", { name: "로그인", exact: true }),
	).toBeVisible();
});

test("a delayed older session cannot replace a newer account response", async ({
	page,
}) => {
	const state = await mockAccount(page);
	const stale = deferred();
	let requestCount = 0;
	state.getSession = async (route) => {
		requestCount++;
		if (requestCount === 1) {
			await stale.promise;
			await route.fulfill({ json: sessionFor(alice) });
		} else {
			state.user = bob;
			await route.fulfill({ json: sessionFor(bob) });
		}
	};
	await page.goto("/my");
	await expect.poll(() => requestCount).toBe(1);
	await page.evaluate(() => window.dispatchEvent(new Event("online")));
	await expect(
		page.getByText("회원 B의 비공개 기록", { exact: true }),
	).toBeVisible();
	stale.resolve();
	await expect(
		page.getByText("회원 A의 비공개 기록", { exact: true }),
	).toHaveCount(0);
	await expect(
		page.getByText("회원 B의 비공개 기록", { exact: true }),
	).toBeVisible();
});

test("withdrawal requires confirmation, handles reauthentication, and clears current account cache", async ({
	page,
}) => {
	const state = await mockAccount(page, alice);
	await page.goto("/my");
	await expect(
		page.getByText("회원 A의 비공개 기록", { exact: true }),
	).toBeVisible();
	await page.getByRole("button", { name: "회원 탈퇴", exact: true }).click();
	const dialog = page.getByRole("dialog");
	await expect(
		dialog.getByRole("button", { name: "탈퇴하고 기록 삭제" }),
	).toBeDisabled();
	expect(state.deleteCalls).toBe(0);
	await dialog.getByRole("checkbox").check();
	state.deleteFailure = true;
	await dialog.getByRole("button", { name: "탈퇴하고 기록 삭제" }).click();
	await expect(dialog.getByRole("alert")).toContainText("다시 로그인");
	await expect(
		dialog.getByRole("button", { name: "다시 로그인하기" }),
	).toBeVisible();
	state.deleteFailure = false;
	await dialog
		.getByLabel("현재 비밀번호 (이메일 가입자)")
		.fill("example-password");
	await dialog.getByRole("button", { name: "탈퇴하고 기록 삭제" }).click();
	await expect(
		page.getByRole("status").filter({ hasText: "탈퇴가 완료" }),
	).toBeVisible();
	expect(
		await page.evaluate((userId) => {
			const items = JSON.parse(
				localStorage.getItem("qr-scan-history") ?? "[]",
			) as Array<{ userId?: string }>;
			return items.some((item) => item.userId === userId);
		}, alice.id),
	).toBe(false);
	expect(state.deleteCalls).toBe(2);
});

test("WebMCP updates from CSR session and retained callbacks keep the original owner", async ({
	page,
}) => {
	const state = await mockAccount(page, alice);
	await page.addInitScript(() => {
		type Tool = {
			name: string;
			execute: (input: Record<string, unknown>) => Promise<unknown>;
		};
		const recorder = window as Window & {
			__firstMemberTool?: Tool;
			__latestMemberToolNames?: string[];
		};
		Object.defineProperty(navigator, "modelContext", {
			configurable: true,
			value: {
				provideContext(context: { tools: Tool[] }) {
					recorder.__latestMemberToolNames = context.tools.map(
						(tool) => tool.name,
					);
					recorder.__firstMemberTool ??= context.tools.find(
						(tool) => tool.name === "list_my_scans",
					);
				},
			},
		});
	});
	await page.goto("/my");
	await expect(
		page.getByText("회원 A의 비공개 기록", { exact: true }),
	).toBeVisible();
	state.user = bob;
	await page.evaluate(() => window.dispatchEvent(new Event("online")));
	await expect(
		page.getByText("회원 B의 비공개 기록", { exact: true }),
	).toBeVisible();
	const outcome = await page.evaluate(async () => {
		const recorder = window as Window & {
			__firstMemberTool?: {
				execute: (input: Record<string, unknown>) => Promise<unknown>;
			};
		};
		try {
			await recorder.__firstMemberTool?.execute({ limit: 1 });
			return "unexpected success";
		} catch {
			return "rejected";
		}
	});
	expect(outcome).toBe("rejected");
	expect(state.memberRequests.at(-1)).toBe(alice.id);
	await page
		.getByRole("button", { name: "로그아웃", exact: true })
		.first()
		.click();
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					(window as Window & { __latestMemberToolNames?: string[] })
						.__latestMemberToolNames,
			),
		)
		.not.toContain("list_my_scans");
});
