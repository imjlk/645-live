import type { BallNumber } from "$lib/modules/lotto/types";
import { Client } from "trailbase";
import type { PageServerLoad } from "./$types";

// Trailbase 클라이언트 초기화 (서버 환경)
const client = Client.init(
	process.env.TRAILBASE_URL || "http://localhost:4000",
);
const api = client.records("numbers");

export const load: PageServerLoad = async () => {
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
		return { numbers };
	} catch (error) {
		console.error("Failed to load initial lotto data:", error);
		return { numbers: [] as BallNumber[] };
	}
};
