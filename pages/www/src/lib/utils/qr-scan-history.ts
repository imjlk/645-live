/**
 * QR 스캔 히스토리 관리 유틸리티 (v2 only)
 */

import { 
	QRScanHistoryManagerImpl, 
	generateScanSummary as v2GenerateScanSummary,
	getRelativeTimeString as v2GetRelativeTimeString,
	type QRScanHistoryItem,
	type QRScanHistoryManager
} from './qr-scan-history-v2.js';

/**
 * 전역 QR 스캔 히스토리 매니저 인스턴스 (v2 직접 사용)
 */
export const qrScanHistory = new QRScanHistoryManagerImpl();

/**
 * v2 매니저에 직접 접근 (기존 코드 호환성)
 */
export const qrScanHistoryV2 = qrScanHistory;

/**
 * QR 스캔 결과로부터 요약 텍스트 생성
 */
export function generateScanSummary(options: {
	round?: number;
	gamesCount?: number;
	isWinner?: boolean;
	winningGrade?: string;
	isUnreleased?: boolean;
}): string {
	return v2GenerateScanSummary(options);
}

/**
 * 상대적 시간 표시
 */
export function getRelativeTimeString(date: Date): string {
	return v2GetRelativeTimeString(date);
}

/**
 * 수동 동기화 트리거 (회원용)
 */
export async function syncHistory(): Promise<{ success: boolean; error?: string }> {
	if (!qrScanHistory.getUserId()) {
		return { success: false, error: '로그인이 필요합니다' };
	}

	return await qrScanHistory.sync();
}

// 타입 내보내기 (기존 코드 호환성)
export type { QRScanHistoryItem, QRScanHistoryManager };