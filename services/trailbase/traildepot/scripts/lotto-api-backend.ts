/**
 * 백엔드용 로또 API 유틸리티 함수들
 * 데이터베이스에서 직접 조회합니다.
 */

import { query } from "../trailbase.js";

/**
 * 현재 날짜를 기준으로 예상되는 최신 회차를 계산합니다.
 * 로또는 매주 토요일 추첨이며, 1회가 2002년 12월 7일에 시작되었습니다.
 */
export function calculateExpectedLatestRound(): number {
	const firstDrawDate = new Date("2002-12-07"); // 1회 추첨일
	const now = new Date();

	// 첫 추첨일부터 현재까지의 주 수 계산
	const timeDiff = now.getTime() - firstDrawDate.getTime();
	const weeksDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 7));

	// 예상 회차 (1회 + 경과한 주 수)
	return 1 + weeksDiff;
}

/**
 * 데이터베이스에서 최신 회차 정보를 조회합니다.
 * lotto_draw_results 테이블에서 가장 최신 회차를 가져옵니다.
 */
export async function getLatestLottoRoundFromDB(): Promise<number | null> {
	try {
		const result = await query(
			`
			SELECT round FROM lotto_draw_results 
			ORDER BY round DESC 
			LIMIT 1
		`,
			[],
		);

		if (result.length > 0) {
			const record = result[0] as unknown as { round: number };
			return record.round;
		}

		// 데이터베이스에 데이터가 없으면 계산된 예상 회차 반환
		console.warn(
			"No lotto draw results found in database, using calculated round",
		);
		return calculateExpectedLatestRound();
	} catch (error) {
		console.error("Error fetching latest lotto round from database:", error);

		// 에러가 발생하면 계산된 예상 회차 반환
		return calculateExpectedLatestRound();
	}
}
