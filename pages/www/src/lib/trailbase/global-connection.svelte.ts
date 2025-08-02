/**
 * 전역 TrailBase 연결 상태 관리 및 실시간 접속자 수 추적
 */

import { browser } from "$app/environment";
import { activeUsersClient } from "./active-users-client.svelte";
import { trailbaseClient } from "./client";
import type { ConnectionState } from "./types";

// 전역 연결 상태
let globalConnectionState = $state<ConnectionState>({
	connected: false,
	connecting: false,
	error: null,
	lastConnected: null,
	retryCount: 0,
});

// 실시간 접속자 수
let currentActiveUsers = $state<number>(0);
let peakActiveUsers = $state<number>(0);

// 연결 상태 구독자들
const connectionStateSubscribers = new Set<(state: ConnectionState) => void>();

// 접속자 수 구독자들
const activeUsersSubscribers = new Set<(count: number, peak: number) => void>();

// 초기화 상태 관리
let isInitialized = false;
let isInitializing = false;
let initializationPromise: Promise<void> | null = null;

/**
 * 전역 TrailBase 연결을 초기화하고 유지 (한 번만 실행)
 */
export async function initializeGlobalConnection(): Promise<void> {
	console.log("🔄 initializeGlobalConnection called, browser:", browser);

	if (!browser) {
		console.log("❌ Not in browser, skipping initializeGlobalConnection");
		return;
	}

	// 이미 초기화되었거나 초기화 중이면 기존 Promise 반환
	if (isInitialized) {
		console.log("✅ Global TrailBase connection already initialized");
		return;
	}

	if (isInitializing && initializationPromise) {
		console.log(
			"⏳ Global TrailBase connection initialization in progress, waiting...",
		);
		return initializationPromise;
	}

	isInitializing = true;
	console.log("🚀 Starting global TrailBase connection initialization...");

	initializationPromise = (async () => {
		try {
			console.log("🔧 Initializing global TrailBase connection...");

			globalConnectionState.connecting = true;
			notifyConnectionStateSubscribers();

			// 연결 상태 구독 (중복 구독 방지)
			// TrailBase 클라이언트는 싱글톤으로 자동 초기화됨
			console.log("📡 Setting up connection state subscription...");
			trailbaseClient.subscribeToConnectionState(
				"global-persistent",
				(state) => {
					console.log("🔗 Connection state changed:", state);
					globalConnectionState = { ...state };
					notifyConnectionStateSubscribers();
				},
			);

			// 실시간 접속자 수 추적 시작
			console.log("👥 Starting active users tracking...");
			await startActiveUsersTracking();

			// active_connections 테이블 변경 사항 구독
			await subscribeToActiveConnectionsChanges();

			isInitialized = true;
			console.log("✅ Global TrailBase connection initialized successfully");
		} catch (error) {
			console.error(
				"❌ Failed to initialize global TrailBase connection:",
				error,
			);
			globalConnectionState.error = error as Error;
			globalConnectionState.connecting = false;
			notifyConnectionStateSubscribers();
			throw error;
		} finally {
			isInitializing = false;
		}
	})();

	return initializationPromise;
}

// 접속자 수 추적을 위한 interval ID
let activeUsersIntervalId: number | null = null;

// 현재 세션 ID (각 탭/창별 고유)
let currentSessionId: string | null = null;

/**
 * TrailBase를 통해 실제 활성 WebSocket 연결 수를 조회
 * 연결 추적용 테이블을 사용하여 실제 연결 상태를 추적
 */
async function getActiveConnectionCount(): Promise<number> {
	try {
		// TrailBase 연결 추적 테이블을 통해 실제 활성 연결 수 조회
		return await trackConnectionsViaTrailBase();
	} catch (error) {
		console.error("Error getting active connection count:", error);
		// 에러 시 시뮬레이션 사용
		return await simulateRealisticUserCount();
	}
}

/**
 * TrailBase 테이블을 사용한 실제 연결 추적
 */
