import { getBonusAnalysis } from "$lib/trailbase/stats";
import { getStatsFreshness } from "$lib/trailbase/stats-freshness";
import type { PageServerLoad } from "./$types";

export const prerender = false;

export const load: PageServerLoad = async () => {
	try {
		const [bonusAnalysis, freshness] = await Promise.all([
			getBonusAnalysis(),
			getStatsFreshness([
				{
					tableName: "lotto_draw_bonus_stats",
					sourceLabel: "보너스 추첨 통계",
				},
				{
					tableName: "lotto_bonus_number_stats",
					sourceLabel: "보너스 번호 통계",
					orderField: "last_bonus_round",
					roundField: "last_bonus_round",
				},
			]),
		]);

		return {
			bonusAnalysis,
			freshness,
		};
	} catch (error) {
		console.error("보너스 통계 데이터 로드 실패:", error);
		return {
			bonusAnalysis: {
				latestRound: 0,
				latestDrawDate: "",
				totalRounds: 0,
				expectedBonusCount: 0,
				latestBonusDraw: null,
				bonusNumberStats: [],
				topBonusNumber: null,
				bottomBonusNumber: null,
				topBonusShareNumbers: [],
				recent10BonusStats: [],
				recent50Summary: "",
				recent100Summary: "",
				recentlyMissingNumbers: [],
				comparisonHighlights: {
					bonusHeavy: null,
					mainHeavy: null,
					combinedLeader: null,
					recentLeader: null,
				},
			},
			freshness: {
				latestRound: 0,
				latestDrawDate: "",
				analysisRound: 0,
				isStale: false,
				lastUpdatedAt: null,
				sourceLabel: "보너스 번호 통계",
			},
		};
	}
};
