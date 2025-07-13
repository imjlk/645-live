import { env } from "$env/dynamic/private";
import { type RequestHandler, json } from "@sveltejs/kit";
import { initClient } from "trailbase";

const client = initClient(env.TRAILBASE_URL || "http://localhost:4000");

export const GET: RequestHandler = async ({ url }) => {
	try {
		const round = url.searchParams.get("round");
		const winType = url.searchParams.get("winType"); // '1등', '2등', 또는 null (전체)

		if (!round) {
			return json({ error: "회차를 지정해주세요" }, { status: 400 });
		}

		const roundNumber = Number.parseInt(round, 10);
		if (Number.isNaN(roundNumber) || roundNumber < 1) {
			return json({ error: "유효한 회차를 입력해주세요" }, { status: 400 });
		}

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

		// 클라이언트 사이드에서 필터링
		stores = stores.filter((store) => store.round === roundNumber);

		if (winType && (winType === "1등" || winType === "2등")) {
			stores = stores.filter((store) => store.win_type === winType);
		}

		// 결과 통계 계산
		const firstPlaceCount = stores.filter(
			(store) => store.win_type === "1등",
		).length;
		const secondPlaceCount = stores.filter(
			(store) => store.win_type === "2등",
		).length;

		return json({
			success: true,
			data: {
				round: roundNumber,
				stores,
				statistics: {
					total: stores.length,
					firstPlace: firstPlaceCount,
					secondPlace: secondPlaceCount,
				},
			},
		});
	} catch (error) {
		console.error("당첨점 조회 오류:", error);
		return json(
			{ error: "당첨점 정보를 조회하는 중 오류가 발생했습니다" },
			{ status: 500 },
		);
	}
};
