import { TRAILBASE_URL } from "$env/static/private";
import { getLatestLottoRound } from "$lib/utils/lotto-api";
import { initClient } from "trailbase";
import type { PageServerLoad } from "./$types";

const client = initClient(TRAILBASE_URL || "http://localhost:4000");

export const load: PageServerLoad = async ({ url }) => {
	let defaultRound = 0;
	let latestRound = 0;

	try {
		const latestInfo = await getLatestLottoRound();
		latestRound = latestInfo?.drwNo ?? 0;
		defaultRound = latestRound;

		const roundParam = url.searchParams.get("round");
		if (roundParam) {
			const parsed = Number.parseInt(roundParam, 10);
			if (!Number.isNaN(parsed) && parsed > 0) {
				defaultRound =
					latestRound > 0 ? Math.min(parsed, latestRound) : parsed;
			}
		}

		const response = await client.records("lotto_winning_stores").list({
			order: ["win_type", "id"],
			filters: [
				{ column: "round", op: "equal", value: defaultRound.toString() },
			],
		});

		const stores = response.records as Array<{
			id: number;
			round: number;
			store_name: string;
			address: string;
			win_type: "1등" | "2등";
			selection_type?: "자동" | "수동";
		}>;

		// 서버에서 이미 필터링했으므로 클라이언트 필터링 제거

		// 결과 통계 계산
		const firstPlaceCount = stores.filter(
			(store) => store.win_type === "1등",
		).length;
		const secondPlaceCount = stores.filter(
			(store) => store.win_type === "2등",
		).length;

		return {
			initialRound: defaultRound,
			availableRounds:
				latestRound > 0
					? Array.from({ length: latestRound }, (_, index) => latestRound - index)
					: [],
			latestRound,
			initialStores: stores,
			initialStatistics: {
				total: stores.length,
				firstPlace: firstPlaceCount,
				secondPlace: secondPlaceCount,
			},
		};
	} catch (err) {
		console.error("당첨점 초기 조회 오류:", err);
		// 에러 발생시에도 기본값 반환
		return {
			initialRound: defaultRound,
			availableRounds:
				latestRound > 0
					? Array.from({ length: latestRound }, (_, index) => latestRound - index)
					: [],
			latestRound,
			initialStores: [],
			initialStatistics: {
				total: 0,
				firstPlace: 0,
				secondPlace: 0,
			},
		};
	}
};
