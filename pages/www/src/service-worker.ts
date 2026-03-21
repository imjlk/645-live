/**
 * Service Worker for 645.live - Offline support and intelligent caching
 * Provides comprehensive caching strategy for better performance and offline experience
 */

// Service Worker types
interface ExtendableEvent extends Event {
	waitUntil(fn: Promise<unknown>): void;
}

interface FetchEvent extends Event {
	request: Request;
	respondWith(response: Promise<Response> | Response): void;
}

declare const self: ServiceWorkerGlobalScope;

const CACHE_VERSION = "v1.1.0"; // Updated for better real-time data handling
const CACHE_NAMES = {
	static: `static-${CACHE_VERSION}`,
	dynamic: `dynamic-${CACHE_VERSION}`,
	api: `api-${CACHE_VERSION}`,
	images: `images-${CACHE_VERSION}`,
} as const;

const CACHE_STRATEGIES = {
	// Static assets - cache first (excluding main page)
	STATIC_ASSETS: [
		"/guide",
		"/faq",
		"/generator",
		"/qr-scan",
		"/_app/",
		"/assets/icons/icon.svg",
		"/assets/icons/icon-192.png",
		"/apple-touch-icon.png",
		"/app.css",
		"/manifest.json",
	],

	// Main page - needs fresh data for real-time updates
	MAIN_PAGE: ["/"],

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

interface PendingPreference {
	id: string;
	[key: string]: unknown;
}

function shouldBypassCaching(request: Request): boolean {
	const url = new URL(request.url);
	const accept = request.headers.get("accept") ?? "";

	if (url.origin !== self.location.origin) {
		return true;
	}

	if (accept.includes("text/event-stream")) {
		return true;
	}

	return (
		url.pathname.startsWith("/api/records/v1/") ||
		url.pathname.startsWith("/api/auth/v1/") ||
		url.pathname.startsWith("/connection/")
	);
}

// ============= Caching Strategies =============

async function cacheFirst(
	request: Request,
	config: CacheConfig,
): Promise<Response> {
	const cache = await caches.open(config.cacheName);
	const cached = await cache.match(request);

	if (cached && !isExpired(cached, config.maxAge)) {
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
		}

		return response;
	} catch (error) {
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
		}

		return response;
	} catch (error) {
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
			}
			return response;
		})
		.catch((error) => {
			return cached;
		});

	if (cached && !isExpired(cached, config.maxAge)) {
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

	// Main page - stale while revalidate for real-time data freshness
	if (CACHE_STRATEGIES.MAIN_PAGE.some((page) => pathname === page)) {
		return {
			strategy: "staleWhileRevalidate",
			cacheName: CACHE_NAMES.dynamic,
			maxAge: 300, // 5 minutes - short cache to ensure freshness
			networkTimeoutSeconds: 8,
		};
	}

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

	// API endpoints - shorter cache for real-time data
	if (CACHE_STRATEGIES.API_ENDPOINTS.some((api) => pathname.startsWith(api))) {
		return {
			strategy: "networkFirst",
			cacheName: CACHE_NAMES.api,
			maxAge: 60, // 1 minute - shorter for real-time updates
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
	if (shouldBypassCaching(request)) {
		return fetch(request);
	}

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
		.filter((name) => !currentCaches.some((cacheName) => cacheName === name))
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
	}
}

// ============= Event Listeners =============

self.addEventListener("install", (event: ExtendableEvent) => {
	event.waitUntil(
		Promise.all([
			// Pre-cache critical resources with error handling
			caches
				.open(CACHE_NAMES.static)
				.then((cache) => {
					const urlsToCache = ["/", "/manifest.json"];
					return cache.addAll(urlsToCache).catch((error) => {
						console.warn(
							"Failed to cache some resources during install:",
							error,
						);
						// Continue installation even if caching fails
						return Promise.resolve();
					});
				}),
			// Skip waiting to activate immediately
			self.skipWaiting(),
		]),
	);
});

self.addEventListener("activate", (event: ExtendableEvent) => {
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
	if (event.tag === "background-sync-lotto-data") {
		event.waitUntil(syncLottoData());
	} else if (event.tag === "background-sync-statistics") {
		event.waitUntil(syncStatistics());
	} else if (event.tag === "background-sync-user-preferences") {
		event.waitUntil(syncUserPreferences());
	}
});

// 로또 데이터 백그라운드 동기화
async function syncLottoData(): Promise<void> {
	try {
		// 최신 추첨 결과 가져오기
		const response = await fetch("/api/latest-draw");
		if (response.ok) {
			const latestData = await response.json();

			// 캐시 업데이트
			const cache = await caches.open(CACHE_NAMES.api);
			await cache.put("/api/latest-draw", response.clone());

			// 클라이언트에게 업데이트 알림
			const clients = await self.clients.matchAll();
			for (const client of clients) {
				client.postMessage({
					type: "LOTTO_DATA_UPDATED",
					data: latestData,
				});
			}
		}
	} catch (error) {
		console.error("❌ Background sync failed for lotto data:", error);
		throw error; // 재시도를 위해 에러 다시 던지기
	}
}

// 통계 데이터 백그라운드 동기화
async function syncStatistics(): Promise<void> {
	try {
		const endpoints = [
			"/api/stats/frequency",
			"/api/stats/patterns",
			"/api/stats/trends",
		];
		const cache = await caches.open(CACHE_NAMES.api);

		for (const endpoint of endpoints) {
			try {
				const response = await fetch(endpoint);
				if (response.ok) {
					await cache.put(endpoint, response.clone());
				}
			} catch (error) {
				console.warn(`Failed to sync ${endpoint}:`, error);
			}
		}
	} catch (error) {
		console.error("❌ Background sync failed for statistics:", error);
		throw error;
	}
}

// 사용자 설정 백그라운드 동기화
async function syncUserPreferences(): Promise<void> {
	try {
		console.log("⚙️ Syncing user preferences in background");

		// IndexedDB에서 오프라인 중 변경된 설정 가져오기
		const pendingPreferences = await getPendingPreferences();

		if (pendingPreferences.length > 0) {
			for (const pref of pendingPreferences) {
				try {
					const response = await fetch("/api/user/preferences", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(pref),
					});

					if (response.ok) {
						await removePendingPreference(pref.id);
					}
				} catch (error) {
					console.warn("Failed to sync preference:", pref, error);
				}
			}
		}
	} catch (error) {
		console.error("❌ Background sync failed for user preferences:", error);
		throw error;
	}
}

