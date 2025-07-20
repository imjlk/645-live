import type { Context, Next } from "hono";
// Using Web Crypto API for Cloudflare Workers compatibility

export interface CacheConfig {
	enabled: boolean;
	maxAge: number;
	keyPrefix: string;
}

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
	request: Request,
): Promise<Response | null> => {
	try {
		const cache = await caches.open("og-images");
		const cached = await cache.match(request);
		if (cached) {
			console.log(`Cache API hit: ${cacheKey}`, {
				status: cached.status,
				contentType: cached.headers.get("Content-Type"),
				contentLength: cached.headers.get("Content-Length"),
			});
			return cached;
		}
	} catch (error) {
		console.warn("Cache API error:", error);
	}

	return null;
};

export const storeInCache = async (
	cacheKey: string,
	request: Request,
	response: Response,
	config: CacheConfig,
): Promise<void> => {
	console.log(`🔄 storeInCache called for: ${cacheKey}`);

	try {
		console.log(`🗄️ Storing in Cache API: ${cacheKey}`);
		const cache = await caches.open("og-images");

		// Clone the response with explicit headers to ensure they're preserved
		const headers = new Headers(response.headers);

		// Ensure critical headers are set
		if (!headers.get("Content-Type")) {
			headers.set("Content-Type", "image/png");
		}
		headers.set("Cache-Control", `public, max-age=${config.maxAge}`);
		headers.set("X-Cache", "MISS");

		const cacheResponse = new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers,
		});
		await cache.put(request, cacheResponse);
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
		const cachedResponse = await getFromCache(cacheKey, c.req.raw);
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
			// Clone the response before caching to avoid consuming the body
			const responseToCache = c.res.clone();
			console.log(`💾 Starting cache storage for: ${cacheKey}`);
			// Fire and forget - don't await caching to avoid blocking the response
			storeInCache(cacheKey, c.req.raw, responseToCache, config)
				.then(() => console.log(`✅ Cache storage completed for: ${cacheKey}`))
				.catch((error) =>
					console.warn(`❌ Cache storage failed for ${cacheKey}:`, error),
				);
		}

		return c.res;
	};
};
