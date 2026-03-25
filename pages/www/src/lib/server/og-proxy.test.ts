import { describe, expect, it, mock } from "bun:test";
import {
	createProxiedImageResponse,
	fetchOgUpstream,
	PAGES_OG_PROXY_VERSION,
} from "./og-proxy.js";

describe("fetchOgUpstream", () => {
	it("returns binding when the service binding succeeds", async () => {
		const binding = {
			fetch: mock(async () => new Response("binding", { status: 200 })),
		};
		const fetchFn = mock(async () => new Response("public", { status: 200 }));

		const result = await fetchOgUpstream(
			binding,
			new URL("https://worker/news/lotto-1216"),
			{
				fetchFn: fetchFn as unknown as typeof fetch,
				sleepFn: async () => undefined,
			},
		);

		expect(result?.upstream).toBe("binding");
		expect(await result?.response.text()).toBe("binding");
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it("falls back to the public worker after binding failures", async () => {
		const binding = {
			fetch: mock(async () => new Response("bad", { status: 503 })),
		};
		const fetchFn = mock(async () => new Response("public", { status: 200 }));

		const result = await fetchOgUpstream(
			binding,
			new URL("https://worker/news/lotto-1216"),
			{
				fetchFn: fetchFn as unknown as typeof fetch,
				sleepFn: async () => undefined,
			},
		);

		expect(result?.upstream).toBe("public");
		expect(await result?.response.text()).toBe("public");
		expect(binding.fetch).toHaveBeenCalledTimes(2);
		expect(fetchFn).toHaveBeenCalledTimes(1);
	});
});

describe("createProxiedImageResponse", () => {
	it("preserves image bytes and annotates proxy headers", async () => {
		const upstream = new Response(new TextEncoder().encode("png"), {
			status: 200,
			headers: {
				"content-type": "image/png",
				"cache-control": "public, max-age=60",
				"x-og-cache-key": "test-key",
				"x-og-source": "generated",
				"x-cache": "HIT",
			},
		});

		const response = await createProxiedImageResponse(upstream, "binding");

		expect(response.headers.get("Content-Type")).toBe("image/png");
		expect(response.headers.get("X-Pages-OG-Proxy-Version")).toBe(
			PAGES_OG_PROXY_VERSION,
		);
		expect(response.headers.get("X-Pages-OG-Upstream")).toBe("binding");
		expect(response.headers.get("X-OG-Cache-Key")).toBe("test-key");
		expect(response.headers.get("X-Cache")).toBe("HIT");
		expect(await response.text()).toBe("png");
	});
});
