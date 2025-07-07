/**
 * 로또 스크립트용 API 유틸리티 함수들
 * SvelteKit 환경이 아닌 곳에서 사용하기 위한 버전
 */

import {
	type LatestLottoInfo,
	type LottoDrawResult,
	getLatestLottoRoundFromAPI,
	getLottoNumbersFromAPI,
} from "./lotto-common.js";

/**
 * 동행복권 API를 통해 최신 회차 정보를 조회합니다.
 * 스크립트용 - DB를 사용하지 않고 API만 사용
 */
export async function getLatestLottoRound(): Promise<LatestLottoInfo | null> {
	return await getLatestLottoRoundFromAPI();
}

/**
 * 특정 회차의 로또 번호 정보를 조회합니다.
 * 스크립트용 - DB를 사용하지 않고 API만 사용
 */
export async function getLottoNumbers(
	drwNo: number,
): Promise<LottoDrawResult | null> {
	return await getLottoNumbersFromAPI(drwNo);
}

// 타입 재수출
export type { LatestLottoInfo, LottoDrawResult };