async function trackConnectionsViaTrailBase(): Promise<number> {
	try {
		// 현재 세션 ID가 없으면 생성
		if (!currentSessionId) {
			currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

			console.log(
				`[Connection Tracking] Generated session ID: ${currentSessionId}`,
			);

			// 페이지 언로드 시 연결 기록 제거 (실제 페이지 떠날 때만)
			const cleanupSession = async (event: Event) => {
				// SPA 라우팅 중에는 정리하지 않음
				if (event.type === "pagehide") {
					const pagehideEvent = event as PageTransitionEvent;
					// persisted가 true면 bfcache에 저장되는 것이므로 실제 언로드가 아님
					if (pagehideEvent.persisted) {
						console.log('[Connection Tracking] Page cached, not disconnecting');
						return;
					}
				}
				
				if (currentSessionId) {
					console.log('[Connection Tracking] Cleaning up session on page unload');
					await removeConnectionRecord(currentSessionId);
				}
			};

			// beforeunload만 사용 (실제 페이지 떠날 때만)
			window.addEventListener("beforeunload", cleanupSession);
			// pagehide는 SPA에서 너무 자주 트리거되므로 제거
			// window.addEventListener("pagehide", cleanupSession);
		}

		// 현재 연결을 TrailBase에 등록/업데이트
		await updateConnectionRecord(currentSessionId);

		// 활성 연결 수 조회
		return await getActiveConnectionsFromTrailBase();
	} catch (error) {
		console.error("Error tracking connections via TrailBase:", error);
		// TrailBase 에러 시 시뮬레이션으로 폴백
		return await simulateRealisticUserCount();
	}
}

/**
 * TrailBase에 연결 기록 업데이트 - 커스텀 라우트 사용
 */
async function updateConnectionRecord(sessionId: string): Promise<void> {
	try {
		// TrailBase 커스텀 heartbeat 라우트 호출
		const { env } = await import("$env/dynamic/public");
		const baseUrl = env.PUBLIC_TRAILBASE_URL || "http://localhost:4000";

		const requestBody = {
			session_id: sessionId,
			user_agent: navigator.userAgent,
			page_path: window.location.pathname,
		};

		console.log(
			"[Connection Tracking] Sending heartbeat to:",
			`${baseUrl}/connection/heartbeat`,
		);
		console.log("[Connection Tracking] Request body:", requestBody);

		const response = await fetch(`${baseUrl}/connection/heartbeat`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
		});

		console.log(
			"[Connection Tracking] Response status:",
			response.status,
			response.statusText,
		);

		if (!response.ok) {
			const errorText = await response.text();
			console.error("[Connection Tracking] Error response:", errorText);
			throw new Error(
				`HTTP ${response.status}: ${response.statusText} - ${errorText}`,
			);
		}

		const result = (await response.json()) as {
			success?: boolean;
			active_count?: number;
			error?: string;
		};
		console.log("[Connection Tracking] Response result:", result);

		if (result.success) {
			console.log(
				`[Connection Tracking] Session ${sessionId} heartbeat sent, active: ${result.active_count}`,
			);
		} else {
			console.error("Connection heartbeat failed:", result.error);
			throw new Error(result.error || "Unknown error");
		}
	} catch (error) {
		console.error("Error updating connection record:", error);
		throw error;
	}
}

/**
 * TrailBase에서 활성 연결 수 조회
 */
async function getActiveConnectionsFromTrailBase(): Promise<number> {
	try {
		// TrailBase client에서 active_connections 테이블 API 가져오기
		const { initClient } = await import("trailbase");
		const { env } = await import("$env/dynamic/public");
		const client = initClient(
			env.PUBLIC_TRAILBASE_URL || "http://localhost:4000",
		);
		const api = client.records("active_connections");

		// 2분 이내에 업데이트된 연결 수 조회 (트리거에서 5분 후 자동 삭제하므로 2분으로 더 엄격하게)
		const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

		const response = await api.list({
			filters: [
				{
					column: "last_seen",
					op: "greaterThan",
					value: twoMinutesAgo,
				},
			],
			pagination: { limit: 100 }, // 최대 100명까지 조회
		});

		const activeCount = response.records?.length || 0;
		console.log(`[Connection Tracking] Active connections: ${activeCount}`);

		// 0이면 시뮬레이션으로 폴백
		if (activeCount === 0) {
			console.log(`[Connection Tracking] No active connections found, using simulation`);
			return Math.max(1, await simulateRealisticUserCount());
		}
		
		return Math.max(1, activeCount);
	} catch (error) {
		console.warn(
			"Error getting active connections from TrailBase, using simulation:",
			error,
		);
		// TrailBase 에러 시 또는 0 결과 시 시뮬레이션으로 폴백
		return Math.max(1, await simulateRealisticUserCount());
	}
}

