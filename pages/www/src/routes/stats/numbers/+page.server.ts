import {
	getLatestRoundInfo,
	getNumberStats,
	statsClient,
} from "$lib/trailbase/stats";
import type { PageServerLoad } from "./$types";

// 페이지 옵션 설정 - 정적 페이지이므로 prerender 사용
export const prerender = true;

export const load: PageServerLoad = async () => {
	try {
		// 최신 회차 정보와 번호별 통계를 병렬로 가져오기
		const [latestRoundInfo, numberStats, numberDetails] = await Promise.all([
			getLatestRoundInfo(),
			getNumberStats("desc", 45),
			statsClient.records("lotto_number_details").list({
				order: ["number"],
				pagination: { limit: 45 },
			}),
		]);

		const totalRounds = latestRoundInfo?.round || 0;
		const latestRound = latestRoundInfo?.round || 0;

		// 번호별 상세 정보 매핑
		const numberDetailsMap = new Map();
		for (const detail of numberDetails.records) {
			const detailRecord = detail as {
				number: number;
				color: string;
				section: number;
			};
			numberDetailsMap.set(detailRecord.number, detailRecord);
		}

		// 통계 데이터에 상세 정보 추가
		const enrichedStats = numberStats.map((stat) => {
			const detail = numberDetailsMap.get(stat.number);
			return {
				...stat,
				color: detail?.color || "unknown",
				section: detail?.section || 0,
				average_frequency:
					totalRounds > 0
						? ((stat.draw_count / totalRounds) * 100).toFixed(2)
						: "0.00",
				expected_frequency:
					totalRounds > 0 ? ((totalRounds * 6) / 45).toFixed(1) : "0.0",
				deviation:
					totalRounds > 0
						? (stat.draw_count - (totalRounds * 6) / 45).toFixed(1)
						: "0.0",
			};
		});

		// 가장 많이 출현한 번호와 적게 출현한 번호
		const mostFrequentNumber =
			enrichedStats.length > 0 ? enrichedStats[0] : null;
		const leastFrequentNumber =
			enrichedStats.length > 0 ? enrichedStats[enrichedStats.length - 1] : null;

		return {
			numberStats: enrichedStats,
			totalRounds,
			latestRound,
			mostFrequentNumber,
			leastFrequentNumber,
		};
	} catch (error) {
		console.error("번호별 통계 데이터 로드 실패:", error);
		return {
			numberStats: [],
			totalRounds: 0,
			latestRound: 0,
			mostFrequentNumber: null,
			leastFrequentNumber: null,
		};
	}
};
