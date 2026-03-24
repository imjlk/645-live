import type { Context, Next } from "hono";
// Using Web Crypto API for Cloudflare Workers compatibility

export interface CacheConfig {
	enabled: boolean;
	maxAge: number;
	keyPrefix: string;
}

const CACHE_NAME = "og-images";

const buildCacheRequest = (cacheKey: string) =>
	new Request(`https://og-cache.local/${cacheKey}`);

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

export const createCacheKey = async (
	url: string,
	prefix = "og-image",
): Promise<string> => {
	// Normalize URL to handle percent encoding consistently
	const normalizedUrl = new URL(url);

	// Decode and re-encode query parameters to normalize them
	const params = new URLSearchParams();
	for (const [key, value] of normalizedUrl.searchParams) {
		try {
			// Decode and re-encode to normalize
			const decodedValue = decodeURIComponent(value);
			params.set(key, decodedValue);
		} catch {
			// If decoding fails, use original value
			params.set(key, value);
		}
	}

	// Create normalized URL for consistent caching
	const normalizedUrlString = `${normalizedUrl.pathname}?${params.toString()}`;

	const encoder = new TextEncoder();
	const data = encoder.encode(normalizedUrlString);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
	return `${prefix}-${hash}`;
};

export const getCacheConfig = (c: Context): CacheConfig => {
	const env = c.env as CloudflareBindings;

	return {
		enabled: env.CACHE_ENABLED === "true",
		maxAge: Number.parseInt(env.CACHE_MAX_AGE || "86400"),
		keyPrefix: "og-image",
	};
};

export const getFromCache = async (
	cacheKey: string,
): Promise<Response | null> => {
	try {
		const cache = await caches.open(CACHE_NAME);
		const cached = await cache.match(buildCacheRequest(cacheKey));
		if (cached) {
			const headers = new Headers(cached.headers);
			ensureOgHeaders(
				headers,
				cacheKey,
				`public, max-age=86400`,
				"cache",
			);
			headers.set("X-Cache", "HIT");

			console.log(`Cache API hit: ${cacheKey}`, {
				status: cached.status,
				contentType: headers.get("Content-Type"),
				contentLength: headers.get("Content-Length"),
			});

			return new Response(cached.body, {
				status: cached.status,
				statusText: cached.statusText,
				headers,
			});
		}
	} catch (error) {
		console.warn("Cache API error:", error);
	}

	return null;
};

export const storeInCache = async (
	cacheKey: string,
	body: ArrayBuffer,
	response: Pick<Response, "status" | "statusText">,
	headers: Headers,
	config: CacheConfig,
): Promise<void> => {
	console.log(`🔄 storeInCache called for: ${cacheKey}`);

	try {
		console.log(`🗄️ Storing in Cache API: ${cacheKey}`);
		const cache = await caches.open(CACHE_NAME);
		ensureOgHeaders(
			headers,
			cacheKey,
			`public, max-age=${config.maxAge}`,
			"generated",
		);

		headers.set("Content-Length", String(body.byteLength));

		const cacheResponse = new Response(body.slice(0), {
			status: response.status,
			statusText: response.statusText,
			headers,
		});
		await cache.put(buildCacheRequest(cacheKey), cacheResponse);
		console.log(`✅ Stored in Cache API: ${cacheKey}`, {
			contentType: headers.get("Content-Type"),
			contentLength: headers.get("Content-Length"),
		});
	} catch (error) {
		console.warn("❌ Failed to store in Cache API:", error);
	}
};

export const cacheMiddleware = () => {
	return async (c: Context, next: Next) => {
		const config = getCacheConfig(c);

		console.log(`🎯 Cache config:`, {
			enabled: config.enabled,
			maxAge: config.maxAge,
		});

		// Skip caching if disabled
		if (!config.enabled) {
			console.log(`⚠️ Cache disabled, skipping cache`);
			return next();
		}

		const cacheKey = await createCacheKey(c.req.url, config.keyPrefix);
		console.log(`🔍 Looking for cache key: ${cacheKey}`);

		// Try to get from cache
		const cachedResponse = await getFromCache(cacheKey);
		if (cachedResponse) {
			console.log(`✅ Cache HIT! Returning cached response`, {
				status: cachedResponse.status,
				contentType: cachedResponse.headers.get("Content-Type"),
				contentLength: cachedResponse.headers.get("Content-Length"),
				hasBody: !!cachedResponse.body,
			});
			return cachedResponse;
		}

		console.log(`❌ Cache MISS! Generating new image`);
		// Continue to handler
		await next();

		console.log(`Response from handler:`, {
			status: c.res.status,
			contentType: c.res.headers.get("Content-Type"),
			contentLength: c.res.headers.get("Content-Length"),
			hasBody: !!c.res.body,
		});

		// Cache the response if it's successful
		if (
			c.res.status === 200 &&
			c.res.headers.get("Content-Type")?.includes("image")
		) {
			const responseHeaders = new Headers(c.res.headers);
			ensureOgHeaders(
				responseHeaders,
				cacheKey,
				`public, max-age=${config.maxAge}`,
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
				console.warn(`⚠️ Generated empty image response for: ${cacheKey}`);
				return c.res;
			}

			console.log(`💾 Starting cache storage for: ${cacheKey}`);
			// Fire and forget - body is already buffered, so caching won't disturb the client response.
			storeInCache(
				cacheKey,
				responseBody,
				c.res,
				new Headers(responseHeaders),
				config,
			)
				.then(() => console.log(`✅ Cache storage completed for: ${cacheKey}`))
				.catch((error) =>
					console.warn(`❌ Cache storage failed for ${cacheKey}:`, error),
				);
		}

		return c.res;
	};
};
