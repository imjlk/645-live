import { describe, expect, test } from "bun:test";
import { runtimeRouting } from "./index.mjs";
import { createPagesWorker } from "./worker.mjs";

function fixture() {
	const calls = { init: 0, server: 0, assets: 0 };
	class Server {
		async init() {
			calls.init++;
		}
		async respond(request: Request) {
			calls.server++;
			return new Response(`server:${new URL(request.url).pathname}`);
		}
	}
	const worker = createPagesWorker({
		Server,
		manifest: { appPath: "_app", assets: new Set(["favicon.ico"]) },
		prerendered: new Set([
			"/",
			"/docs",
			"/stats/ac/recent/10",
			"/stats/ac/recent/10/__data.json",
		]),
	});
	const env = {
		ASSETS: {
			fetch: async () => {
				calls.assets++;
				return new Response("static");
			},
		},
	};
	return {
		calls,
		fetch: (path: string, headers = {}) =>
			worker.fetch(
				new Request(`https://645.live${path}`, { headers }),
				env,
				{},
			),
	};
}

describe("Pages static boundary", () => {
	test("ordinary home HTML reads an asset without booting or rendering SvelteKit", async () => {
		const f = fixture();
		expect(await (await f.fetch("/")).text()).toBe("static");
		expect(f.calls).toEqual({ init: 0, server: 0, assets: 1 });
	});
	test("legacy Markdown and agent mode reach hooks while HTML remains static", async () => {
		const f = fixture();
		await f.fetch("/docs", { accept: "text/markdown" });
		await f.fetch("/?mode=agent");
		expect(f.calls).toEqual({ init: 1, server: 2, assets: 0 });
	});
	test("static server-load data is an asset; arbitrary periods remain runtime", async () => {
		const f = fixture();
		await f.fetch("/stats/ac/recent/10/__data.json");
		await f.fetch("/stats/ac/recent/23");
		expect(f.calls).toEqual({ init: 1, server: 1, assets: 1 });
	});
	test("canonical trailing slash redirect keeps queries", async () => {
		const response = await fixture().fetch("/docs/?mode=agent");
		expect(response.status).toBe(308);
		expect(response.headers.get("location")).toBe("/docs?mode=agent");
	});
	test("function rules keep finite number/article pages outside runtime", () => {
		const routing = runtimeRouting(
			[
				{ id: "/", prerender: "auto" },
				{ id: "/n/[index]", prerender: true },
				{ id: "/api/[...path]", prerender: false },
				{ id: "/stats/ac/recent/[rounds]", prerender: "auto" },
			],
			["/", "/n/1", "/stats/ac/recent/10", "/stats/ac/recent/10/__data.json"],
		);
		expect(routing.include).toContain("/api/*");
		expect(routing.include).not.toContain("/n/*");
		expect(routing.exclude).toContain("/stats/ac/recent/10");
		expect(routing.exclude).not.toContain("/");
	});
	test.each([
		"/winning-stores",
		"/history",
		"/news",
	])("client navigation to %s reaches the server data endpoint", (id) => {
		const routing = runtimeRouting(
			[{ id, prerender: false, page: { methods: ["GET"] } }],
			[],
		);
		expect(routing.include).toContain(`${id}/__data.json`);
		expect(routing.include).toContain(id);
		expect(routing.include).toContain(`${id}/`);
		expect(routing.include).not.toContain(`${id}/*`);
		expect(routing.exclude).not.toContain(`${id}/__data.json`);
	});
	test("only runtime page data adds function rules, including grouped and root pages", () => {
		const routing = runtimeRouting(
			[
				{ id: "/", prerender: false, page: { methods: ["GET"] } },
				{
					id: "/(public)/winning-stores",
					prerender: false,
					page: { methods: ["GET"] },
				},
				{ id: "/report.html", prerender: false, page: { methods: ["GET"] } },
				{ id: "/docs", prerender: "auto", page: { methods: ["GET"] } },
				{ id: "/my", prerender: true, page: { methods: ["GET"] } },
				{
					id: "/feed.xml",
					prerender: false,
					page: { methods: [] },
					api: { methods: ["GET"] },
				},
				{
					id: "/stats/ac/recent/[rounds]",
					prerender: "auto",
					page: { methods: ["GET"] },
				},
			],
			["/docs", "/docs/__data.json", "/my", "/my/__data.json"],
		);
		expect(routing.include).toContain("/__data.json");
		expect(routing.include).toContain("/winning-stores/__data.json");
		expect(routing.include).toContain("/report.html__data.json");
		expect(routing.include).not.toContain("/docs/__data.json");
		expect(routing.include).not.toContain("/my/__data.json");
		expect(routing.include).not.toContain("/feed.xml/__data.json");
		expect(routing.include).toContain("/stats/ac/recent/*");
		expect(routing.include).not.toContain(
			"/stats/ac/recent/[rounds]/__data.json",
		);
	});
});
