import { Client } from "trailbase";
import type { PageServerLoad } from "./$types";

// Trailbase 클라이언트 초기화 (서버 환경)
// 환경 변수 등을 사용하여 엔드포인트를 관리하는 것이 좋습니다.
const client = Client.init(
	process.env.TRAILBASE_URL || "http://localhost:4000",
);
const api = client.records("numbers");

export interface BallNumber {
	id: number;
	value: number;
}
export const load: PageServerLoad = async () => {
	console.log("Loading initial data on the server...");
	try {
		// 1번부터 45번까지의 초기 데이터를 가져옵니다.
		// Promise.all을 사용하여 병렬로 요청을 보냅니다.
		const promises = Array.from({ length: 45 }).map((_, index) => {
			const ballNumber = index + 1;
			// 개별 요청 실패 시 전체 로드가 실패하지 않도록 catch 추가
			return api.read<BallNumber>(ballNumber).catch((err) => {
				console.error(
					`Error fetching initial data for number ${ballNumber}:`,
					err,
				);
				return {
					id: ballNumber,
					value: 0,
				} as BallNumber;
			});
		});

		const numbers = await Promise.all(promises);

		return { numbers };
	} catch (error) {
		console.error("Failed to load initial lotto data:", error);
		// 오류 발생 시 빈 데이터 또는 에러 상태를 전달할 수 있습니다.
		return {
			initialLottoData: {},
			error: "초기 데이터 로딩에 실패했습니다.",
		};
	}
};

// 참고: onMount, stream 변수 등은 클라이언트 측(+page.svelte) 코드이므로
// +page.server.ts 파일에는 포함되지 않습니다.
