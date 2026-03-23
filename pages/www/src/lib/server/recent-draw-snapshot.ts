import { TRAILBASE_URL } from "$env/static/private";
import { calculateExpectedLatestRound } from "$lib/utils/lotto-common.js";
import { calculateClaimWindow, estimateDrawDateFromRound } from "$lib/utils/claim-window.js";

const OFFICIAL_LATEST_ROUNDS_URL =
	"https://www.dhlottery.co.kr/lt645/selectLtEpsdInfo.do";
const OFFICIAL_DRAW_URL =
	"https://www.dhlottery.co.kr/lt645/selectPstLt645InfoNew.do";
const SNAPSHOT_LIMIT = 65;
const FETCH_TIMEOUT_MS = 10000;
const MEMORY_TTL_MS = 15 * 60 * 1000;
const CACHE_CONTROL =
	"public, max-age=300, s-maxage=604800, stale-while-revalidate=86400";

type TrailbaseDrawRow = {
	round: number;
	draw_date: string;
	draw_number_1: number;
	draw_number_2: number;
	draw_number_3: number;
	draw_number_4: number;
	draw_number_5: number;
	draw_number_6: number;
	bonus_number: number;
	first_prize_amount: number | null;
	first_prize_winner_count: number | null;
};

export type RecentDrawSnapshotRound = {
	round: number;
	drawDate: string;
	numbers: [number, number, number, number, number, number];
	bonusNumber: number;
	firstPrizeAmount: number;
	firstPrizeWinnerCount: number;
	claimStartDate: string;
	claimDeadlineDate: string;
};

export type RecentDrawSnapshot = {
	generatedAt: string;
	latestRound: number;
	rounds: RecentDrawSnapshotRound[];
};

let memoryCache:
	| {
			version: number;
			expiresAt: number;
			snapshot: RecentDrawSnapshot;
	  }
	| undefined;

function safeInt(value: unknown): number {
	const parsed = Number.parseInt(String(value ?? "0"), 10);
	return Number.isFinite(parsed) ? parsed : 0;
}

function safeNumber(value: unknown): number {
	const parsed = Number(String(value ?? "0").replaceAll(",", ""));
	return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeOfficialDate(value: unknown, round: number): string {
	const raw = String(value ?? "").replaceAll(".", "").trim();
	if (/^\d{8}$/.test(raw)) {
		return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
	}

	return estimateDrawDateFromRound(round);
}

async function fetchJson(url: string): Promise<any> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

	try {
		const response = await fetch(url, {
			headers: {
				Accept: "application/json, text/plain, */*",
				"User-Agent": "645.live snapshot fetcher",
			},
			signal: controller.signal,
		});

		if (!response.ok) {
			throw new Error(`Request failed: ${response.status}`);
		}

		return await response.json();
	} finally {
		clearTimeout(timeoutId);
	}
}

function toSnapshotRound(params: {
	round: number;
	drawDate: string;
	numbers: number[];
	bonusNumber: number;
	firstPrizeAmount: number;
	firstPrizeWinnerCount: number;
}): RecentDrawSnapshotRound | null {
	if (params.round <= 0 || params.numbers.length !== 6) {
		return null;
	}

	const sortedNumbers = [...params.numbers]
		.filter((value) => value > 0)
		.sort((left, right) => left - right);

	if (sortedNumbers.length !== 6) {
		return null;
	}

	const claimWindow = calculateClaimWindow(params.drawDate);

	return {
		round: params.round,
		drawDate: params.drawDate,
		numbers: sortedNumbers as RecentDrawSnapshotRound["numbers"],
		bonusNumber: params.bonusNumber,
		firstPrizeAmount: params.firstPrizeAmount,
		firstPrizeWinnerCount: params.firstPrizeWinnerCount,
		claimStartDate: claimWindow.claimStartDate,
		claimDeadlineDate: claimWindow.claimDeadlineDate,
	};
}

