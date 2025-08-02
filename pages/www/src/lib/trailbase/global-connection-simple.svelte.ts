/**
 * 전역 접속자 관리 및 실시간 업데이트 (단순화된 구조)
 * activeUsersClient를 활용하여 실시간 접속자 수 추적
 */

import { browser } from "$app/environment";
import { 
	subscribeToActiveUsers, 
	getCurrentActiveUsersStats,
	type ActiveUsersStats 
} from "./active-users-client";

// 전역 상태 변수들
let currentSessionId: string | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let currentActiveCount = $state(0);
let isConnected = $state(false);
let unsubscribeActiveUsers: (() => void) | null = null;

// 하트비트 전송 함수
async function sendHeartbeat() {
	if (!currentSessionId) {
		console.warn("[Connection Tracking] No session ID for heartbeat");
		return;
	}

	try {
		const response = await fetch("http://localhost:4000/connection/heartbeat", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				session_id: currentSessionId,
				user_agent: navigator.userAgent,
				page_path: window.location.pathname,
			}),
		});

		if (response.ok) {
			const result = await response.json();
			console.log("[Connection Tracking] Heartbeat sent successfully:", result);
		} else {
			console.error("[Connection Tracking] Heartbeat failed:", response.status);
		}
	} catch (error) {
		console.error("[Connection Tracking] Heartbeat error:", error);
	}
}

// 연결 해제 함수
async function removeConnectionRecord(sessionId: string) {
	try {
		const response = await fetch("http://localhost:4000/connection/disconnect", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				session_id: sessionId,
			}),
		});

		if (response.ok) {
			console.log("[Connection Tracking] Connection removed successfully");
		} else {
			console.error("[Connection Tracking] Failed to remove connection:", response.status);
		}
	} catch (error) {
		console.error("[Connection Tracking] Remove connection error:", error);
	}
}

// 활성 유저 구독 콜백
function handleActiveUsersUpdate(stats: ActiveUsersStats) {
	console.log("[Connection Tracking] Active users update:", stats);
	currentActiveCount = stats.current_count;
	isConnected = true;
}

// 초기화 함수
export async function initializeGlobalConnection(): Promise<void> {
	if (!browser) return;

	console.log("[Connection Tracking] Initializing simple global connection...");

	// 세션 ID 생성
	if (!currentSessionId) {
		currentSessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2)}`;
		console.log("[Connection Tracking] Generated session ID:", currentSessionId);
	}

	// 활성 유저 통계 구독 시작
	if (!unsubscribeActiveUsers) {
		unsubscribeActiveUsers = subscribeToActiveUsers(
			"global-connection",
			handleActiveUsersUpdate
		);
		console.log("[Connection Tracking] Active users subscription started");
	}

	// 초기 통계 조회
	try {
		const initialStats = await getCurrentActiveUsersStats();
		if (initialStats) {
			currentActiveCount = initialStats.current_count;
			console.log("[Connection Tracking] Initial active count:", currentActiveCount);
		}
	} catch (error) {
		console.error("[Connection Tracking] Failed to get initial stats:", error);
	}

	// 하트비트 간격 설정 (30초마다)
	if (!heartbeatInterval) {
		// 초기 하트비트 전송
		await sendHeartbeat();

		heartbeatInterval = setInterval(sendHeartbeat, 30000);
		console.log("[Connection Tracking] Heartbeat interval started (30s)");
	}

	// 페이지 언로드 시 정리
	const cleanupSession = async (event: Event) => {
		if (event.type === "pagehide") {
			const pagehideEvent = event as PageTransitionEvent;
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

	window.addEventListener("beforeunload", cleanupSession);

	console.log("[Connection Tracking] Simple global connection initialized");
}

// 정리 함수
export function cleanupGlobalConnection(): void {
	console.log("[Connection Tracking] Cleaning up global connection...");

	if (heartbeatInterval) {
		clearInterval(heartbeatInterval);
		heartbeatInterval = null;
	}

	if (unsubscribeActiveUsers) {
		unsubscribeActiveUsers();
		unsubscribeActiveUsers = null;
	}

	if (currentSessionId) {
		removeConnectionRecord(currentSessionId);
		currentSessionId = null;
	}

	currentActiveCount = 0;
	isConnected = false;
}

// 외부에서 접근 가능한 반응형 값들
export function getActiveUsersCount(): number {
	return currentActiveCount;
}

export function getConnectionStatus(): boolean {
	return isConnected;
}

// 반응형 getter (Svelte 5 호환)
export const activeUsersCount = {
	get value() {
		return currentActiveCount;
	}
};

export const connectionStatus = {
	get value() {
		return isConnected;
	}
};