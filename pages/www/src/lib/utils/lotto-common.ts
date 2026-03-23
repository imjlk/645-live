/**
 * 로또 관련 공통 타입과 유틸리티 함수들
 */

export interface LatestLottoInfo {
	drwNo: number;
	drwNoDate: string;
}

export interface LottoDrawResult {
	drwNo: number;
	drwNoDate: string;
	drwtNo1: number;
	drwtNo2: number;
	drwtNo3: number;
	drwtNo4: number;
	drwtNo5: number;
	drwtNo6: number;
	bnusNo: number;
	firstWinamnt: number;
	firstPrzwnerCo: number;
	totSellamnt: number;
}

/**
 * 현재 날짜를 기준으로 예상되는 최신 회차를 계산합니다.
 * 로또는 매주 토요일 추첨이며, 1회가 2002년 12월 7일에 시작되었습니다.
 */
export function calculateExpectedLatestRound(): number {
	const firstDrawDate = new Date("2002-12-07"); // 1회 추첨일 (토요일)

	// UTC 시간을 한국 시간으로 변환
	const utcNow = new Date();
	const koreaTime = new Date(utcNow.getTime() + 9 * 60 * 60 * 1000);

	// 첫 추첨일부터 현재까지의 주 수 계산
	const timeDiff = koreaTime.getTime() - firstDrawDate.getTime();
	const weeksDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 7));

	const dayOfWeek = koreaTime.getDay(); // 0=일요일, 6=토요일

	// 기본 예상 회차 (1회 + 경과한 주 수)
	let expectedRound = 1 + weeksDiff;

	// 일요일 0시부터 새 판매 회차로 전환합니다.
	// 월요일~금요일은 항상 다음 회차를 판매 중입니다.
	if (dayOfWeek === 0) {
		expectedRound += 1;
	} else if (dayOfWeek >= 1 && dayOfWeek < 6) {
		expectedRound += 1;
	}

	return expectedRound;
}

/**
 * Trailbase API를 통해 최신 회차 정보를 조회합니다.
 */
export async function getLatestLottoRoundFromAPI(): Promise<LatestLottoInfo | null> {
	try {
		// Import the lotto-api functions dynamically to avoid circular imports
		const { getLatestLottoRound } = await import("./lotto-api.js");
		return await getLatestLottoRound();
	} catch (error) {
		console.error("Error getting latest lotto round from Trailbase:", error);

		// Fallback to calculated expected round
		const expectedRound = calculateExpectedLatestRound();
		return {
			drwNo: expectedRound as number,
			drwNoDate: new Date().toISOString().split("T")[0],
		};
	}
}

/**
 * Trailbase API를 통해 특정 회차의 로또 번호 정보를 조회합니다.
 */
export async function getLottoNumbersFromAPI(
	drwNo: number,
): Promise<LottoDrawResult | null> {
	try {
		// Import the lotto-api functions dynamically to avoid circular imports
		const { getLottoNumbers } = await import("./lotto-api.js");
		return await getLottoNumbers(drwNo);
	} catch (error) {
		console.error(`Error fetching lotto numbers for round ${drwNo}:`, error);
		return null;
	}
}
