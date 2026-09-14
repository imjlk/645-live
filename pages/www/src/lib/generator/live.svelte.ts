import {
	createLiveBatch,
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
	// Subscription events update this non-reactive snapshot. Only batch commits
	// change the rendered feed, including its rows and all 45 absolute counters.
	let currentFeed = initial.feed;
	const initialRows = new Map<number, Generation>();
	let initialCounts: { values: number[]; total: number; at: number } | null =
		null;
	let previousCounts = $state(initial.feed?.numberCounts ?? Array(45).fill(0));
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
	let clearTimer: ReturnType<typeof setTimeout> | undefined;
	const refreshBatch = createLiveBatch<void>(() => void refresh());
	const batch = createLiveBatch<Feed>((next) => {
		if (!active) return;
		const sameRound = feed?.round === next.round;
		const before = feed && sameRound ? feed.numberCounts : next.numberCounts;
		// A focus/reconnect snapshot with identical counts must not erase an SSE pulse.
		if (!sameRound || next.numberCounts.some((v, i) => v !== before[i])) {
			previousCounts = before;
			deltas = next.numberCounts.map((v, i) => Math.max(0, v - before[i]));
			pulses = pulses.map((v, i) => (deltas[i] > 0 ? v + 1 : v));
			clearTimeout(clearTimer);
			clearTimer = setTimeout(() => {
				deltas = Array(45).fill(0);
			}, 1600);
		}
		feed = next;
	});
	function publish(next: Feed) {
		currentFeed = next;
		batch.push(next);
		// The first snapshot of a round is a baseline, not 45 new increments.
		if (!feed || feed.round !== next.round) batch.flush();
	}
	function counts(next: number[], total: number) {
		if (!currentFeed) return;
		publish({ ...currentFeed, numberCounts: next, totalGenerations: total });
	}
	function scheduleRefresh() {
		if (active) refreshBatch.push();
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
			if (!active || context?.targetRound !== round) return;
			try {
				const data = JSON.parse(event.data);
				const r = data.Insert ?? data.Update ?? data.Delete;
				if (!r || r.round !== round) return;
				revision++;
				if (!currentFeed || currentFeed.round !== round) {
					if (data.Delete) {
						deleted.add(r.id);
						initialRows.delete(r.id);
					} else {
						const generation = recordGeneration(r);
						if (generation) initialRows.set(generation.id, generation);
						if (initialRows.size > limit)
							initialRows.delete(Math.min(...initialRows.keys()));
					}
					scheduleRefresh();
					return;
				}
				if (data.Delete) {
					deleted.add(r.id);
					publish({
						...currentFeed,
						generations: currentFeed.generations.filter((g) => g.id !== r.id),
					});
				} else {
					const g = recordGeneration(r);
					if (g) {
						const dropped = currentFeed.generations.length >= limit;
						const generations = mergeFeed(currentFeed.generations, [g], limit);
						const last = generations.at(-1);
						publish({
							...currentFeed,
							generations,
							nextCursor:
								dropped && last
									? `${round}:${last.id}`
									: currentFeed.nextCursor,
						});
					}
				}
			} catch {
				scheduleRefresh();
			}
		};
		countsSource.onmessage = (event) => {
			if (!active || context?.targetRound !== round) return;
			try {
				const data = JSON.parse(event.data);
				const r = data.Insert ?? data.Update;
				if (!r || r.round !== round || Number(r.updated_at) < countsAt) return;
				countsAt = Number(r.updated_at);
				revision++;
				const values = Array.from(
					{ length: 45 },
					(_, i) => Number(r[`generation_count_${i + 1}`]) || 0,
				);
				const total = Number(r.total_generations) || 0;
				if (!currentFeed || currentFeed.round !== round) {
					initialCounts = { values, total, at: countsAt };
					scheduleRefresh();
					return;
				}
				counts(values, total);
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
					batch.cancel();
					currentFeed = null;
					feed = null;
					clearTimeout(clearTimer);
					deltas = Array(45).fill(0);
					revision++;
					limit = 300;
					countsAt = 0;
					deleted.clear();
					initialRows.clear();
					initialCounts = null;
					subscribe(nextContext.targetRound);
				}
				const before = revision;
				const next = await readJson<Feed>(
					`${base()}/api/app/v1/lotto/feed?round=${nextContext.targetRound}`,
				);
				if (!active || context.targetRound !== next.round) return;
				if (before !== revision && currentFeed) {
					scheduleRefresh();
					return;
				}
				// Events arriving during the very first fetch form its baseline too.
				// Waiting for a quiet gap here could starve a busy round indefinitely.
				if (!currentFeed) {
					next.generations = mergeFeed(
						next.generations,
						[...initialRows.values()],
						limit,
					).filter((g) => !deleted.has(g.id));
					const oldest = next.generations.at(-1);
					if (next.generations.length >= limit && oldest)
						next.nextCursor = `${next.round}:${oldest.id}`;
					if (initialCounts && initialCounts.at > next.serverTime) {
						next.numberCounts = initialCounts.values;
						next.totalGenerations = initialCounts.total;
					}
					countsAt = Math.max(next.serverTime, initialCounts?.at ?? 0);
					initialRows.clear();
					initialCounts = null;
				} else countsAt = next.serverTime;
				// On reconnect the first page is authoritative; preserve already loaded older rows.
				const cutoff =
					next.nextCursor === null
						? 0
						: (next.generations.at(-1)?.id ?? Infinity);
				const older =
					currentFeed?.round === next.round
						? currentFeed.generations.filter((g) => g.id < cutoff)
						: [];
				publish({
					...next,
					generations: mergeFeed(older, next.generations, limit),
					nextCursor:
						next.nextCursor === null
							? null
							: older.length
								? currentFeed?.nextCursor
								: next.nextCursor,
				});
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
		if (!currentFeed?.nextCursor || loadingMore) return;
		const cursor = currentFeed.nextCursor;
		const round = currentFeed.round;
		loadingMore = true;
		try {
			const next = await readJson<Feed>(
				`${base()}/api/app/v1/lotto/feed?round=${round}&cursor=${encodeURIComponent(cursor)}`,
			);
			if (!active || currentFeed?.round !== round) return;
			limit += next.generations.length;
			publish({
				...currentFeed,
				generations: mergeFeed(
					currentFeed.generations,
					next.generations.filter((g) => !deleted.has(g.id)),
					limit,
				),
				nextCursor: next.nextCursor,
			});
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
			batch.cancel();
			currentFeed = feed;
			source?.close();
			countsSource?.close();
			clearInterval(timer);
			refreshBatch.cancel();
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
		get previousCounts() {
			return previousCounts;
		},
		start,
		refresh,
		more,
	};
}
export type LiveGenerations = ReturnType<typeof createLiveGenerations>;
