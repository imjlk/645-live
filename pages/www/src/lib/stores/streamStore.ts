/**
 * 전역 스트림 관리 스토어 (호환성 유지)
 * 새로운 TrailBase client로 마이그레이션됨
 */

import { 
	trailbaseClient,
	subscribeToScanCountUpdates as newSubscribeToScanCountUpdates,
	getScanDataSafely as newGetScanDataSafely,
	getLatestScanData as newGetLatestScanData
} from "$lib/trailbase/client";
import type { LottoDrawScanCount } from "$lib/trailbase/types";
import { writable } from "svelte/store";

// 타입은 새로운 클라이언트에서 re-export
export type { LottoDrawScanCount };

// 구독자 콜백 타입
type SubscriberCallback = (data: LottoDrawScanCount) => void;

// 편의 함수들 (기존 API와 호환성 유지)
export const streamStore = writable<LottoDrawScanCount | null>(null);

// 스트림 구독 헬퍼 함수 - 새로운 클라이언트로 위임
export function subscribeToScanCountUpdates(
	id: string,
	callback: SubscriberCallback,
) {
	return newSubscribeToScanCountUpdates(id, callback);
}

// API 접근 헬퍼 함수 - 더 이상 필요하지 않음 (deprecated)
// Removed to eliminate deprecation warnings

// 안전한 스캔 데이터 조회 헬퍼 함수 - 새로운 클라이언트로 위임
export function getScanDataSafely(round: number) {
	return newGetScanDataSafely(round);
}

// 최신 스캔 데이터 조회 헬퍼 함수 - 새로운 클라이언트로 위임
export function getLatestScanData() {
	return newGetLatestScanData();
}

// 새로운 client 인스턴스도 export (마이그레이션 지원)
export { trailbaseClient as globalStreamManager };
