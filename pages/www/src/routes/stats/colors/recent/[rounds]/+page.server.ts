import { PUBLIC_TRAILBASE_URL } from "$env/static/public";
import { initClient } from "trailbase";
import type { PageServerLoad } from "./$types";

const client = initClient(PUBLIC_TRAILBASE_URL || "http://localhost:4000");

// 페이지 옵션 설정 - 동적 페이지이므로 SSR 사용
export const prerender = false;
export const ssr = true;

export const load: PageServerLoad = async ({ params }) => {
	try {
		const roundsParam = params.rounds;
		const selectedRounds = Number(roundsParam);

		// 유효성 검사
		if (Number.isNaN(selectedRounds) || selectedRounds < 1) {
			throw new Error("잘못된 회차 파라미터입니다.");
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

		// 최대 회차 검증
		if (selectedRounds > totalRounds) {
			throw new Error(`최대 ${totalRounds}회차까지만 조회 가능합니다.`);
		}

		// 색상 통계 데이터 조회 (배치 처리로 모든 데이터 가져오기)
		let allColorStats: Array<{
			round: number;
			yellow_count: number;
			blue_count: number;
			red_count: number;
			grey_count: number;
			green_count: number;
		}> = [];
		const batchSize = 1024;
		let offset = 0;

		while (allColorStats.length < selectedRounds) {
			const remainingRecords = selectedRounds - allColorStats.length;
			const currentLimit = Math.min(batchSize, remainingRecords);

			const colorStatsResponse = await client
				.records("lotto_draw_color_stats")
				.list({
					order: ["-round"],
					pagination: { limit: currentLimit, offset },
				});

			const batchRecords = colorStatsResponse.records as Array<{
				round: number;
				yellow_count: number;
				blue_count: number;
				red_count: number;
				grey_count: number;
				green_count: number;
			}>;

			if (batchRecords.length === 0) {
				break;
			}

			allColorStats = allColorStats.concat(batchRecords);
			offset += currentLimit;
		}

		// 통계 요약 계산 (요청한 회차 수만큼만 사용)
		const records = allColorStats.slice(0, selectedRounds);

		// 색상별 카운트 계산
		const colorCounts = {
			yellow: 0,
			blue: 0,
			red: 0,
			grey: 0,
			green: 0,
		};

		const colorDistribution: Record<string, number> = {};

		for (const record of records) {
			// 색상별 총 개수 누적
			colorCounts.yellow += record.yellow_count;
			colorCounts.blue += record.blue_count;
			colorCounts.red += record.red_count;
			colorCounts.grey += record.grey_count;
			colorCounts.green += record.green_count;

			// 색상 분포 패턴 기록
			const pattern = `${record.yellow_count}-${record.blue_count}-${record.red_count}-${record.grey_count}-${record.green_count}`;
			colorDistribution[pattern] = (colorDistribution[pattern] || 0) + 1;
		}

		// 색상별 평균 계산
		const totalRecords = records.length;
		const colorAverages = {
			yellow:
				totalRecords > 0
					? (colorCounts.yellow / totalRecords).toFixed(2)
					: "0.00",
			blue:
				totalRecords > 0
					? (colorCounts.blue / totalRecords).toFixed(2)
					: "0.00",
			red:
				totalRecords > 0 ? (colorCounts.red / totalRecords).toFixed(2) : "0.00",
			grey:
				totalRecords > 0
					? (colorCounts.grey / totalRecords).toFixed(2)
					: "0.00",
			green:
				totalRecords > 0
					? (colorCounts.green / totalRecords).toFixed(2)
					: "0.00",
		};

		// 최빈 색상 찾기
		const mostFrequentColor = Object.entries(colorAverages).reduce(
			(prev, curr) =>
				Number.parseFloat(curr[1]) > Number.parseFloat(prev[1]) ? curr : prev,
		);

		const summary = {
			totalDraws: records.length,
			colorCounts,
			colorAverages,
			mostFrequentColor,
			distribution: colorDistribution,
		};

		return {
			colorStats: {
				records,
				summary,
			},
			selectedRounds,
			totalRounds,
			pageTitle: `색상 구간 통계 (최근 ${selectedRounds}회차)`,
		};
	} catch (error) {
		console.error("색상 통계 데이터 로드 오류:", error);
		throw error;
	}
};