/**
 * TrailBase에서 연결 기록 제거 - 커스텀 라우트 사용
 */
async function removeConnectionRecord(sessionId: string): Promise<void> {
	try {
		// TrailBase 커스텀 disconnect 라우트 호출
		const { env } = await import("$env/dynamic/public");
		const baseUrl = env.PUBLIC_TRAILBASE_URL || "http://localhost:4000";

		const response = await fetch(`${baseUrl}/connection/disconnect`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				session_id: sessionId,
			}),
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const result = (await response.json()) as {
			success?: boolean;
			active_count?: number;
			error?: string;
		};

		if (result.success) {
			console.log(
				`[Connection Tracking] Session ${sessionId} disconnected, active: ${result.active_count}`,
			);
		} else {
			console.warn("Connection disconnect failed:", result.error);
		}
	} catch (error) {
		// 삭제 실패는 로그만 남기고 넘어감 (이미 삭제되었거나 존재하지 않을 수 있음)
		console.warn("Error removing connection record:", error);
	}
}

/**
 * active_connections 테이블을 직접 구독하여 실시간으로 접속자 수 계산 및 업데이트
 */
async function subscribeToActiveConnectionsChanges() {
	try {
		// TrailBase 직접 구독 방식 시도
		const { initClient } = await import("trailbase");
		const { env } = await import("$env/dynamic/public");
		const client = initClient(
			env.PUBLIC_TRAILBASE_URL || "http://localhost:4000",
		);
		const api = client.records("active_connections");

		console.log("[Active Connections] Setting up direct subscription...");

		// active_connections 테이블 직접 구독
		const stream = await api.subscribe(1);
		const reader = stream.getReader();

		// 스트림 읽기 시작
		const processStream = async () => {
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					console.log("[Active Connections] Change detected:", value);

					// 연결 변화가 있을 때마다 현재 활성 연결 수 계산
					await calculateActiveUsersFromConnections();
				}
			} catch (error) {
				console.error("[Active Connections] Stream error:", error);
			}
		};

		processStream();

		// active_users_stats 테이블도 구독 (백업용)
		activeUsersClient.subscribe("global-active-users", (data) => {
			console.log("[Active Users] Stats update received:", data);

			// 접속자 수 업데이트 (active_connections 구독이 실패할 경우의 백업)
			if (data.current_count !== currentActiveUsers) {
				console.log(`[Active Users] Fallback update: ${data.current_count}`);
			}
		});

		console.log("✅ Active connections subscription started");
	} catch (error) {
		console.error(
			"❌ Failed to subscribe to active connections changes:",
			error,
		);
	}
}

/**
 * active_connections 테이블에서 실시간으로 활성 연결 수 계산
 */
async function calculateActiveUsersFromConnections() {
	try {
		// 2분 이내에 업데이트된 연결 수 조회
		const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

		const { initClient } = await import("trailbase");
		const { env } = await import("$env/dynamic/public");
		const client = initClient(
			env.PUBLIC_TRAILBASE_URL || "http://localhost:4000",
		);
		const api = client.records("active_connections");

		const response = await api.list({
			filters: [
				{
					column: "last_seen",
					op: "greaterThan",
					value: twoMinutesAgo,
				},
			],
			pagination: { limit: 100 },
		});

		const activeCount = response.records?.length || 0;
		console.log(`[Active Connections] Calculated active users: ${activeCount}`);

		// 접속자 수가 변경되었을 때만 업데이트
		if (activeCount !== currentActiveUsers) {
			currentActiveUsers = Math.max(0, activeCount);
			peakActiveUsers = Math.max(peakActiveUsers, currentActiveUsers);
			notifyActiveUsersSubscribers();

			console.log(
				`[Active Connections] Updated: ${currentActiveUsers}, Peak: ${peakActiveUsers}`,
			);
		}
	} catch (error) {
		console.error(
			"❌ Failed to calculate active users from connections:",
			error,
		);
	}
}

