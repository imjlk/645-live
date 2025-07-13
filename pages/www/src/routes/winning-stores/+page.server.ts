import { env } from "$env/dynamic/private";
import { error } from "@sveltejs/kit";
import { initClient } from "trailbase";
import type { PageServerLoad } from "./$types";

const client = initClient(env.TRAILBASE_URL || "http://localhost:4000");

export const load: PageServerLoad = async () => {
	// 초기 SSR은 최신 회차 기준으로만 수행
	// 쿼리 파라미터는 클라이언트에서 처리
	const now = new Date();
	const lottoStartDate = new Date(2002, 11, 7); // 2002년 12월 7일 (1회차)
	const diffTime = now.getTime() - lottoStartDate.getTime();
	const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
	const defaultRound = Math.max(1, diffWeeks - 1);

	try {
		const response = await client.records("lotto_winning_stores").list({
			order: ["win_type", "id"],
		});

		let stores = response.records as Array<{
			id: number;
			round: number;
			store_name: string;
			address: string;
			win_type: "1등" | "2등";
			selection_type?: "자동" | "수동";
		}>;

		// 기본 회차로 필터링
		stores = stores.filter((store) => store.round === defaultRound);

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
