import { env } from "$env/dynamic/private";
import { initClient } from "trailbase";
import type { PageServerLoad } from "./$types";

const client = initClient(env.TRAILBASE_URL || "http://localhost:4000");

// 페이지 옵션 설정
export const prerender = true;

export const load: PageServerLoad = async () => {
	try {
		// AC 통계 데이터의 실제 최대 회차 조회
		const maxAcRoundsResponse = await client
			.records("lotto_draw_ac_stats")
			.list({
				order: ["-round"],
				pagination: { limit: 1 },
			});

		const totalRounds =
			maxAcRoundsResponse.records.length > 0
				? (maxAcRoundsResponse.records[0] as { round: number }).round
				: 0;

		// AC값 통계 데이터 조회 (배치 처리로 모든 데이터 가져오기)
		let allAcStats: Array<{
			round: number;
			ac_value: number;
		}> = [];
		const batchSize = 1024;
		let batchOffset = 0;

		while (true) {
			const acStatsResponse = await client.records("lotto_draw_ac_stats").list({
				order: ["-round"],
				pagination: { limit: batchSize, offset: batchOffset },
			});

			const batchRecords = acStatsResponse.records as Array<{
				round: number;
				ac_value: number;
			}>;

			if (batchRecords.length === 0) {
				break;
			}

			allAcStats = allAcStats.concat(batchRecords);
			batchOffset += batchSize;
		}

		// 통계 요약 계산
		const records = allAcStats;
		const analyzedRounds = records.length;
		const acValues = records.map((r) => r.ac_value);

		// 기본 통계
		const maxAcValue = acValues.length > 0 ? Math.max(...acValues) : 0;
		const minAcValue = acValues.length > 0 ? Math.min(...acValues) : 0;
		const averageAcValue =
			analyzedRounds > 0
				? (
						acValues.reduce((sum, val) => sum + val, 0) / analyzedRounds
					).toFixed(2)
				: "0.00";

		// AC값 분포 계산 (0-15 범위, 일반적으로 로또 AC값 범위)
		const acDistribution: Record<string, number> = {};
		for (let i = 0; i <= 15; i++) {
			acDistribution[String(i)] = 0;
		}

		for (const record of records) {
			const acKey = String(record.ac_value);
			if (acKey in acDistribution) {
				acDistribution[acKey]++;
			}
		}

		// AC값 범위별 분포
		const acRangeDistribution = {
			"0-3": 0, // 매우 낮음 (단순한 패턴)
			"4-6": 0, // 낮음
			"7-9": 0, // 보통
			"10-12": 0, // 높음
			"13-15": 0, // 매우 높음 (복잡한 패턴)
		};

		for (const acValue of acValues) {
			if (acValue <= 3) acRangeDistribution["0-3"]++;
			else if (acValue <= 6) acRangeDistribution["4-6"]++;
			else if (acValue <= 9) acRangeDistribution["7-9"]++;
			else if (acValue <= 12) acRangeDistribution["10-12"]++;
			else acRangeDistribution["13-15"]++;
		}

		// 최근 10회차 통계
		const recentStats = records.slice(0, 10);

		// AC값 복잡도 분석
		const lowComplexityCount =
			acRangeDistribution["0-3"] + acRangeDistribution["4-6"];
		const highComplexityCount =
			acRangeDistribution["10-12"] + acRangeDistribution["13-15"];
		const lowComplexityRate =
			analyzedRounds > 0
				? ((lowComplexityCount / analyzedRounds) * 100).toFixed(1)
				: "0.0";
		const highComplexityRate =
			analyzedRounds > 0
				? ((highComplexityCount / analyzedRounds) * 100).toFixed(1)
				: "0.0";

		// 가장 빈번한 AC값
		const mostFrequentAc = Object.entries(acDistribution)
			.filter(([_, count]) => count > 0)
			.sort((a, b) => b[1] - a[1])[0] || ["0", 0];

		return {
			acStats: allAcStats, // 전체 데이터 표시
			totalRounds: totalRounds,
			maxAcValue,
			minAcValue,
			averageAcValue,
			acDistribution,
			acRangeDistribution,
			recentStats,
			lowComplexityRate,
			highComplexityRate,
			mostFrequentAc,
			selectedRounds: 0, // 기본값은 0 (전체 보기)
		};
	} catch (error) {
		console.error("AC값 통계 데이터 로드 실패:", error);
		return {
			acStats: [],
			totalRounds: 0,
			maxAcValue: 0,
			minAcValue: 0,
			averageAcValue: "0.00",
			acDistribution: {},
			acRangeDistribution: {
				"0-3": 0,
				"4-6": 0,
				"7-9": 0,
				"10-12": 0,
				"13-15": 0,
			},
			recentStats: [],
			lowComplexityRate: "0.0",
			highComplexityRate: "0.0",
			mostFrequentAc: ["0", 0],
			selectedRounds: 0,
		};
	}
};