/**
 * 실제적인 사용자 수 시뮬레이션
 * 실제 서버 구현 전까지 임시 사용
 */
async function simulateRealisticUserCount(): Promise<number> {
	// 시간대별로 다른 사용자 수 패턴 시뮬레이션
	const hour = new Date().getHours();

	let baseUsers: number;
	if (hour >= 9 && hour <= 18) {
		// 주간 시간대: 3-15명
		baseUsers = Math.floor(Math.random() * 13) + 3;
	} else if (hour >= 19 && hour <= 23) {
		// 저녁 시간대: 5-20명
		baseUsers = Math.floor(Math.random() * 16) + 5;
	} else {
		// 새벽/밤 시간대: 1-8명
		baseUsers = Math.floor(Math.random() * 8) + 1;
	}

	// 주말에는 사용자 수 증가
	const dayOfWeek = new Date().getDay();
	if (dayOfWeek === 0 || dayOfWeek === 6) {
		baseUsers = Math.floor(baseUsers * 1.3);
	}

	// 로또 추첨일(토요일)에는 더 증가
	if (dayOfWeek === 6) {
		baseUsers = Math.floor(baseUsers * 1.8);
	}

	return Math.max(1, baseUsers);
}

/**
 * 실시간 접속자 수 추적 시작 (한 번만 실행)
 */
async function startActiveUsersTracking() {
	// 이미 추적이 시작되었으면 스킵
	if (activeUsersIntervalId !== null) {
		console.log("Active users tracking already started");
		return;
	}

	try {
		console.log("Starting active users tracking...");

		// 초기 연결 등록 및 접속자 수 설정
		await trackConnectionsViaTrailBase();
		await calculateActiveUsersFromConnections();

		// 주기적으로 heartbeat 전송하여 연결 상태 유지
		activeUsersIntervalId = setInterval(async () => {
			if (currentSessionId) {
				try {
					console.log(`[Heartbeat Timer] Sending periodic heartbeat for session: ${currentSessionId}`);
					// heartbeat를 통해 연결 상태 유지
					await updateConnectionRecord(currentSessionId);
					// 주기적으로 활성 연결 수 재계산 (구독이 놓친 경우 대비)
					await calculateActiveUsersFromConnections();
				} catch (error) {
					console.warn("Failed to send heartbeat:", error);
				}
			} else {
				console.log('[Heartbeat Timer] No session ID available for heartbeat');
			}
		}, 30000) as unknown as number; // 30초마다 heartbeat

		console.log("✅ Active users tracking started");
	} catch (error) {
		console.error("❌ Failed to start active users tracking:", error);
	}
}

/**
 * 접속자 수 추적 중지 (필요 시)
 */
function stopActiveUsersTracking() {
	if (activeUsersIntervalId !== null) {
		clearInterval(activeUsersIntervalId);
		activeUsersIntervalId = null;
		console.log("Active users tracking stopped");
	}
}

/**
 * 전역 연결 상태 구독
 */
export function subscribeToGlobalConnection(
	callback: (state: ConnectionState) => void,
): () => void {
	connectionStateSubscribers.add(callback);

	// 현재 상태 즉시 전달
	callback(globalConnectionState);

	return () => {
		connectionStateSubscribers.delete(callback);
	};
}

/**
 * 실시간 접속자 수 구독
 */
