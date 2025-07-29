/**
 * 로또 최신 회차 정보를 구하는 유틸리티 함수들
 * SvelteKit 앱에서 사용 - DB 우선, API 폴백
 */

import { env } from "$env/dynamic/public";
import { initClient } from "trailbase";
import {
	type LatestLottoInfo,
	type LottoDrawResult,
	calculateExpectedLatestRound,
	getLatestLottoRoundFromAPI,
	getLottoNumbersFromAPI,
} from "./lotto-common";

// 타입 재수출
export type { LatestLottoInfo, LottoDrawResult };

// 공통 함수 재수출
export { calculateExpectedLatestRound };

/**
 * 현재 시간을 기준으로 스캔 데이터를 보여줄 회차를 결정합니다.
 * - 토요일 20:00 ~ 일요일 06:00: 최신 회차 (발표된 회차)
 * - 일요일 06:00 ~ 다음 토요일 20:00: 다음 회차 (예측할 회차)
 * 서버 시간은 UTC 기준이므로 한국 시간(UTC+9)으로 변환하여 계산
 */
export function calculateDisplayRound(): number {
	// 현재 판매 중인 회차를 보여주기 위해 calculateExpectedLatestRound와 동일한 로직 사용
	return calculateExpectedLatestRound();
}

/**
 * 데이터베이스에서 최신 회차 정보를 조회합니다.
 * lotto_draw_results 테이블에서 가장 최신 회차를 가져옵니다.
 * 데이터베이스 조회 실패시 계산된 예상 회차를 반환합니다.
 */
export async function getLatestLottoRound(): Promise<LatestLottoInfo | null> {
	// 먼저 데이터베이스에서 시도
	try {
		const client = initClient(
			env.PUBLIC_TRAILBASE_URL || "http://localhost:4000",
		);
		const api = client.records("lotto_draw_results");

		const response = await api.list({
			order: ["-round"], // 회차 내림차순으로 정렬하여 최신 회차를 먼저 가져옴
			pagination: { limit: 1 },
		});

		if (response.records && response.records.length > 0) {
			const latestRecord = response.records[0] as unknown as {
				round: number;
				draw_date: string;
			};

			return {
				drwNo: latestRecord.round,
				drwNoDate: latestRecord.draw_date,
			};
		}
	} catch (error) {
		console.warn("Failed to fetch from database:", error);
	}

	// 데이터베이스에서 조회 실패시 계산된 예상 회차 반환
	console.warn("Database fetch failed, using calculated latest round");
	const expectedRound = calculateExpectedLatestRound();

	return {
		drwNo: expectedRound as number,
		drwNoDate: new Date().toISOString().split("T")[0], // 현재 날짜를 YYYY-MM-DD 형식으로
	};
}

/**
 * 데이터베이스에서 특정 회차의 로또 번호 정보를 조회합니다.
 * 실패하면 외부 API로 fallback합니다.
 */
export async function getLottoNumbers(
	drwNo: number,
): Promise<LottoDrawResult | null> {
	// 먼저 데이터베이스에서 시도
	try {
		const client = initClient(
			env.PUBLIC_TRAILBASE_URL || "http://localhost:4000",
		);
		const api = client.records("lotto_draw_results");

		const response = await api.list({
			// TrailBase의 필터 문법에 맞춰서 수정 - 정확한 round 매칭
			pagination: { limit: 100 }, // 충분한 수를 가져와서 클라이언트 사이드에서 필터링
		});

		if (response.records && response.records.length > 0) {
			const targetRecord = response.records.find((record: unknown) => {
				const r = record as { round: number };
				return Number(r.round) === drwNo;
			});

			if (targetRecord) {
				const drawResult = targetRecord as unknown as {
					round: number;
					draw_date: string;
					draw_number_1: number;
					draw_number_2: number;
					draw_number_3: number;
					draw_number_4: number;
					draw_number_5: number;
					draw_number_6: number;
					bonus_number: number;
					first_prize_amount: number;
					first_prize_winner_count: number;
					total_sell_amount: number;
				};

				return {
					drwNo: drawResult.round,
					drwNoDate: drawResult.draw_date,
					drwtNo1: drawResult.draw_number_1,
					drwtNo2: drawResult.draw_number_2,
					drwtNo3: drawResult.draw_number_3,
					drwtNo4: drawResult.draw_number_4,
					drwtNo5: drawResult.draw_number_5,
					drwtNo6: drawResult.draw_number_6,
					bnusNo: drawResult.bonus_number,
					firstWinamnt: drawResult.first_prize_amount,
					firstPrzwnerCo: drawResult.first_prize_winner_count,
					totSellamnt: drawResult.total_sell_amount,
				};
			}
		}
	} catch (error) {
		console.error(`Failed to fetch round ${drwNo} from database:`, error);
	}

	// 데이터베이스에서 조회 실패시 null 반환
	console.error(
		`Failed to fetch lotto numbers for round ${drwNo} from database`,
	);
	return null;
}
