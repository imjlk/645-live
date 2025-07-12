import { env } from "$env/dynamic/private";
import { getLatestLottoRound, getLottoNumbers } from "$lib/utils/lotto-api";
import { initClient } from "trailbase";
import type { PageServerLoad } from "./$types";

interface LottoDrawScanCount {
	round: number;
	scan_count_1: number;
	scan_count_2: number;
	scan_count_3: number;
	scan_count_4: number;
	scan_count_5: number;
	scan_count_6: number;
	scan_count_7: number;
	scan_count_8: number;
	scan_count_9: number;
	scan_count_10: number;
	scan_count_11: number;
	scan_count_12: number;
	scan_count_13: number;
	scan_count_14: number;
	scan_count_15: number;
	scan_count_16: number;
	scan_count_17: number;
	scan_count_18: number;
	scan_count_19: number;
	scan_count_20: number;
	scan_count_21: number;
	scan_count_22: number;
	scan_count_23: number;
	scan_count_24: number;
	scan_count_25: number;
	scan_count_26: number;
	scan_count_27: number;
	scan_count_28: number;
	scan_count_29: number;
	scan_count_30: number;
	scan_count_31: number;
	scan_count_32: number;
	scan_count_33: number;
	scan_count_34: number;
	scan_count_35: number;
	scan_count_36: number;
	scan_count_37: number;
	scan_count_38: number;
	scan_count_39: number;
	scan_count_40: number;
	scan_count_41: number;
	scan_count_42: number;
	scan_count_43: number;
	scan_count_44: number;
	scan_count_45: number;
	total_scans: number;
	updated_at: string;
}

export const load: PageServerLoad = async ({ url }) => {
	try {
		// Get the round from URL params, or default to latest
		const roundParam = url.searchParams.get("round");

		// Get latest round info
		const latestInfo = await getLatestLottoRound();
		if (!latestInfo) {
			throw new Error("최신 회차 정보를 불러올 수 없습니다.");
		}

		const targetRound = roundParam
			? Number.parseInt(roundParam)
			: latestInfo.drwNo;

		// Get scan count data from TrailBase first to determine available rounds
		const client = initClient(env.TRAILBASE_URL || "http://localhost:4000");
		const api = client.records("lotto_draw_scan_counts");

		let scanData = null;
		let availableRounds: number[] = [];

		try {
			// Get all scan count records to find available rounds and target round data
			const response = await api.list({
				order: ["-round"],
				pagination: { limit: 100 }, // Get last 100 rounds
			});

			// Extract available rounds from actual data
			if (response.records && response.records.length > 0) {
				availableRounds = response.records
					.map((record: unknown) =>
						Number((record as LottoDrawScanCount).round),
					)
					.filter((round: number) => !Number.isNaN(round) && round > 0)
					.sort((a: number, b: number) => b - a); // Sort descending (newest first)

				// Find the specific round data
				const roundData = response.records.find(
					(record: unknown) =>
						Number((record as LottoDrawScanCount).round) === targetRound,
				);
				if (roundData) {
					scanData = roundData;
				}
			}
		} catch (err) {
			console.warn("Failed to fetch scan data:", err);
			// Fallback to generating rounds if API fails
			availableRounds = Array.from(
				{ length: Math.min(20, latestInfo.drwNo) },
				(_, i) => latestInfo.drwNo - i,
			);
		}

		// Validate round - use a more permissive approach
		let finalTargetRound = targetRound;
		if (Number.isNaN(targetRound) || targetRound < 1) {
			// If completely invalid, use latest available round
			finalTargetRound =
				availableRounds.length > 0 ? availableRounds[0] : latestInfo.drwNo;
			console.warn(`Invalid round parameter, using ${finalTargetRound}`);
		} else if (
			availableRounds.length > 0 &&
			!availableRounds.includes(targetRound)
		) {
			// If valid number but no scan data, still allow it (just won't have scan data)
			console.warn(`No scan data for round ${targetRound}, proceeding anyway`);
		}

		// Get lotto numbers for the final target round
		const lottoNumbers = await getLottoNumbers(finalTargetRound);

		return {
			targetRound: finalTargetRound,
			latestRound: latestInfo.drwNo,
			lottoNumbers,
			scanData,
			availableRounds,
		};
	} catch (error) {
		console.error("Error loading history page:", error);
		return {
			error: (error as Error).message,
			targetRound: null,
			latestRound: null,
			lottoNumbers: null,
			scanData: null,
			availableRounds: [],
		};
	}
};
