import { env } from "$env/dynamic/private";
import { error } from "@sveltejs/kit";
import { initClient } from "trailbase";
import type { PageServerLoad } from "./$types";

const client = initClient(env.TRAILBASE_URL || "http://localhost:4000");

export const load: PageServerLoad = async () => {
	let defaultRound = 0; // 기본값

	try {
		// 최신 레코드 하나를 가져와서 회차 확인
		const latestResponse = await client.records("lotto_winning_stores").list({
			order: ["-id"], // ID 역순으로 정렬 (최신부터)
			pagination: { limit: 1 },
		});

		if (latestResponse.records.length > 0) {
			const latestRecord = latestResponse.records[0] as { round: number };
			defaultRound = latestRecord.round;
		}

		console.log(`최신 회차: ${defaultRound}`);

		// 해당 회차의 모든 당첨점 조회
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
			initialStores: [],
			initialStatistics: {
				total: 0,
				firstPlace: 0,
				secondPlace: 0,
			},
		};
	}
};
