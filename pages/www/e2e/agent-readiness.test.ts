import { expect, test, type Page } from "@playwright/test";

function installWebMcpRecorderScript() {
	return () => {
		type RecordedContext = {
			tools?: Array<{
				name?: string;
			}>;
		};

		const recordedContexts: RecordedContext[] = [];
		(
			window as Window & {
				__webMcpRecordedContexts?: RecordedContext[];
			}
		).__webMcpRecordedContexts = recordedContexts;

		Object.defineProperty(window.navigator, "modelContext", {
			configurable: true,
			value: {
				provideContext(context: RecordedContext) {
					recordedContexts.push(context);
				},
			},
		});
	};
}

async function getLatestToolNames(page: Page) {
	await page.waitForFunction(() => {
		const contexts = (
			window as Window & {
				__webMcpRecordedContexts?: Array<{ tools?: unknown[] }>;
			}
		).__webMcpRecordedContexts;

		return Array.isArray(contexts) && contexts.length > 0;
	});

	return page.evaluate(() => {
		const contexts = (
			window as Window & {
				__webMcpRecordedContexts?: Array<{
					tools?: Array<{
						name?: string;
					}>;
				}>;
			}
		).__webMcpRecordedContexts ?? [];
		const tools = contexts.at(-1)?.tools ?? [];
		return tools
			.map((tool) => tool.name)
			.filter((name): name is string => typeof name === "string");
	});
}

async function getLatestToolNamesIfPresent(page: Page) {
	await page.waitForTimeout(1_000);

	return page.evaluate(() => {
		const contexts = (
			window as Window & {
				__webMcpRecordedContexts?: Array<{
					tools?: Array<{
						name?: string;
					}>;
				}>;
			}
		).__webMcpRecordedContexts ?? [];
		const tools = contexts.at(-1)?.tools ?? [];
		return tools
			.map((tool) => tool.name)
			.filter((name): name is string => typeof name === "string");
	});
}

test("registers public WebMCP tools on the docs page", async ({ page }) => {
	await page.addInitScript(installWebMcpRecorderScript());
	await page.goto("/docs");

	const toolNames = await getLatestToolNames(page);

	expect(toolNames).toEqual(
		expect.arrayContaining([
			"get_recent_draws",
			"get_draw",
			"get_stats_overview",
			"get_auth_options",
			"get_status",
		]),
	);
	expect(toolNames).not.toContain("get_my_scan_summary");
	expect(toolNames).not.toContain("list_my_scans");
});

test("does not expose member WebMCP tools to anonymous qr-scan sessions", async ({
	page,
}) => {
	await page.addInitScript(installWebMcpRecorderScript());
	await page.goto("/qr-scan");

	const toolNames = await getLatestToolNamesIfPresent(page);

	expect(toolNames).not.toContain("get_my_scan_summary");
	expect(toolNames).not.toContain("list_my_scans");
	expect(toolNames).not.toContain("upsert_pending_scans");
});
