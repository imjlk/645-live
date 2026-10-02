import type { Draw } from "./index";
import { parseNumbers } from "./numbers";
export type ActivitySource = "generated" | "scanned";
export type ActivityPeriod = "round" | "four" | "all" | "day";
export type ActivityQuery = { round?: number; period?: ActivityPeriod };
export type ActivityData = {
	source: ActivitySource;
	records: number;
	numberCounts: number[];
	previousCounts: number[];
	rounds: {
		round: number;
		records: number;
		numberCounts: number[];
		available: boolean;
	}[];
	patterns: {
		combinations: number;
		oddCounts: number[];
		sumCounts: number[];
		withConsecutive: number;
		since: number | null;
	};
	pairs: { a: number; b: number; count: number }[];
	hours: { hour: number; combinations: number; numberCounts: number[] }[];
};
export type ActivitySnapshot = {
	round: number;
	currentRound: number;
	period: ActivityPeriod;
	updatedAt: number;
	sources: Record<ActivitySource, ActivityData>;
	draw: Draw | null;
	knownRounds: number[];
};
export const ACTIVITY_LABELS = {
	generated: "생성된 번호",
	scanned: "QR 스캔 번호",
};
export const ACTIVITY_PERIODS: { value: ActivityPeriod; label: string }[] = [
	{ value: "round", label: "선택 회차" },
	{ value: "four", label: "최근 4회" },
	{ value: "day", label: "최근 24시간" },
	{ value: "all", label: "수집 기간 누적" },
];
export function activityAllowsDay(
	snapshot: ActivitySnapshot | null,
	requestedRound?: number,
) {
	return (
		snapshot !== null &&
		(requestedRound ?? snapshot.round) === snapshot.currentRound
	);
}
const object = (v: unknown): Record<string, unknown> => {
	if (!v || typeof v !== "object" || Array.isArray(v))
		throw new Error("분석 응답을 확인하지 못했어요.");
	return v as Record<string, unknown>;
};
const integer = (v: unknown) => {
	if (typeof v !== "number" || !Number.isSafeInteger(v) || v < 0)
		throw new Error("잘못된 집계 값이에요.");
	return v;
};
function counts(v: unknown, len = 45) {
	if (!Array.isArray(v) || v.length !== len)
		throw new Error("집계 항목을 확인하지 못했어요.");
	return v.map(integer);
}
function list(v: unknown) {
	if (!Array.isArray(v)) throw new Error("집계 목록을 확인하지 못했어요.");
	return v;
}
function source(v: unknown, kind: ActivitySource): ActivityData {
	const d = object(v),
		p = object(d.patterns);
	if (d.source !== kind) throw new Error("집계 출처가 일치하지 않아요.");
	const combinations = integer(p.combinations),
		oddCounts = counts(p.oddCounts, 7),
		sumCounts = counts(p.sumCounts, 14),
		withConsecutive = integer(p.withConsecutive);
	if (
		sum(oddCounts) !== combinations ||
		sum(sumCounts) !== combinations ||
		withConsecutive > combinations
	)
		throw new Error("패턴 집계가 일치하지 않아요.");
	return {
		source: kind,
		records: integer(d.records),
		numberCounts: counts(d.numberCounts),
		previousCounts: counts(d.previousCounts),
		rounds: list(d.rounds).map((v) => {
			const r = object(v);
			return {
				round: integer(r.round),
				records: integer(r.records),
				numberCounts: counts(r.numberCounts),
				available: r.available === true,
			};
		}),
		patterns: {
			combinations,
			oddCounts,
			sumCounts,
			withConsecutive,
			since: p.since === null ? null : integer(p.since),
		},
		pairs: list(d.pairs).map((v) => {
			const p = object(v),
				a = integer(p.a),
				b = integer(p.b),
				count = integer(p.count);
			if (a < 1 || a >= b || b > 45 || count > combinations)
				throw new Error("번호 쌍 집계가 일치하지 않아요.");
			return { a, b, count };
		}),
		hours: list(d.hours).map((v) => {
			const h = object(v),
				numberCounts = counts(h.numberCounts),
				combinations = integer(h.combinations);
			if (sum(numberCounts) !== combinations * 6)
				throw new Error("시간 집계가 일치하지 않아요.");
			return { hour: integer(h.hour), combinations, numberCounts };
		}),
	};
}
export function parseActivitySnapshot(value: unknown): ActivitySnapshot {
	const v = object(value),
		sources = object(v.sources),
		round = integer(v.round),
		currentRound = integer(v.currentRound);
	if (
		round < 1 ||
		round > currentRound ||
		!ACTIVITY_PERIODS.some((p) => p.value === v.period)
	)
		throw new Error("집계 기간을 확인하지 못했어요.");
	const draw = v.draw === null ? null : object(v.draw);
	const drawNumbers = draw ? parseNumbers(draw.numbers) : null;
	if (
		draw &&
		(!drawNumbers ||
			draw.round !== round ||
			typeof draw.drawDate !== "string" ||
			!/^\d{4}-\d{2}-\d{2}$/.test(draw.drawDate) ||
			integer(draw.bonus) < 1 ||
			integer(draw.bonus) > 45 ||
			drawNumbers.includes(integer(draw.bonus)))
	)
		throw new Error("추첨 번호를 확인하지 못했어요.");
	const knownRounds = list(v.knownRounds).map(integer);
	if (knownRounds.some((r) => r < 1 || r > currentRound))
		throw new Error("수집 회차를 확인하지 못했어요.");
	return {
		round,
		currentRound,
		period: v.period as ActivityPeriod,
		updatedAt: integer(v.updatedAt),
		sources: {
			generated: source(sources.generated, "generated"),
			scanned: source(sources.scanned, "scanned"),
		},
		draw:
			draw && drawNumbers
				? {
						round: integer(draw.round),
						numbers: drawNumbers,
						bonus: integer(draw.bonus),
						drawDate: String(draw.drawDate),
					}
				: null,
		knownRounds,
	};
}
export const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
export function rankNumberCounts(counts: number[]) {
	const sorted = counts
		.map((count, index) => ({ number: index + 1, count }))
		.sort((a, b) => b.count - a.count || a.number - b.number);
	return sorted.map((n) => ({
		...n,
		rank: n.count ? sorted.findIndex((s) => s.count === n.count) + 1 : null,
	}));
}
export function activityNumbers(
	data: ActivityData,
	order: "most" | "least" | "number" = "most",
) {
	const total = sum(data.numberCounts),
		previousTotal = sum(data.previousCounts),
		previous = rankNumberCounts(data.previousCounts);
	const numbers = rankNumberCounts(data.numberCounts).map((n) => {
		const p = previous.find((p) => p.number === n.number);
		return {
			...n,
			share: total ? n.count / total : 0,
			rankChange: n.rank && p?.rank && previousTotal ? p.rank - n.rank : null,
		};
	});
	if (order === "least")
		numbers.sort((a, b) => a.count - b.count || a.number - b.number);
	else if (order === "number") numbers.sort((a, b) => a.number - b.number);
	return numbers;
}
export function numberActivity(data: ActivityData, number: number) {
	const item = activityNumbers(data).find((n) => n.number === number);
	if (!item) throw new RangeError("번호는 1~45 사이여야 합니다.");
	return {
		number: item,
		trend: data.rounds.map((r) => ({
			round: r.round,
			available: r.available,
			count: r.numberCounts[number - 1] ?? 0,
			share: sum(r.numberCounts)
				? r.numberCounts[number - 1] / sum(r.numberCounts)
				: 0,
		})),
		pairs: data.pairs
			.filter((p) => p.a === number || p.b === number)
			.sort((a, b) => b.count - a.count || a.a - b.a || a.b - b.b)
			.slice(0, 5),
	};
}
export function combinationActivity(
	data: ActivityData,
	numbers: readonly number[],
) {
	const ranked = activityNumbers(data);
	const top = new Set(
		ranked
			.filter((n) => n.count > 0)
			.slice(0, 10)
			.map((n) => n.number),
	);
	return {
		topMatches: numbers.filter((n) => top.has(n)),
		numbers: numbers.map((n) => {
			const item = ranked.find((r) => r.number === n);
			if (!item) throw new RangeError("번호는 1~45 사이여야 합니다.");
			return item;
		}),
		available: sum(data.numberCounts) > 0,
	};
}
export function activityComparison(snapshot: ActivitySnapshot) {
	const generated = activityNumbers(snapshot.sources.generated),
		scanned = activityNumbers(snapshot.sources.scanned);
	return generated
		.map((n) => {
			const scannedShare =
				scanned.find((s) => s.number === n.number)?.share ?? 0;
			return {
				number: n.number,
				generatedShare: n.share,
				scannedShare,
				gap: n.share - scannedShare,
			};
		})
		.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap) || a.number - b.number);
}
export async function fetchActivityInsights(
	base: string,
	query: ActivityQuery = {},
	signal?: AbortSignal,
	fetcher: typeof fetch = fetch,
) {
	const params: string[] = [];
	if (query.round !== undefined) {
		if (!Number.isSafeInteger(query.round) || query.round < 1)
			throw new Error("조회할 회차를 확인해 주세요.");
		params.push(`round=${query.round}`);
	}
	if (query.period !== undefined) {
		if (!ACTIVITY_PERIODS.some((p) => p.value === query.period))
			throw new Error("집계 기간을 확인해 주세요.");
		params.push(`period=${query.period}`);
	}
	const controller = new AbortController(),
		cancel = () => controller.abort();
	if (signal?.aborted) cancel();
	signal?.addEventListener("abort", cancel);
	const timer = setTimeout(cancel, 12000);
	try {
		const r = await fetcher(
			`${base.replace(/\/$/, "")}/api/app/v1/lotto/activity${params.length ? `?${params.join("&")}` : ""}`,
			{
				signal: controller.signal,
				credentials: "omit",
				headers: { Accept: "application/json" },
			},
		).catch(() => {
			throw new Error("분석을 불러오지 못했어요. 다시 시도해 주세요.");
		});
		if (!r.ok)
			throw new Error(
				r.status === 404
					? "분석 기능을 준비하고 있어요. 잠시 후 다시 확인해 주세요."
					: "분석을 불러오지 못했어요. 다시 시도해 주세요.",
			);
		const body = await r.json().catch(() => {
			throw new Error("분석 응답을 확인하지 못했어요. 다시 시도해 주세요.");
		});
		const snapshot = parseActivitySnapshot(body);
		if (
			(query.round !== undefined && snapshot.round !== query.round) ||
			snapshot.period !== (query.period ?? "round")
		)
			throw new Error(
				"요청한 분석 기간과 응답이 일치하지 않아요. 다시 불러와 주세요.",
			);
		return snapshot;
	} finally {
		clearTimeout(timer);
		signal?.removeEventListener("abort", cancel);
	}
}
export function createActivityController(
	fetcher: (
		query: ActivityQuery,
		signal: AbortSignal,
	) => Promise<ActivitySnapshot>,
	initial: ActivitySnapshot | null = null,
) {
	let state = { data: initial, error: "", loading: false };
	let query: ActivityQuery = initial
		? { round: initial.round, period: initial.period }
		: {};
	let sequence = 0;
	let active = true;
	let pending: Promise<void> | null = null;
	let abort: AbortController | null = null;
	const listeners = new Set<() => void>();
	const publish = (next: typeof state) => {
		state = next;
		for (const fn of listeners) fn();
	};
	async function load() {
		const epoch = ++sequence;
		abort?.abort();
		abort = new AbortController();
		const signal = abort.signal;
		publish({ ...state, loading: true, error: "" });
		try {
			const requestQuery = { ...query };
			const data = await Promise.resolve().then(() =>
				fetcher(requestQuery, signal),
			);
			if (active && epoch === sequence)
				publish({ data, loading: false, error: "" });
		} catch (e) {
			if (active && epoch === sequence && !signal.aborted)
				publish({
					...state,
					loading: false,
					error: e instanceof Error ? e.message : "분석을 불러오지 못했어요.",
				});
		} finally {
			if (epoch === sequence) pending = null;
		}
	}
	return {
		getSnapshot: () => state,
		subscribe(fn: () => void) {
			listeners.add(fn);
			return () => listeners.delete(fn);
		},
		select(next: ActivityQuery) {
			active = true;
			const changed =
				next.round !== query.round || next.period !== query.period;
			query = next;
			if (changed) {
				abort?.abort();
				pending = null;
				if (
					(next.round !== undefined && next.round !== state.data?.round) ||
					(next.period ?? "round") !== state.data?.period
				)
					publish({ data: null, error: "", loading: false });
			}
			if (!pending) pending = load();
			return pending;
		},
		refresh() {
			active = true;
			if (!pending) pending = load();
			return pending;
		},
		stop() {
			active = false;
			++sequence;
			abort?.abort();
			pending = null;
			publish({ ...state, loading: false });
		},
	};
}