function getCacheKey(request: Request, version: number): Request {
	const url = new URL(request.url);
	url.searchParams.set("v", String(version));
	return new Request(url.toString(), {
		headers: {
			Accept: "application/json",
		},
	});
}

function getDefaultCache(): Cache | undefined {
	const cacheStorage = globalThis.caches as
		| (CacheStorage & { default?: Cache })
		| undefined;
	return cacheStorage?.default;
}

function createResponse(snapshot: RecentDrawSnapshot, version: number): Response {
	return new Response(JSON.stringify(snapshot), {
		headers: {
			"content-type": "application/json; charset=utf-8",
			"cache-control": CACHE_CONTROL,
			"x-lotto-draw-snapshot-version": String(version),
		},
	});
}

async function fetchOfficialLatestRounds(limit = SNAPSHOT_LIMIT): Promise<number[]> {
	const payload = await fetchJson(OFFICIAL_LATEST_ROUNDS_URL);
	const list = Array.isArray(payload?.data?.list) ? payload.data.list : [];
	return list
		.map((item) => safeInt(item.ltEpsd))
		.filter((round) => round > 0)
		.sort((left, right) => right - left)
		.slice(0, limit);
}

async function fetchOfficialDraw(round: number): Promise<RecentDrawSnapshotRound | null> {
	const url = new URL(OFFICIAL_DRAW_URL);
	url.searchParams.set("srchDir", "center");
	url.searchParams.set("srchLtEpsd", String(round));
	url.searchParams.set("_", String(Date.now()));

	const payload = await fetchJson(url.toString());
	const list = Array.isArray(payload?.data?.list) ? payload.data.list : [];
	const item = list.find((candidate) => safeInt(candidate.ltEpsd) === round);
	if (!item) {
		return null;
	}

	return toSnapshotRound({
		round,
		drawDate: normalizeOfficialDate(item.ltRflYmd, round),
		numbers: [1, 2, 3, 4, 5, 6].map((index) =>
			safeInt(item[`tm${index}WnNo`]),
		),
		bonusNumber: safeInt(item.bnsWnNo),
		firstPrizeAmount: safeNumber(item.rnk1WnAmt),
		firstPrizeWinnerCount: safeInt(item.rnk1WnNope),
	});
}

async function fetchTrailbaseRecentDraws(
	limit = SNAPSHOT_LIMIT,
): Promise<RecentDrawSnapshotRound[]> {
	const url = new URL(
		`${TRAILBASE_URL || "https://trail.645.live"}/api/records/v1/lotto_draw_results`,
	);
	url.searchParams.set("order", "-round");
	url.searchParams.set("limit", String(limit));

	const payload = await fetchJson(url.toString());
	const records = Array.isArray(payload?.records)
		? payload.records
		: Array.isArray(payload?.data)
			? payload.data
			: [];

	return records
		.map((row: TrailbaseDrawRow) =>
			toSnapshotRound({
				round: safeInt(row.round),
				drawDate: String(row.draw_date ?? ""),
				numbers: [
					safeInt(row.draw_number_1),
					safeInt(row.draw_number_2),
					safeInt(row.draw_number_3),
					safeInt(row.draw_number_4),
					safeInt(row.draw_number_5),
					safeInt(row.draw_number_6),
				],
				bonusNumber: safeInt(row.bonus_number),
				firstPrizeAmount: safeNumber(row.first_prize_amount),
				firstPrizeWinnerCount: safeInt(row.first_prize_winner_count),
			}),
		)
		.filter((row): row is RecentDrawSnapshotRound => row !== null)
		.sort((left, right) => right.round - left.round)
		.slice(0, limit);
}

async function fetchTrailbaseDraw(round: number): Promise<RecentDrawSnapshotRound | null> {
	const rows = await fetchTrailbaseRecentDraws(SNAPSHOT_LIMIT);
	return rows.find((row) => row.round === round) ?? null;
}

