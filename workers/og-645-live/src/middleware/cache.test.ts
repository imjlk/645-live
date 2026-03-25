import { beforeEach, describe, expect, it } from "bun:test";
import {
	type CacheConfig,
	createCacheKey,
	getFromCache,
	storeInCache,
} from "./cache.js";

const TEST_CONFIG: CacheConfig = {
	enabled: true,
	maxAge: 60,
	keyPrefix: "og-news-test",
};

const cacheEntries = new Map<string, Response>();

const cacheApi = {
	open: async () => ({
		match: async (request: Request) => cacheEntries.get(request.url) ?? null,
		put: async (request: Request, response: Response) => {
			cacheEntries.set(request.url, response.clone());
		},
		delete: async (request: Request) => cacheEntries.delete(request.url),
	}),
};

Object.defineProperty(globalThis, "caches", {
	value: cacheApi,
	configurable: true,
});

beforeEach(() => {
	cacheEntries.clear();
});

describe("createCacheKey", () => {
	it("normalizes encoded query values consistently", async () => {
		const encoded = await createCacheKey(
			"https://worker/news/lotto-1216?title=%EB%A1%9C%EB%98%90%206%2F45",
			"prefix",
		);
		const decoded = await createCacheKey(
			"https://worker/news/lotto-1216?title=로또+6/45",
			"prefix",
		);

		expect(encoded).toBe(decoded);
	});
});

describe("cache storage", () => {
	it("returns a fresh cached image response", async () => {
		const cacheKey = await createCacheKey(
			"https://worker/news/lotto-1216?rev=test",
			TEST_CONFIG.keyPrefix,
		);
		const body = new TextEncoder().encode("png-bytes").buffer;

		await storeInCache(
			cacheKey,
			body,
			{ status: 200, statusText: "OK" },
			new Headers({ "Content-Type": "image/png" }),
			TEST_CONFIG,
		);

		const cached = await getFromCache(cacheKey, TEST_CONFIG);
		expect(cached?.status).toBe(200);
		expect(cached?.headers.get("Content-Type")).toBe("image/png");
		expect(cached?.headers.get("X-Cache")).toBe("HIT");
		expect(await cached?.text()).toBe("png-bytes");
	});

	it("drops expired entries based on X-OG-Cached-At", async () => {
		const cacheKey = await createCacheKey(
			"https://worker/news/lotto-1215?rev=expired",
			TEST_CONFIG.keyPrefix,
		);
		const body = new TextEncoder().encode("stale").buffer;
		const cache = await caches.open("og-images");

		await cache.put(
			new Request(`https://og-cache.local/${cacheKey}`),
			new Response(body, {
				headers: {
					"Content-Type": "image/png",
					"X-OG-Cached-At": new Date(Date.now() - 5 * 60 * 1000).toISOString(),
				},
			}),
		);

		const cached = await getFromCache(cacheKey, { ...TEST_CONFIG, maxAge: 1 });
		expect(cached).toBeNull();
	});
});
