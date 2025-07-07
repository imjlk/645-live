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
	const firstDrawDate = new Date("2002-12-07"); // 1회 추첨일
	const now = new Date();

	// 첫 추첨일부터 현재까지의 주 수 계산
	const timeDiff = now.getTime() - firstDrawDate.getTime();
	const weeksDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 7));

	// 예상 회차 (1회 + 경과한 주 수)
	return 1 + weeksDiff;
}

/**
 * 동행복권 API를 통해 최신 회차 정보를 조회합니다.
 */
export async function getLatestLottoRoundFromAPI(): Promise<LatestLottoInfo | null> {
	const expectedRound = calculateExpectedLatestRound();

	// 예상 회차부터 역순으로 최대 10회차까지 확인
	for (let round = expectedRound; round > expectedRound - 10; round--) {
		try {
			const response = await fetch(
				`https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${round}`,
			);

			if (!response.ok) continue;

			const data = (await response.json()) as {
				returnValue: string;
				drwNo?: number;
				drwNoDate?: string;
			};

			// returnValue가 "success"이고 drwNo가 존재하면 유효한 회차
			if (data.returnValue === "success" && data.drwNo) {
				return {
					drwNo: data.drwNo,
					drwNoDate: data.drwNoDate || "",
				};
			}
		} catch (error) {
			console.warn(`Failed to fetch round ${round}:`, error);
		}
	}

	return null;
}

/**
 * 특정 회차의 로또 번호 정보를 조회합니다.
 */
export async function getLottoNumbersFromAPI(
	drwNo: number,
): Promise<LottoDrawResult | null> {
	try {
		const response = await fetch(
			`https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${drwNo}`,
		);

		if (!response.ok) return null;

		const data = (await response.json()) as {
			returnValue: string;
			drwNo?: number;
			drwNoDate?: string;
			drwtNo1?: number;
			drwtNo2?: number;
			drwtNo3?: number;
			drwtNo4?: number;
			drwtNo5?: number;
			drwtNo6?: number;
			bnusNo?: number;
			firstWinamnt?: number;
			firstPrzwnerCo?: number;
			totSellamnt?: number;
		};

		if (data.returnValue === "success") {
			return {
				drwNo: data.drwNo || 0,
				drwNoDate: data.drwNoDate || "",
				drwtNo1: data.drwtNo1 || 0,
				drwtNo2: data.drwtNo2 || 0,
				drwtNo3: data.drwtNo3 || 0,
				drwtNo4: data.drwtNo4 || 0,
				drwtNo5: data.drwtNo5 || 0,
				drwtNo6: data.drwtNo6 || 0,
				bnusNo: data.bnusNo || 0,
				firstWinamnt: data.firstWinamnt || 0,
				firstPrzwnerCo: data.firstPrzwnerCo || 0,
				totSellamnt: data.totSellamnt || 0,
			};
		}

		return null;
	} catch (error) {
		console.error(`Error fetching lotto numbers for round ${drwNo}:`, error);
		return null;
	}
}