export function subscribeToActiveUsers(
	callback: (count: number, peak: number) => void,
): () => void {
	activeUsersSubscribers.add(callback);

	// 현재 상태 즉시 전달
	callback(currentActiveUsers, peakActiveUsers);

	return () => {
		activeUsersSubscribers.delete(callback);
	};
}

/**
 * 전역 연결 상태 getter
 */
export function getGlobalConnectionState(): ConnectionState {
	return { ...globalConnectionState };
}

/**
 * 현재 접속자 수 getter
 */
export function getCurrentActiveUsers(): { current: number; peak: number } {
	return { current: currentActiveUsers, peak: peakActiveUsers };
}

/**
 * 전역 연결 상태 디버그 정보
 */
export function getGlobalConnectionDebugInfo() {
	return {
		isInitialized,
		isInitializing,
		autoInitialized,
		connectionState: globalConnectionState,
		activeUsers: currentActiveUsers,
		peakUsers: peakActiveUsers,
		subscribersCount: {
			connection: connectionStateSubscribers.size,
			activeUsers: activeUsersSubscribers.size,
		},
	};
}

/**
 * 연결 재시도
 */
export async function retryGlobalConnection() {
	if (globalConnectionState.connecting) return;

	try {
		globalConnectionState.connecting = true;
		globalConnectionState.error = null;
		notifyConnectionStateSubscribers();

		await trailbaseClient.reconnect();
	} catch (error) {
		globalConnectionState.error = error as Error;
		globalConnectionState.connecting = false;
		notifyConnectionStateSubscribers();
	}
}

// auto initialization 상태
let autoInitialized = false;

/**
 * 자동 초기화 (앱 전체에서 한 번만 실행)
 */
export function enableAutoInitialization() {
	console.log("🚀 enableAutoInitialization called, browser:", browser);

	if (!browser) {
		console.log("❌ Not in browser, skipping initialization");
		return;
	}

	// 이미 자동 초기화가 활성화되었으면 스킵
	if (autoInitialized) {
		console.log("Auto initialization already enabled");
		return;
	}

	autoInitialized = true;
	console.log(
		"✅ Enabling auto initialization for global TrailBase connection",
	);

	// 즉시 초기화 시작
	initializeGlobalConnection().catch((error) => {
		console.error("Auto initialization failed:", error);
	});

	// 페이지 언로드 시 정리 (한 번만 등록)
	window.addEventListener(
		"beforeunload",
		() => {
			stopActiveUsersTracking();
			connectionStateSubscribers.clear();
			activeUsersSubscribers.clear();
			console.log("Global connection cleaned up on page unload");
		},
		{ once: true },
	);

	// SPA 라우팅에서도 연결 유지되도록 설정
	// SvelteKit의 페이지 전환은 실제 페이지 리로드가 아니므로 연결이 유지됨

	// 개발 모드에서 디버깅을 위해 전역 함수 노출
	if (import.meta.env.DEV) {
		(window as unknown as Record<string, unknown>).__trailbaseDebug = {
			getDebugInfo: getGlobalConnectionDebugInfo,
			getConnectionState: getGlobalConnectionState,
			getCurrentUsers: getCurrentActiveUsers,
			retry: retryGlobalConnection,
		};
		console.log("🛠️ TrailBase debug tools available at window.__trailbaseDebug");
	}
}

// 내부 헬퍼 함수들
function notifyConnectionStateSubscribers() {
	for (const callback of connectionStateSubscribers.values()) {
		try {
			callback(globalConnectionState);
		} catch (error) {
			console.error("Error in connection state subscriber:", error);
		}
	}
}

function notifyActiveUsersSubscribers() {
	for (const callback of activeUsersSubscribers.values()) {
		try {
			callback(currentActiveUsers, peakActiveUsers);
		} catch (error) {
			console.error("Error in active users subscriber:", error);
		}
	}
}

// Svelte 5 runes 기반 reactive getters (컴포넌트에서 사용)
export const globalConnection = {
	get state() {
		return globalConnectionState;
	},
	get activeUsers() {
		return currentActiveUsers;
	},
	get peakUsers() {
		return peakActiveUsers;
	},
};
