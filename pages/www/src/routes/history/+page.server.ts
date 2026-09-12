import { initClient } from "trailbase";
import { env } from "$env/dynamic/private";
import { getLatestLottoRound, getLottoNumbers } from "$lib/utils/lotto-api";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url }) => {
	try {
		const latestInfo = await getLatestLottoRound();
		if (!latestInfo) throw new Error("No draw information available");
		let latestDraw = await getLottoNumbers(latestInfo.drwNo);
		// The helper can return the selling round when its latest-data request fails.
		// Only a draw with published numbers can become the default result.
		if (!latestDraw || latestDraw.drwtNo1 < 1) {
			latestDraw = await getLottoNumbers(latestInfo.drwNo - 1);
		}
		if (!latestDraw || latestDraw.drwtNo1 < 1)
			throw new Error("No published draw available");
		const latestRound = latestDraw.drwNo;
		const requestedRound = Number(url.searchParams.get("round"));
		const targetRound =
			Number.isInteger(requestedRound) && requestedRound > 0
				? Math.min(requestedRound, latestRound)
				: latestRound;
		const client = initClient(env.TRAILBASE_URL || "http://localhost:4000");
		const [lottoNumbers, scanResult] = await Promise.all([
			targetRound === latestRound
				? Promise.resolve(latestDraw)
				: getLottoNumbers(targetRound),
			client
				.records("lotto_draw_scan_counts")
				.list({
					filters: [
						{ column: "round", op: "equal", value: String(targetRound) },
					],
					pagination: { limit: 1 },
				})
				.then((response) => ({
					data:
						(response.records[0] as Record<string, unknown> | undefined) ??
						null,
					error: false,
				}))
				.catch(() => ({ data: null, error: true })),
		]);
		return {
			error: null,
			targetRound,
			latestRound,
			lottoNumbers,
			scanData: scanResult.data,
			scanError: scanResult.error,
			availableRounds: Array.from(
				{ length: latestRound },
				(_, index) => latestRound - index,
			),
		};
	} catch (error) {
		console.error("Error loading history page:", error);
		return {
			error: "당첨 결과를 불러오지 못했어요. 잠시 후 다시 확인해주세요.",
			targetRound: null,
			latestRound: null,
			lottoNumbers: null,
			scanData: null,
			scanError: false,
			availableRounds: [],
		};
	}
};
