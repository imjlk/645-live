/**
 * 전역 TrailBase 연결 상태 관리 및 실시간 접속자 수 추적
 */

import { browser } from "$app/environment";
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

// 자동 초기화 플래그
let autoInitialized = false;

/**
 * 전역 TrailBase 연결을 초기화하고 유지
 */
export async function initializeGlobalConnection() {
	if (!browser) return;
	
	try {
		globalConnectionState.connecting = true;
		notifyConnectionStateSubscribers();
		
		// TrailBase 클라이언트 초기화
		await trailbaseClient.ensureInitialized();
		
		// 연결 상태 구독
		trailbaseClient.subscribeToConnectionState('global', (state) => {
			globalConnectionState = { ...state };
			notifyConnectionStateSubscribers();
		});
		
		// 실시간 접속자 수 추적 시작
		await startActiveUsersTracking();
		
		console.log('Global TrailBase connection initialized');
	} catch (error) {
		console.error('Failed to initialize global TrailBase connection:', error);
		globalConnectionState.error = error as Error;
		globalConnectionState.connecting = false;
		notifyConnectionStateSubscribers();
	}
}

/**
 * 실시간 접속자 수 추적 시작
 */
async function startActiveUsersTracking() {
	try {
		// WebSocket 연결 상태를 기반으로 접속자 수 추적
		// TrailBase에서 connection_count 같은 시스템 메트릭이 있다면 활용
		
		// 임시로 연결 상태 기반으로 접속자 수 시뮬레이션
		// 실제 구현에서는 TrailBase의 WebSocket connection 메트릭 사용
		if (globalConnectionState.connected) {
			// 본인 포함해서 최소 1명
			currentActiveUsers = Math.max(1, currentActiveUsers);
			peakActiveUsers = Math.max(peakActiveUsers, currentActiveUsers);
			
			notifyActiveUsersSubscribers();
		}
		
		// 주기적으로 접속자 수 업데이트 (실제로는 TrailBase 이벤트 기반으로 변경)
		setInterval(() => {
			if (globalConnectionState.connected) {
				// 임시 시뮬레이션 로직 (실제로는 TrailBase 메트릭 사용)
				const variation = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
				currentActiveUsers = Math.max(1, currentActiveUsers + variation);
				peakActiveUsers = Math.max(peakActiveUsers, currentActiveUsers);
				
				notifyActiveUsersSubscribers();
			}
		}, 30000); // 30초마다 업데이트
		
	} catch (error) {
		console.error('Failed to start active users tracking:', error);
	}
}

/**
 * 전역 연결 상태 구독
 */
export function subscribeToGlobalConnection(callback: (state: ConnectionState) => void): () => void {
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
export function subscribeToActiveUsers(callback: (count: number, peak: number) => void): () => void {
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

/**
 * 자동 초기화 (앱 시작 시 한 번만 실행)
 */
export function enableAutoInitialization() {
	if (!browser || autoInitialized) return;
	
	autoInitialized = true;
	
	// 페이지 로드 후 자동으로 연결 초기화
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initializeGlobalConnection);
	} else {
		initializeGlobalConnection();
	}
	
	// 페이지 언로드 시 정리
	window.addEventListener('beforeunload', () => {
		connectionStateSubscribers.clear();
		activeUsersSubscribers.clear();
	});
}

// 내부 헬퍼 함수들
function notifyConnectionStateSubscribers() {
	connectionStateSubscribers.forEach(callback => {
		try {
			callback(globalConnectionState);
		} catch (error) {
			console.error('Error in connection state subscriber:', error);
		}
	});
}

function notifyActiveUsersSubscribers() {
	activeUsersSubscribers.forEach(callback => {
		try {
			callback(currentActiveUsers, peakActiveUsers);
		} catch (error) {
			console.error('Error in active users subscriber:', error);
		}
	});
}

// Svelte 5 runes 기반 reactive getters (컴포넌트에서 사용)
export const globalConnection = {
	get state() { return globalConnectionState; },
	get activeUsers() { return currentActiveUsers; },
	get peakUsers() { return peakActiveUsers; }
};