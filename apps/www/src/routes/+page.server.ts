import type { BallNumber } from "$lib/modules/lotto/types";
import { Client } from "trailbase";
import type { PageServerLoad } from "./$types";

// TODO: hooks로 분리하기
export const load: PageServerLoad = async () => {
	// Trailbase 클라이언트 초기화 (서버 환경)
	// 환경 변수 등을 사용하여 엔드포인트를 관리하는 것이 좋습니다.
	const client = Client.init(
		process.env.TRAILBASE_URL || "http://localhost:4000",
	);
	const api = client.records("numbers");

	try {
		const promises = Array.from({ length: 45 }, (_, index) => {
			const ballNumber = index + 1;
			return api.read<BallNumber>(ballNumber).catch(
				() =>
					({
						id: ballNumber,
						value: 0,
					}) as BallNumber,
			);
		});

		const numbers = await Promise.all(promises);
		return {
			numbers,
		} as const;
	} catch (error) {
		console.error("Failed to load initial lotto data:", error);
		return {
			numbers: [] as BallNumber[],
			error: "초기 데이터 로딩에 실패했습니다.",
		} as const;
	}
};
