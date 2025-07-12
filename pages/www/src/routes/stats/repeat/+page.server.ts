import { env } from "$env/dynamic/private";
import { initClient } from "trailbase";
import type { PageServerLoad } from "./$types";

const client = initClient(env.TRAILBASE_URL || "http://localhost:4000");

export const load: PageServerLoad = async ({ url }) => {
	const page = Number(url.searchParams.get("page") || "1");
	const rounds = Number(url.searchParams.get("rounds") || "100");
	const limit = 50;
	const offset = (page - 1) * limit;

	try {
		// 연속 회차 중복 번호 통계 데이터 (최신순)
		const repeatStatsResponse = await client
			.records("lotto_draw_repeat_stats")
			.list({
				order: ["-round"],
				pagination: { limit, offset },
			});

		// 전체 중복 번호 통계 요약 (선택한 회차 수만큼)
		const allRepeatResponse = await client
			.records("lotto_draw_repeat_stats")
			.list({
				order: ["-round"],
				pagination: { limit: rounds },
			});

		// 통계 요약 계산
		const records = allRepeatResponse.records as Array<{
			round: number;
			repeat_count: number;
		}>;

		const totalRounds = records.length;
		const averageRepeatCount =
			totalRounds > 0
				? (
						records.reduce((sum, record) => sum + record.repeat_count, 0) /
						totalRounds
					).toFixed(2)
				: "0.00";

		const repeatCountDistribution = {
			"0": 0,
			"1": 0,
			"2": 0,
			"3": 0,
			"4": 0,
			"5": 0,
			"6": 0,
		};

		for (const record of records) {
			const repeatKey = String(
				record.repeat_count,
			) as keyof typeof repeatCountDistribution;
			if (repeatKey in repeatCountDistribution) {
				repeatCountDistribution[repeatKey]++;
			}
		}

		const repeatCounts = records.map((r) => r.repeat_count);
		const maxRepeatCount =
			repeatCounts.length > 0 ? Math.max(...repeatCounts) : 0;
		const recentStats = records.slice(0, 10);
		const zeroRepeatCount = repeatCountDistribution["0"];
		const zeroRepeatRate =
			totalRounds > 0
				? ((zeroRepeatCount / totalRounds) * 100).toFixed(1)
				: "0.0";
		const highRepeatCount =
			repeatCountDistribution["3"] +
			repeatCountDistribution["4"] +
			repeatCountDistribution["5"] +
			repeatCountDistribution["6"];
		const highRepeatRate =
			totalRounds > 0
				? ((highRepeatCount / totalRounds) * 100).toFixed(1)
				: "0.0";

		return {
			repeatStats: repeatStatsResponse.records,
			totalRounds,
			averageRepeatCount,
			maxRepeatCount,
			repeatCountDistribution,
			recentStats,
			zeroRepeatCount,
			zeroRepeatRate,
			highRepeatCount,
			highRepeatRate,
			currentPage: page,
			totalPages: Math.ceil((repeatStatsResponse.total_count || 0) / limit),
			selectedRounds: rounds,
		};
	} catch (error) {
		console.error("번호별 통계 데이터 로드 실패:", error);
		return {
			numberStats: [],
			totalRounds: 0,
			latestRound: 0,
			currentPage: 1,
			totalPages: 1,
		};
	}
};
