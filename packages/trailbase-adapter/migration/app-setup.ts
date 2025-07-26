/**
 * 앱 전체 TrailBase adapter 설정
 * SvelteKit 앱의 main entry point에서 사용
 */

import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
import { getAdapter, resetAdapter } from '@645live/trailbase-adapter';
import type { BaseRecord } from '@645live/trailbase-adapter';

// 앱별 레코드 타입 정의
export interface LottoDrawScanCount extends BaseRecord {
	round: number;
	scan_count_1: number;
	scan_count_2: number;
	scan_count_3: number;
	scan_count_4: number;
	scan_count_5: number;
	scan_count_6: number;
	scan_count_7: number;
	scan_count_8: number;
	scan_count_9: number;
	scan_count_10: number;
	scan_count_11: number;
	scan_count_12: number;
	scan_count_13: number;
	scan_count_14: number;
	scan_count_15: number;
	scan_count_16: number;
	scan_count_17: number;
	scan_count_18: number;
	scan_count_19: number;
	scan_count_20: number;
	scan_count_21: number;
	scan_count_22: number;
	scan_count_23: number;
	scan_count_24: number;
	scan_count_25: number;
	scan_count_26: number;
	scan_count_27: number;
	scan_count_28: number;
	scan_count_29: number;
	scan_count_30: number;
	scan_count_31: number;
	scan_count_32: number;
	scan_count_33: number;
	scan_count_34: number;
	scan_count_35: number;
	scan_count_36: number;
	scan_count_37: number;
	scan_count_38: number;
	scan_count_39: number;
	scan_count_40: number;
	scan_count_41: number;
	scan_count_42: number;
	scan_count_43: number;
	scan_count_44: number;
	scan_count_45: number;
	total_scans: number;
	updated_at: string;
}

/**
 * TrailBase adapter 초기화
 * 앱 시작 시 한 번만 호출
 */
export function initializeTrailBaseAdapter() {
	if (!browser) return;

	try {
		const adapter = getAdapter<LottoDrawScanCount>({
			url: env.PUBLIC_TRAILBASE_URL || 'http://localhost:4000',
			reconnect: {
				maxAttempts: 5,
				baseDelay: 1000,
				maxDelay: 30000,
				jitter: true,
			},
			cache: {
				enabled: true,
				ttl: 30000, // 30초 캐시
			},
		});

		console.log('✅ TrailBase adapter initialized');
		return adapter;
	} catch (error) {
		console.error('❌ Failed to initialize TrailBase adapter:', error);
		throw error;
	}
}

/**
 * 앱 종료 시 정리
 */
export function cleanupTrailBaseAdapter() {
	try {
		resetAdapter();
		console.log('✅ TrailBase adapter cleaned up');
	} catch (error) {
		console.error('❌ Failed to cleanup TrailBase adapter:', error);
	}
}

/**
 * 편의 함수: 타입이 지정된 adapter 가져오기
 */
export function getLottoAdapter() {
	return getAdapter<LottoDrawScanCount>();
}

/**
 * 편의 함수: 특정 라운드의 스캔 데이터 가져오기
 */
export async function getScanDataForRound(round: number): Promise<LottoDrawScanCount | null> {
	try {
		const adapter = getLottoAdapter();
		return await adapter.findOne('lotto_draw_scan_counts', round);
	} catch (error) {
		console.error(`Failed to get scan data for round ${round}:`, error);
		return null;
	}
}

/**
 * 편의 함수: 최신 스캔 데이터 가져오기
 */
export async function getLatestScanData(): Promise<LottoDrawScanCount | null> {
	try {
		const adapter = getLottoAdapter();
		const result = await adapter.findMany('lotto_draw_scan_counts', {
			order: ['-round'],
			limit: 1,
		});
		return result.records[0] || null;
	} catch (error) {
		console.error('Failed to get latest scan data:', error);
		return null;
	}
}

/**
 * 편의 함수: 최근 N개 라운드 데이터 가져오기
 */
export async function getRecentScanData(limit = 10): Promise<LottoDrawScanCount[]> {
	try {
		const adapter = getLottoAdapter();
		const result = await adapter.findMany('lotto_draw_scan_counts', {
			order: ['-round'],
			limit,
		});
		return result.records;
	} catch (error) {
		console.error(`Failed to get recent scan data (limit: ${limit}):`, error);
		return [];
	}
}