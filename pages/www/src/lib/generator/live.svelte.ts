import {
	type Feed,
	type Generation,
	mergeFeed,
	parseNumbers,
	type RoundContext,
} from "@645/lotto-core";
import type { GenerationPreview } from "$lib/server/generation-preview";
import { readJson } from "./api";

export function recordGeneration(
	record: Record<string, unknown>,
): Generation | null {
	const numbers = parseNumbers(
		Array.from({ length: 6 }, (_, i) => Number(record[`number_${i + 1}`])),
	);
	if (
		!numbers ||
		!Number.isSafeInteger(record.id) ||
		!Number.isSafeInteger(record.round) ||
		typeof record.display_name !== "string" ||
		!Number.isFinite(record.created_at)
	)
		return null;
	return {
		id: Number(record.id),
		round: Number(record.round),
		numbers,
		displayName: record.display_name,
		createdAt: Number(record.created_at),
	};
}
export function createLiveGenerations(
	initial: GenerationPreview,
	base: () => string,
) {
	let context = $state(initial.context);
	let feed = $state(initial.feed);
	let sourceOpen = $state(false);
	let countsOpen = $state(false);
	let limit = 300;
	const deleted = new Set<number>();
	let error = $state("");
	let loadingMore = $state(false);
	let deltas = $state<number[]>(Array(45).fill(0));
	let pulses = $state<number[]>(Array(45).fill(0));
	let active = false;
	let revision = 0;
	let countsAt = initial.feed?.serverTime ?? 0;
	let refreshPending: Promise<void> | null = null;
	let source: EventSource | null = null;
	let countsSource: EventSource | null = null;
	let refreshTimer: ReturnType<typeof setTimeout> | undefined;
	let clearTimer: ReturnType<typeof setTimeout> | undefined;
	function counts(next: number[], total: number) {
		if (!feed) return;
		const previous = feed.numberCounts;
		// A focus/reconnect snapshot with identical counts must not erase an SSE pulse.
		if (
			total === feed.totalGenerations &&
			next.every((v, i) => v === previous[i])
		)
			return;
		const change = next.map((v, i) => v - previous[i]);
		deltas = change.map((delta, i) => (delta < 0 ? 0 : deltas[i] + delta));
		pulses = pulses.map((v, i) => (change[i] > 0 ? v + 1 : v));
		feed = { ...feed, numberCounts: next, totalGenerations: total };
		clearTimeout(clearTimer);
		clearTimer = setTimeout(() => {
			deltas = Array(45).fill(0);
		}, 2400);
	}
	function scheduleRefresh() {
		clearTimeout(refreshTimer);
		refreshTimer = setTimeout(() => {
			void refresh();
		}, 300);
	}
	function subscribe(round: number) {
		source?.close();
		countsSource?.close();
		sourceOpen = false;
		countsOpen = false;
		source = new EventSource(
			`${base()}/api/records/v1/lotto_public_generations/subscribe/*`,
		);
		countsSource = new EventSource(
			`${base()}/api/records/v1/lotto_draw_generation_counts/subscribe/*`,
		);
		source.onopen = () => {
			sourceOpen = true;
			scheduleRefresh();
		};
		source.onerror = () => {
			sourceOpen = false;
			error = "실시간 연결을 복구하고 있어요.";
		};
		countsSource.onopen = () => {
			countsOpen = true;
			scheduleRefresh();
		};
		countsSource.onerror = () => {
			countsOpen = false;
		};
		source.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				const r = data.Insert ?? data.Update ?? data.Delete;
				if (!r || r.round !== round) return;
				revision++;
				if (!feed || feed.round !== round) {
					scheduleRefresh();
					return;
				}
				if (data.Delete) {
					deleted.add(r.id);
					feed = {
						...feed,
						generations: feed.generations.filter((g) => g.id !== r.id),
					};
				} else {
					const g = recordGeneration(r);
					if (g) {
						const dropped = feed.generations.length >= limit;
						const generations = mergeFeed(feed.generations, [g], limit);
						feed = {
							...feed,
							generations,
							nextCursor: dropped
								? `${round}:${generations.at(-1)!.id}`
								: feed.nextCursor,
						};
					}
				}
			} catch {
				scheduleRefresh();
			}
		};
		countsSource.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				const r = data.Insert ?? data.Update;
				if (!r || r.round !== round || Number(r.updated_at) < countsAt) return;
				countsAt = Number(r.updated_at);
				revision++;
				if (!feed || feed.round !== round) {
					scheduleRefresh();
					return;
				}
				counts(
					Array.from(
						{ length: 45 },
						(_, i) => Number(r[`generation_count_${i + 1}`]) || 0,
					),
					Number(r.total_generations) || 0,
				);
			} catch {
				scheduleRefresh();
			}
		};
	}
	async function refresh() {
		if (!active) return;
		if (refreshPending) return refreshPending;
		const task = (async () => {
			try {
				const nextContext = await readJson<RoundContext>(
					`${base()}/api/app/v1/lotto/round-context`,
				);
				if (!active) return;
				const changed = context?.targetRound !== nextContext.targetRound;
				context = nextContext;
				if (changed || !source) {
					feed = null;
					revision++;
					limit = 300;
					countsAt = 0;
					deleted.clear();
					subscribe(nextContext.targetRound);
				}
				const before = revision;
				const next = await readJson<Feed>(
					`${base()}/api/app/v1/lotto/feed?round=${nextContext.targetRound}`,
				);
				if (!active || context.targetRound !== next.round) return;
				if (before !== revision) {
					scheduleRefresh();
					return;
				}
				countsAt = next.serverTime;
				// On reconnect the first page is authoritative; preserve already loaded older rows.
				const cutoff =
					next.nextCursor === null
						? 0
						: (next.generations.at(-1)?.id ?? Infinity);
				const older =
					feed?.round === next.round
						? feed.generations.filter((g) => g.id < cutoff)
						: [];
				if (feed?.round === next.round)
					counts(next.numberCounts, next.totalGenerations);
				feed = {
					...next,
					generations: mergeFeed(older, next.generations, limit),
					nextCursor:
						next.nextCursor === null
							? null
							: older.length
								? feed?.nextCursor
								: next.nextCursor,
				};
				error = "";
			} catch {
				if (active)
					error = "현재 생성 현황을 불러오지 못했어요. 다시 연결해 주세요.";
			}
		})();
		refreshPending = task;
		try {
			await task;
		} finally {
			if (refreshPending === task) refreshPending = null;
		}
	}
	async function more() {
		if (!feed?.nextCursor || loadingMore) return;
		const cursor = feed.nextCursor;
		const round = feed.round;
		loadingMore = true;
		try {
			const next = await readJson<Feed>(
				`${base()}/api/app/v1/lotto/feed?round=${round}&cursor=${encodeURIComponent(cursor)}`,
			);
			if (!active || feed?.round !== round) return;
			limit += next.generations.length;
			feed = {
				...feed,
				generations: mergeFeed(
					feed.generations,
					next.generations.filter((g) => !deleted.has(g.id)),
					limit,
				),
				nextCursor: next.nextCursor,
			};
			error = "";
		} catch {
			error = "이전 조합을 불러오지 못했어요. 다시 시도해 주세요.";
		} finally {
			loadingMore = false;
		}
	}
	function start() {
		active = true;
		if (context) subscribe(context.targetRound);
		void refresh();
		const timer = setInterval(() => {
			if (document.visibilityState === "visible") void refresh();
		}, 30000);
		const visible = () => {
			if (document.visibilityState === "visible") void refresh();
		};
		document.addEventListener("visibilitychange", visible);
		window.addEventListener("online", visible);
		return () => {
			active = false;
			source?.close();
			countsSource?.close();
			clearInterval(timer);
			clearTimeout(refreshTimer);
			clearTimeout(clearTimer);
			document.removeEventListener("visibilitychange", visible);
			window.removeEventListener("online", visible);
		};
	}
	return {
		get context() {
			return context;
		},
		get feed() {
			return feed;
		},
		get connected() {
			return sourceOpen && countsOpen;
		},
		get error() {
			return error;
		},
		get loadingMore() {
			return loadingMore;
		},
		get deltas() {
			return deltas;
		},
		get pulses() {
			return pulses;
		},
		start,
		refresh,
		more,
	};
}
export type LiveGenerations = ReturnType<typeof createLiveGenerations>;
