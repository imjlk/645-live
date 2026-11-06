// Run the JavaScript from the uploadable artifact, with all non-local requests
// blocked. Unit tests cannot detect bundler interoperability failures on boot.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { AITReader } from "@apps-in-toss/ait-format";
import { chromium } from "playwright";

const reader = AITReader.fromBuffer(
	await readFile(new URL("../../apps/toss/645-live.ait", import.meta.url)),
);
const entries = new Set(reader.listEntries());
const server = Bun.serve({
	port: 0,
	hostname: "127.0.0.1",
	async fetch(request) {
		const path = new URL(request.url).pathname;
		const asset = "sources" + path;
		const entry = entries.has(asset) ? asset : "sources/index.html";
		const type = entry.endsWith(".js")
			? "text/javascript"
			: entry.endsWith(".css")
				? "text/css"
				: entry.endsWith(".html")
					? "text/html"
					: "application/octet-stream";
		return new Response(await reader.readEntry(entry), {
			headers: { "Content-Type": type },
		});
	},
});
let browser;
try {
	browser = await chromium.launch({
		channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL,
	});
	const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
	const errors = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.route("**/*", (route) =>
		new URL(route.request().url()).origin === server.url.origin
			? route.continue()
			: route.abort(),
	);
	await page.goto(server.url.href);
	const tab = (name) => page.getByRole("tab", { name, exact: true });
	await tab("번호 만들기").waitFor();
	await tab("실시간").click();
	await page.waitForURL("**/live");
	await page.goBack();
	await page.waitForURL(server.url.href);
	await tab("번호 만들기").waitFor();
	await page.goto(new URL("/unknown-route", server.url).href);
	await page.getByRole("button", { name: "번호 생성기로 돌아가기" }).click();
	await tab("번호 만들기").waitFor();
	assert.deepEqual(errors, []);
	console.log(
		"Packaged WebView boot, tab navigation, browser back and direct entry passed",
	);
} finally {
	await browser?.close();
	server.stop(true);
}
