import { TRAILBASE_URL } from "$env/static/private";
import { initClient } from "trailbase";

const client = initClient(TRAILBASE_URL || "http://localhost:4000");

type ScanCountRecord = {
	round: number;
	total_scans?: number | string | null;
};

export type ScanPreviewState = {
	latestRoundHasScanData: boolean;
	latestPopulatedRound: number | null;
	fallbackPreviewRound: number | null;
};

function toPositiveInt(value: unknown): number | null {
	const number = Number(value);
	if (!Number.isFinite(number) || number <= 0) {
		return null;
	}
	return Math.trunc(number);
}

function toScanCount(value: unknown): number {
	const number = Number(value);
	return Number.isFinite(number) && number > 0 ? Math.trunc(number) : 0;
}

export async function getScanPreviewState(
	preferredRound: number,
): Promise<ScanPreviewState> {
	try {
		const scanApi = client.records("lotto_draw_scan_counts");
		const [preferredResponse, recentResponse] = await Promise.all([
			scanApi.list({
				filters: [
					{ column: "round", op: "equal", value: preferredRound.toString() },
				],
				pagination: { limit: 1 },
			}),
			scanApi.list({
				order: ["-round"],
				pagination: { limit: 30 },
			}),
		]);

		const preferredRecord =
			(preferredResponse.records[0] as ScanCountRecord | undefined) ?? null;
		const latestRoundHasScanData =
			preferredRecord !== null &&
			toPositiveInt(preferredRecord.round) === preferredRound &&
			toScanCount(preferredRecord.total_scans) > 0;

		const latestPopulatedRound =
			(recentResponse.records as ScanCountRecord[])
				.map((record) => ({
					round: toPositiveInt(record.round),
					totalScans: toScanCount(record.total_scans),
				}))
				.filter(
					(record): record is { round: number; totalScans: number } =>
						record.round !== null && record.totalScans > 0,
				)
				.find((record) => record.round <= preferredRound)?.round ?? null;

		return {
			latestRoundHasScanData,
			latestPopulatedRound,
			fallbackPreviewRound:
				!latestRoundHasScanData && latestPopulatedRound !== preferredRound
					? latestPopulatedRound
					: null,
		};
	} catch (error) {
		console.error("Failed to load scan preview state:", error);
		return {
			latestRoundHasScanData: false,
			latestPopulatedRound: null,
			fallbackPreviewRound: null,
		};
	}
}
