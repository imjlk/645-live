/**
 * QR 스캔 히스토리 관리 유틸리티 (v2 only)
 */

import {
	type QRScanHistoryItem,
	type QRScanHistoryManager,
	type QRScanSyncStrategy,
	QRScanHistoryManagerImpl,
	type QRScanResultStatus,
	deriveScanResultStatus as v2DeriveScanResultStatus,
	generateTicketHash as v2GenerateTicketHash,
	generateScanSummary as v2GenerateScanSummary,
	getRelativeTimeString as v2GetRelativeTimeString,
} from "./qr-scan-history-v2.js";

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
	resultStatus?: QRScanResultStatus;
	isWinner?: boolean;
	winningGrade?: string;
	isUnreleased?: boolean;
}): string {
	return v2GenerateScanSummary(options);
}

export function deriveScanResultStatus(options: {
	resultStatus?: QRScanResultStatus;
	isWinner?: boolean;
	isUnreleased?: boolean;
	summary?: string;
}): QRScanResultStatus {
	return v2DeriveScanResultStatus(options);
}

/**
 * 상대적 시간 표시
 */
export function getRelativeTimeString(date: Date): string {
	return v2GetRelativeTimeString(date);
}

export function generateTicketHash(
	qrData: string,
	round?: number,
	gamesCount?: number,
): string {
	return v2GenerateTicketHash(qrData, round, gamesCount);
}

/**
 * 수동 동기화 트리거 (회원용)
 */
export async function syncHistory(): Promise<{
	success: boolean;
	error?: string;
}> {
	if (!qrScanHistory.getUserId()) {
		return { success: false, error: "로그인이 필요합니다" };
	}

	return await qrScanHistory.sync();
}

// 타입 내보내기 (기존 코드 호환성)
export type {
	QRScanHistoryItem,
	QRScanHistoryManager,
	QRScanResultStatus,
	QRScanSyncStrategy,
};
