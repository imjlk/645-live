import {
	getLatestRoundInfo,
	statsClient,
	type LatestRoundInfo,
} from "$lib/trailbase/stats";

export interface StatsFreshness {
	latestRound: number;
	latestDrawDate: string;
	analysisRound: number;
	isStale: boolean;
	lastUpdatedAt: string | null;
	sourceLabel: string;
}

type FreshnessSource = {
	tableName: string;
	sourceLabel: string;
	orderField?: string;
	roundField?: string;
	updatedField?: string;
};

type FreshnessSourceResult = {
	sourceLabel: string;
	analysisRound: number;
	lastUpdatedAt: string | null;
};

function toSafeNumber(value: unknown): number {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string" && value.trim().length > 0) {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}
	return 0;
}

async function getFreshnessSourceResult(
	source: FreshnessSource,
): Promise<FreshnessSourceResult> {
	const response = await statsClient.records(source.tableName).list({
		order: [`-${source.orderField ?? source.roundField ?? "round"}`],
		pagination: { limit: 1 },
	});

	if (response.records.length === 0) {
		return {
			sourceLabel: source.sourceLabel,
			analysisRound: 0,
			lastUpdatedAt: null,
		};
	}

	const record = response.records[0] as Record<string, unknown>;

	return {
		sourceLabel: source.sourceLabel,
		analysisRound: toSafeNumber(record[source.roundField ?? "round"]),
		lastUpdatedAt:
			typeof record[source.updatedField ?? "updated_at"] === "string"
				? String(record[source.updatedField ?? "updated_at"])
				: null,
	};
}

function fallbackFreshness(latestRoundInfo: LatestRoundInfo | null): StatsFreshness {
	return {
		latestRound: latestRoundInfo?.round ?? 0,
		latestDrawDate: latestRoundInfo?.draw_date ?? "",
		analysisRound: latestRoundInfo?.round ?? 0,
		isStale: false,
		lastUpdatedAt:
			typeof latestRoundInfo?.updated_at === "string"
				? latestRoundInfo.updated_at
				: null,
		sourceLabel: "추첨 결과",
	};
}

export async function getStatsFreshness(
	sources: FreshnessSource[],
): Promise<StatsFreshness> {
	const latestRoundInfo = await getLatestRoundInfo();
	const latestRound = latestRoundInfo?.round ?? 0;

	if (sources.length === 0) {
		return fallbackFreshness(latestRoundInfo);
	}

	const results = await Promise.all(
		sources.map((source) => getFreshnessSourceResult(source)),
	);

	const validResults = results.filter((result) => result.analysisRound > 0);
	if (validResults.length === 0) {
		return fallbackFreshness(latestRoundInfo);
	}

	const bottleneck = validResults.reduce((current, candidate) => {
		if (candidate.analysisRound < current.analysisRound) {
			return candidate;
		}
		if (
			candidate.analysisRound === current.analysisRound &&
			candidate.lastUpdatedAt &&
			(!current.lastUpdatedAt || candidate.lastUpdatedAt < current.lastUpdatedAt)
		) {
			return candidate;
		}
		return current;
	});

	return {
		latestRound,
		latestDrawDate: latestRoundInfo?.draw_date ?? "",
		analysisRound: bottleneck.analysisRound,
		isStale: latestRound > 0 && bottleneck.analysisRound > 0
			? bottleneck.analysisRound < latestRound
			: false,
		lastUpdatedAt:
			bottleneck.lastUpdatedAt ??
			(typeof latestRoundInfo?.updated_at === "string"
				? latestRoundInfo.updated_at
				: null),
		sourceLabel: bottleneck.sourceLabel,
	};
}

export async function getSingleStatsFreshness(
	source: FreshnessSource,
): Promise<StatsFreshness> {
	return getStatsFreshness([source]);
}

