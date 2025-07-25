/**
 * Service Worker for 645.live - Offline support and intelligent caching
 * Provides comprehensive caching strategy for better performance and offline experience
 */

/// <reference types="@cloudflare/workers-types" />
/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_VERSION = "v1.0.0";
const CACHE_NAMES = {
	static: `static-${CACHE_VERSION}`,
	dynamic: `dynamic-${CACHE_VERSION}`,
	api: `api-${CACHE_VERSION}`,
	images: `images-${CACHE_VERSION}`,
} as const;

const CACHE_STRATEGIES = {
	// Static assets - cache first
	STATIC_ASSETS: [
		"/",
		"/guide",
		"/faq",
		"/stats",
		"/generator",
		"/qr-scan",
		"/_app/",
		"/favicon.ico",
		"/app.css",
		"/manifest.json",
	],

	// API endpoints - network first with fallback
	API_ENDPOINTS: ["/api/", "/trailbase/"],

	// Images - cache first with network fallback
	IMAGE_PATTERNS: [/\.(?:png|jpg|jpeg|svg|webp|gif|ico)$/i, /\/og\//],

	// Statistics pages - stale while revalidate
	STATS_PAGES: ["/stats/", "/n/"],
} as const;

interface CacheConfig {
	strategy:
		| "cacheFirst"
		| "networkFirst"
		| "staleWhileRevalidate"
		| "networkOnly"
		| "cacheOnly";
	cacheName: string;
	maxAge?: number;
	maxEntries?: number;
	networkTimeoutSeconds?: number;
}

// ============= Caching Strategies =============

async function cacheFirst(
	request: Request,
	config: CacheConfig,
): Promise<Response> {
	const cache = await caches.open(config.cacheName);
	const cached = await cache.match(request);

	if (cached && !isExpired(cached, config.maxAge)) {
		console.log("🎯 Cache hit:", request.url);
		return cached;
	}

	try {
		const response = await fetchWithTimeout(
			request,
			config.networkTimeoutSeconds,
		);

		if (response.ok) {
			const responseClone = response.clone();
			await cache.put(request, responseClone);
			console.log("💾 Cached:", request.url);
		}

		return response;
	} catch (error) {
		console.warn("🔗 Network failed, serving stale cache:", request.url);
		return cached || createOfflineResponse(request);
	}
}

async function networkFirst(
	request: Request,
	config: CacheConfig,
): Promise<Response> {
	try {
		const response = await fetchWithTimeout(
			request,
			config.networkTimeoutSeconds,
		);

		if (response.ok) {
			const cache = await caches.open(config.cacheName);
			const responseClone = response.clone();
			await cache.put(request, responseClone);
			console.log("🔄 Network success, cached:", request.url);
		}

		return response;
	} catch (error) {
		console.warn("🔗 Network failed, trying cache:", request.url);
		const cache = await caches.open(config.cacheName);
		const cached = await cache.match(request);

		return cached || createOfflineResponse(request);
	}
}

async function staleWhileRevalidate(
	request: Request,
	config: CacheConfig,
): Promise<Response> {
	const cache = await caches.open(config.cacheName);
	const cached = await cache.match(request);

	// Always try to revalidate in background
	const fetchPromise = fetchWithTimeout(request, config.networkTimeoutSeconds)
		.then((response) => {
			if (response.ok) {
				const responseClone = response.clone();
				cache.put(request, responseClone);
				console.log("🔄 Background update cached:", request.url);
			}
			return response;
		})
		.catch((error) => {
			console.warn("🔗 Background update failed:", request.url, error);
			return cached;
		});

	if (cached && !isExpired(cached, config.maxAge)) {
		console.log("📊 Serving stale, revalidating:", request.url);
		return cached;
	}

	// If no cache or expired, wait for network
	try {
		return await fetchPromise;
	} catch (error) {
		return cached || createOfflineResponse(request);
	}
}

// ============= Utility Functions =============

async function fetchWithTimeout(
	request: Request,
	timeoutSeconds = 10,
): Promise<Response> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

	try {
		const response = await fetch(request, { signal: controller.signal });
		clearTimeout(timeoutId);
		return response;
	} catch (error) {
		clearTimeout(timeoutId);
		throw error;
	}
}

function isExpired(response: Response, maxAge?: number): boolean {
	if (!maxAge) return false;

	const dateHeader = response.headers.get("date");
	if (!dateHeader) return false;

	const responseTime = new Date(dateHeader).getTime();
	const now = Date.now();

	return now - responseTime > maxAge * 1000;
}

function createOfflineResponse(request: Request): Response {
	const url = new URL(request.url);

	// Serve offline page for navigation requests
	if (request.mode === "navigate") {
		return new Response(
			`
      <!DOCTYPE html>
      <html lang="ko">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>오프라인 - 645.live</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 2rem;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              text-align: center;
            }
            .container {
              max-width: 500px;
              background: rgba(255, 255, 255, 0.1);
              padding: 3rem 2rem;
              border-radius: 1rem;
              backdrop-filter: blur(10px);
              box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
            }
            h1 { font-size: 2.5rem; margin-bottom: 1rem; }
            p { font-size: 1.2rem; margin-bottom: 2rem; opacity: 0.9; }
            .retry-btn {
              background: rgba(255, 255, 255, 0.2);
              border: 2px solid rgba(255, 255, 255, 0.3);
              color: white;
              padding: 1rem 2rem;
              font-size: 1.1rem;
              border-radius: 0.5rem;
              cursor: pointer;
              transition: all 0.3s ease;
            }
            .retry-btn:hover {
              background: rgba(255, 255, 255, 0.3);
              transform: translateY(-2px);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🔌 오프라인</h1>
            <p>인터넷 연결을 확인해주세요.</p>
            <p>일부 캐시된 콘텐츠는 계속 이용할 수 있습니다.</p>
            <button class="retry-btn" onclick="window.location.reload()">
              다시 시도
            </button>
          </div>
        </body>
      </html>
    `,
			{
				headers: { "Content-Type": "text/html; charset=utf-8" },
				status: 200,
			},
		);
	}

	// Serve JSON error for API requests
	if (
		url.pathname.startsWith("/api/") ||
		url.pathname.includes("/trailbase/")
	) {
		return new Response(
			JSON.stringify({
				error: "offline",
				message: "오프라인 상태입니다. 인터넷 연결을 확인해주세요.",
				cached: false,
			}),
			{
				headers: { "Content-Type": "application/json" },
				status: 503,
			},
		);
	}

	return new Response("오프라인 상태입니다.", { status: 503 });
}