// IndexedDB 헬퍼 함수들
async function getPendingPreferences(): Promise<PendingPreference[]> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open("645-live-offline", 1);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains("pendingPreferences")) {
				resolve([]);
				return;
			}

			const transaction = db.transaction("pendingPreferences", "readonly");
			const store = transaction.objectStore("pendingPreferences");
			const getAllRequest = store.getAll();

			getAllRequest.onsuccess = () => resolve(getAllRequest.result);
			getAllRequest.onerror = () => reject(getAllRequest.error);
		};

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains("pendingPreferences")) {
				db.createObjectStore("pendingPreferences", { keyPath: "id" });
			}
		};
	});
}

async function removePendingPreference(id: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open("645-live-offline", 1);

		request.onsuccess = () => {
			const db = request.result;
			const transaction = db.transaction("pendingPreferences", "readwrite");
			const store = transaction.objectStore("pendingPreferences");
			const deleteRequest = store.delete(id);

			deleteRequest.onsuccess = () => resolve();
			deleteRequest.onerror = () => reject(deleteRequest.error);
		};
	});
}

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
	} else if (event.data?.type === "REGISTER_BACKGROUND_SYNC") {
		// 백그라운드 동기화 등록
		const { tag } = event.data;
		if (
			"serviceWorker" in navigator &&
			"sync" in window.ServiceWorkerRegistration.prototype
		) {
			self.registration.sync.register(tag).catch(console.error);
		}
	} else if (event.data?.type === "SKIP_WAITING") {
		// 업데이트 시 대기 상태 건너뛰기
		self.skipWaiting();
	}
});

// Push notification 처리
self.addEventListener("push", (event) => {
	let notificationData = {
		title: "645.live",
		body: "새로운 소식이 있습니다!",
		icon: "/assets/icons/icon-192.png",
		badge: "/assets/icons/icon-192.png",
		data: { url: "/" },
	};

	if (event.data) {
		try {
			const data = event.data.json();
			notificationData = { ...notificationData, ...data };
		} catch (error) {
			console.warn("Push 데이터 파싱 실패:", error);
		}
	}

	const options = {
		body: notificationData.body,
		icon: notificationData.icon,
		badge: notificationData.badge,
		data: notificationData.data,
		actions: [
			{
				action: "open",
				title: "열기",
				icon: "/assets/icons/icon-192.png",
			},
			{
				action: "close",
				title: "닫기",
			},
		],
		requireInteraction: false,
		silent: false,
		vibrate: [200, 100, 200],
		tag: "lotto-notification",
	};

	event.waitUntil(
		self.registration.showNotification(notificationData.title, options),
	);
});

// Notification click 처리
self.addEventListener("notificationclick", (event) => {
	event.notification.close();

	if (event.action === "close") {
		return;
	}

	const urlToOpen = event.notification.data?.url || "/";

	event.waitUntil(
		self.clients
			.matchAll({ type: "window", includeUncontrolled: true })
			.then((clientList) => {
				// 이미 열린 창이 있는지 확인
				for (const client of clientList) {
					if (client.url === urlToOpen && "focus" in client) {
						return client.focus();
					}
				}

				// 새 창 열기
				if (self.clients.openWindow) {
					return self.clients.openWindow(urlToOpen);
				}
			}),
	);
});

// 주기적 백그라운드 동기화 (지원되는 브라우저에서)
self.addEventListener("periodicsync", (event) => {
	console.log("⏰ Periodic background sync triggered:", event.tag);

	if (event.tag === "lotto-data-sync") {
		event.waitUntil(syncLottoData());
	}
});

// Export for type checking
export {};