async function buildRecentDrawSnapshot(version: number): Promise<RecentDrawSnapshot> {
	const trailbaseRowsPromise = fetchTrailbaseRecentDraws(SNAPSHOT_LIMIT).catch(
		(error) => {
			console.warn("[lotto-snapshot] TrailBase fetch failed:", error);
			return [];
		},
	);

	const officialRounds = await fetchOfficialLatestRounds(SNAPSHOT_LIMIT).catch(
		(error) => {
			console.warn("[lotto-snapshot] Official rounds fetch failed:", error);
			return [];
		},
	);

	let rounds: RecentDrawSnapshotRound[] = [];

	if (officialRounds.length > 0) {
		const trailbaseRows = await trailbaseRowsPromise;
		const trailbaseMap = new Map(
			trailbaseRows.map(
				(row) => [row.round, row] as [number, RecentDrawSnapshotRound],
			),
		);

		const settled = await Promise.all(
			officialRounds.map(async (round) => {
				try {
					return await fetchOfficialDraw(round);
				} catch (error) {
					console.warn(
						`[lotto-snapshot] Official draw fallback round=${round}:`,
						error,
					);
					return trailbaseMap.get(round) ?? null;
				}
			}),
		);

		rounds = settled
			.filter((row): row is RecentDrawSnapshotRound => row !== null)
			.sort((left, right) => right.round - left.round)
			.slice(0, SNAPSHOT_LIMIT);
	}

	if (rounds.length === 0) {
		rounds = await trailbaseRowsPromise;
	}

	return {
		generatedAt: new Date().toISOString(),
		latestRound: rounds[0]?.round ?? Math.max(version - 1, 1),
		rounds,
	};
}

export async function getRecentDrawSnapshot(): Promise<RecentDrawSnapshot> {
	const version = calculateExpectedLatestRound();
	if (
		memoryCache &&
		memoryCache.version === version &&
		memoryCache.expiresAt > Date.now()
	) {
		return memoryCache.snapshot;
	}

	const snapshot = await buildRecentDrawSnapshot(version);
	memoryCache = {
		version,
		expiresAt: Date.now() + MEMORY_TTL_MS,
		snapshot,
	};
	return snapshot;
}

export function findRoundInSnapshot(
	snapshot: RecentDrawSnapshot,
	round: number,
): RecentDrawSnapshotRound | null {
	return snapshot.rounds.find((item) => item.round === round) ?? null;
}

export async function getDrawSnapshotRound(
	round: number,
	snapshot?: RecentDrawSnapshot,
): Promise<RecentDrawSnapshotRound | null> {
	const currentSnapshot = snapshot ?? (await getRecentDrawSnapshot());
	const matched = findRoundInSnapshot(currentSnapshot, round);
	if (matched) {
		return matched;
	}

	const oldestRound = currentSnapshot.rounds.at(-1)?.round ?? 0;
	if (oldestRound > 0 && round < oldestRound) {
		return null;
	}

	try {
		return await fetchOfficialDraw(round);
	} catch (error) {
		console.warn(`[lotto-snapshot] Single official draw fetch failed round=${round}:`, error);
	}

	try {
		return await fetchTrailbaseDraw(round);
	} catch (error) {
		console.warn(`[lotto-snapshot] Single TrailBase draw fetch failed round=${round}:`, error);
	}

	return null;
}

export async function getRecentDrawSnapshotResponse(request: Request): Promise<Response> {
	const version = calculateExpectedLatestRound();
	const cache = getDefaultCache();
	const cacheKey = getCacheKey(request, version);

	if (cache) {
		const cached = await cache.match(cacheKey);
		if (cached) {
			return cached;
		}
	}

	const snapshot = await getRecentDrawSnapshot();
	const response = createResponse(snapshot, version);

	if (cache) {
		await cache.put(cacheKey, response.clone());
	}

	return response;
}