function getRouteConfig(url: string): CacheConfig {
	const pathname = new URL(url).pathname;

	// Static assets
	if (
		CACHE_STRATEGIES.STATIC_ASSETS.some((asset) => pathname.startsWith(asset))
	) {
		return {
			strategy: "cacheFirst",
			cacheName: CACHE_NAMES.static,
			maxAge: 86400, // 24 hours
			networkTimeoutSeconds: 5,
		};
	}

	// API endpoints
	if (CACHE_STRATEGIES.API_ENDPOINTS.some((api) => pathname.startsWith(api))) {
		return {
			strategy: "networkFirst",
			cacheName: CACHE_NAMES.api,
			maxAge: 300, // 5 minutes
			maxEntries: 100,
			networkTimeoutSeconds: 10,
		};
	}

	// Images
	if (
		CACHE_STRATEGIES.IMAGE_PATTERNS.some((pattern) => pattern.test(pathname))
	) {
		return {
			strategy: "cacheFirst",
			cacheName: CACHE_NAMES.images,
			maxAge: 604800, // 7 days
			maxEntries: 200,
			networkTimeoutSeconds: 8,
		};
	}

	// Statistics pages
	if (CACHE_STRATEGIES.STATS_PAGES.some((page) => pathname.startsWith(page))) {
		return {
			strategy: "staleWhileRevalidate",
			cacheName: CACHE_NAMES.dynamic,
			maxAge: 1800, // 30 minutes
			maxEntries: 50,
			networkTimeoutSeconds: 8,
		};
	}

	// Default for other pages
	return {
		strategy: "networkFirst",
		cacheName: CACHE_NAMES.dynamic,
		maxAge: 3600, // 1 hour
		maxEntries: 100,
		networkTimeoutSeconds: 10,
	};
}

async function handleRequest(request: Request): Promise<Response> {
	const config = getRouteConfig(request.url);

	switch (config.strategy) {
		case "cacheFirst":
			return cacheFirst(request, config);
		case "networkFirst":
			return networkFirst(request, config);
		case "staleWhileRevalidate":
			return staleWhileRevalidate(request, config);
		default:
			return fetch(request);
	}
}

// ============= Cache Management =============

async function cleanupOldCaches(): Promise<void> {
	const cacheNames = await caches.keys();
	const currentCaches = Object.values(CACHE_NAMES);

	const deletePromises = cacheNames
		.filter((name) => !currentCaches.includes(name as any))
		.map((name) => caches.delete(name));

	await Promise.all(deletePromises);
	console.log("🧹 Old caches cleaned up");
}

async function limitCacheSize(
	cacheName: string,
	maxEntries: number,
): Promise<void> {
	const cache = await caches.open(cacheName);
	const requests = await cache.keys();

	if (requests.length > maxEntries) {
		const entriesToDelete = requests.slice(0, requests.length - maxEntries);
		await Promise.all(entriesToDelete.map((request) => cache.delete(request)));
		console.log(`📦 Cache ${cacheName} size limited to ${maxEntries} entries`);
	}
}

// ============= Event Listeners =============

self.addEventListener("install", (event: ExtendableEvent) => {
	console.log("⚙️ Service Worker installing");

	event.waitUntil(
		Promise.all([
			// Pre-cache critical resources
			caches
				.open(CACHE_NAMES.static)
				.then((cache) => cache.addAll(["/", "/manifest.json", "/favicon.ico"])),
			// Skip waiting to activate immediately
			self.skipWaiting(),
		]),
	);
});

self.addEventListener("activate", (event: ExtendableEvent) => {
	console.log("✅ Service Worker activating");

	event.waitUntil(Promise.all([cleanupOldCaches(), self.clients.claim()]));
});

self.addEventListener("fetch", (event: FetchEvent) => {
	// Skip non-GET requests
	if (event.request.method !== "GET") return;

	// Skip chrome-extension and other non-http requests
	if (!event.request.url.startsWith("http")) return;

	event.respondWith(handleRequest(event.request));
});

// Background sync for offline actions
self.addEventListener("sync", (event) => {
	if (event.tag === "background-sync") {
		event.waitUntil(
			// Handle background sync logic here
			Promise.resolve(),
		);
	}
});

// Handle cache size limits periodically
self.addEventListener("message", (event) => {
	if (event.data?.type === "CLEANUP_CACHES") {
		event.waitUntil(
			Promise.all([
				limitCacheSize(CACHE_NAMES.api, 100),
				limitCacheSize(CACHE_NAMES.dynamic, 50),
				limitCacheSize(CACHE_NAMES.images, 200),
			]),
		);
	}
});

// Export for type checking
export {};
