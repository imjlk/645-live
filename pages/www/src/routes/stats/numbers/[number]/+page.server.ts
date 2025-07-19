import { env } from "$env/dynamic/private";
import { initClient } from "trailbase";
import type { PageServerLoad } from "./$types";

const client = initClient(env.TRAILBASE_URL || "http://localhost:4000");

// 동적 페이지 설정
export const prerender = false;
export const ssr = true;

export const load: PageServerLoad = async ({ params }) => {
	try {
		const numberParam = params.number;
		const selectedNumber = Number(numberParam);

		// 유효성 검사
		if (Number.isNaN(selectedNumber) || selectedNumber < 1 || selectedNumber > 45) {
			throw new Error("잘못된 번호 파라미터입니다. 1~45 사이의 번호를 입력해주세요.");
		}

		// 전체 회차 수 조회
		const totalRoundsResponse = await client
			.records("lotto_draw_results")
			.list({
				order: ["-round"],
				pagination: { limit: 1 },
			});

		const totalRounds =
			totalRoundsResponse.records.length > 0
				? (totalRoundsResponse.records[0] as { round: number }).round
				: 0;

		// 번호별 기본 통계 조회
		const numberStatsResponse = await client
			.records("lotto_number_stats")
			.list({
				filter: `number=${selectedNumber}`,
				pagination: { limit: 1 },
			});

		if (numberStatsResponse.records.length === 0) {
			throw new Error(`번호 ${selectedNumber}에 대한 통계를 찾을 수 없습니다.`);
		}

		const numberStats = numberStatsResponse.records[0] as {
			number: number;
			draw_count: number;
			bonus_count: number;
			last_draw_round: number;
		};

		// 번호별 상세 정보 조회
		const numberDetailsResponse = await client
			.records("lotto_number_details")
			.list({
				filter: `number=${selectedNumber}`,
				pagination: { limit: 1 },
			});

		const numberDetail = numberDetailsResponse.records[0] as {
			number: number;
			color: string;
			section: number;
		} | undefined;

		// 해당 번호가 포함된 추첨 결과 조회 (최신 20개)
		const drawResultsResponse = await client
			.records("lotto_draw_results")
			.list({
				filter: `numbers ~ "${selectedNumber}"`,
				order: ["-round"],
				pagination: { limit: 20 },
			});

		const recentDraws = drawResultsResponse.records.map((record) => {
			const drawRecord = record as {
				round: number;
				numbers: string;
				bonus_number: number;
				draw_date: string;
			};
			
			let numbers: number[] = [];
			let isBonus = false;
			
			try {
				numbers = JSON.parse(drawRecord.numbers) as number[];
				isBonus = drawRecord.bonus_number === selectedNumber;
			} catch (error) {
				console.warn(`Failed to parse numbers for round ${drawRecord.round}:`, error);
			}

			return {
				round: drawRecord.round,
				numbers,
				bonusNumber: drawRecord.bonus_number,
				drawDate: drawRecord.draw_date,
				isBonus,
				isMain: numbers.includes(selectedNumber),
			};
		});

		// 통계 계산
		const averageFrequency = totalRounds > 0 ? ((numberStats.draw_count / totalRounds) * 100).toFixed(2) : "0.00";
		const expectedFrequency = totalRounds > 0 ? ((totalRounds * 6) / 45).toFixed(1) : "0.0";
		const deviation = totalRounds > 0 ? (numberStats.draw_count - (totalRounds * 6) / 45).toFixed(1) : "0.0";
		
		// 색상 정보
		const colorInfo = {
			yellow: { name: "노랑", range: "1-10", bgClass: "bg-yellow-400", textClass: "text-yellow-600" },
			blue: { name: "파랑", range: "11-20", bgClass: "bg-blue-400", textClass: "text-blue-600" },
			red: { name: "빨강", range: "21-30", bgClass: "bg-red-400", textClass: "text-red-600" },
			grey: { name: "회색", range: "31-40", bgClass: "bg-gray-400", textClass: "text-gray-600" },
			green: { name: "초록", range: "41-45", bgClass: "bg-green-400", textClass: "text-green-600" },
		};

		// 고저 구분
		const isHighNumber = selectedNumber > 22;
		const isLowNumber = selectedNumber <= 22;

		return {
			selectedNumber,
			numberStats: {
				...numberStats,
				color: numberDetail?.color || "unknown",
				section: numberDetail?.section || 0,
				averageFrequency,
				expectedFrequency,
				deviation,
			},
			colorInfo,
			isHighNumber,
			isLowNumber,
			recentDraws,
			totalRounds,
			totalAppearances: numberStats.draw_count + numberStats.bonus_count,
		};
	} catch (error) {
		console.error("번호별 상세 데이터 로드 오류:", error);
		throw error;
	}
};