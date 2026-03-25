import type { Context, Next } from "hono";

export interface CacheConfig {
	enabled: boolean;
	maxAge: number;
	keyPrefix: string;
}

const CACHE_NAME = "og-images";
const NEWS_PATH_PREFIX = "/news/";
const DEFAULT_STALE_WHILE_REVALIDATE = 604800;

const buildCacheRequest = (cacheKey: string) =>
	new Request(`https://og-cache.local/${cacheKey}`);

const buildCacheControl = (maxAge: number) =>
	`public, max-age=${maxAge}, stale-while-revalidate=${DEFAULT_STALE_WHILE_REVALIDATE}`;

const ensureOgHeaders = (
	headers: Headers,
	cacheKey: string,
	defaultCacheControl: string,
	defaultSource: string,
) => {
	if (!headers.get("Content-Type")) {
		headers.set("Content-Type", "image/png");
	}
	if (!headers.get("Cache-Control")) {
		headers.set("Cache-Control", defaultCacheControl);
	}
	if (!headers.get("ETag")) {
		headers.set("ETag", `"${cacheKey}"`);
	}
	if (!headers.get("X-OG-Cache-Key")) {
		headers.set("X-OG-Cache-Key", cacheKey);
	}
	if (!headers.get("X-OG-Source")) {
		headers.set("X-OG-Source", defaultSource);
	}
};

function isNewsPath(url: string): boolean {
	return new URL(url).pathname.startsWith(NEWS_PATH_PREFIX);
}

function getCachedAt(headers: Headers): number | null {
	const cachedAt = headers.get("X-OG-Cached-At");
	if (!cachedAt) {
		return null;
	}

	const timestamp = Date.parse(cachedAt);
	return Number.isFinite(timestamp) ? timestamp : null;
}

function isExpired(headers: Headers, maxAge: number): boolean {
	const cachedAt = getCachedAt(headers);
	if (cachedAt === null) {
		return true;
	}

	return Date.now() - cachedAt > maxAge * 1000;
}

export const createCacheKey = async (
	url: string,
	prefix = "og-image",
): Promise<string> => {
	const normalizedUrl = new URL(url);
	const params = new URLSearchParams();

	for (const [key, value] of normalizedUrl.searchParams) {
		try {
			params.set(key, decodeURIComponent(value));
		} catch {
			params.set(key, value);
		}
	}

	const normalizedUrlString = `${normalizedUrl.pathname}?${params.toString()}`;
	const encoder = new TextEncoder();
	const data = encoder.encode(normalizedUrlString);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hash = hashArray
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
	return `${prefix}-${hash}`;
};

export const getCacheConfig = (c: Context): CacheConfig => {
	const env = c.env as CloudflareBindings;

	return {
		enabled: env.CACHE_ENABLED === "true",
		maxAge: Number.parseInt(env.CACHE_MAX_AGE || "10800", 10),
		keyPrefix: env.CACHE_KEY_PREFIX || "og-news-v1",
	};
};

export const getFromCache = async (
	cacheKey: string,
	config: CacheConfig,
): Promise<Response | null> => {
	try {
		const cache = await caches.open(CACHE_NAME);
		const cacheRequest = buildCacheRequest(cacheKey);
		const cached = await cache.match(cacheRequest);
		if (!cached) {
			return null;
		}

		if (isExpired(cached.headers, config.maxAge)) {
			await cache.delete(cacheRequest);
			return null;
		}

		const headers = new Headers(cached.headers);
		ensureOgHeaders(
			headers,
			cacheKey,
			buildCacheControl(config.maxAge),
			"cache",
		);
		headers.set("X-Cache", "HIT");

		return new Response(cached.body, {
			status: cached.status,
			statusText: cached.statusText,
			headers,
		});
	} catch (error) {
		console.warn("Cache API read error:", error);
		return null;
	}
};

export const storeInCache = async (
	cacheKey: string,
	body: ArrayBuffer,
	response: Pick<Response, "status" | "statusText">,
	headers: Headers,
	config: CacheConfig,
): Promise<void> => {
	try {
		const cache = await caches.open(CACHE_NAME);
		ensureOgHeaders(
			headers,
			cacheKey,
			buildCacheControl(config.maxAge),
			"generated",
		);
		headers.set("Content-Length", String(body.byteLength));
		headers.set("X-OG-Cached-At", new Date().toISOString());

		const cacheResponse = new Response(body.slice(0), {
			status: response.status,
			statusText: response.statusText,
			headers,
		});

		await cache.put(buildCacheRequest(cacheKey), cacheResponse);
	} catch (error) {
		console.warn("Cache API write error:", error);
	}
};

export const cacheMiddleware = () => {
	return async (c: Context, next: Next) => {
		if (!isNewsPath(c.req.url)) {
			return next();
		}

		const config = getCacheConfig(c);
		if (!config.enabled) {
			return next();
		}

		const cacheKey = await createCacheKey(c.req.url, config.keyPrefix);
		const cachedResponse = await getFromCache(cacheKey, config);
		if (cachedResponse) {
			return cachedResponse;
		}

		await next();

		if (
			c.res.status !== 200 ||
			!c.res.headers.get("Content-Type")?.includes("image")
		) {
			return c.res;
		}

		const responseHeaders = new Headers(c.res.headers);
		ensureOgHeaders(
			responseHeaders,
			cacheKey,
			buildCacheControl(config.maxAge),
			"generated",
		);
		responseHeaders.set("X-Cache", "MISS");
		const responseBody = await c.res.arrayBuffer();
		responseHeaders.set("Content-Length", String(responseBody.byteLength));

		c.res = new Response(responseBody.slice(0), {
			status: c.res.status,
			statusText: c.res.statusText,
			headers: responseHeaders,
		});

		if (responseBody.byteLength === 0) {
			return c.res;
		}

		const cacheWrite = storeInCache(
			cacheKey,
			responseBody,
			c.res,
			new Headers(responseHeaders),
			config,
		);

		try {
			c.executionCtx.waitUntil(cacheWrite);
		} catch (error) {
			console.warn(
				"ExecutionContext.waitUntil unavailable, writing cache inline:",
				error,
			);
			void cacheWrite;
		}

		return c.res;
	};
};
