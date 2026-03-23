import {
	calculateDisplayRound,
	calculateExpectedLatestRound,
	getLatestLottoRound,
} from "$lib/utils/lotto-api";
import { getScanPreviewState } from "$lib/server/scan-preview.js";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
	try {
		// Get latest round info from lotto API
		const latestInfo = await getLatestLottoRound();
		const displayRound = calculateDisplayRound();

		if (latestInfo) {
			const scanPreview = await getScanPreviewState(displayRound);
			return {
				latestRound: latestInfo.drwNo,
				latestRoundDate: latestInfo.drwNoDate,
				displayRound: displayRound, // 스캔 데이터를 보여줄 회차
				...scanPreview,
			};
		}

		// If getLatestLottoRound returns null, use calculated round as final fallback
		const calculatedRound = calculateExpectedLatestRound();
		console.warn(`Using calculated round as fallback: ${calculatedRound}`);
		const scanPreview = await getScanPreviewState(displayRound);

		return {
			latestRound: calculatedRound,
			latestRoundDate: new Date().toISOString().split("T")[0],
			displayRound: displayRound,
			...scanPreview,
		};
	} catch (error) {
		console.error("Error loading latest round info:", error);

		// Even if there's an error, provide a calculated round as fallback
		const calculatedRound = calculateExpectedLatestRound();
		const displayRound = calculateDisplayRound();
		console.warn(`Using calculated round due to error: ${calculatedRound}`);
		const scanPreview = await getScanPreviewState(displayRound);

		return {
			latestRound: calculatedRound,
			latestRoundDate: new Date().toISOString().split("T")[0],
			displayRound: displayRound,
			...scanPreview,
		};
	}
};
