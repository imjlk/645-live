import { type Feed, type Generation, mergeFeed } from "@645/lotto-core";

export type FeedHistory = {
	round: number | null;
	items: Generation[];
	nextCursor: string | null;
	loading: boolean;
	error: string | null;
	hasNewer: boolean;
};

/** A stable reading snapshot; live counters and the newest page keep updating separately. */
export function createFeedHistory(
	load: (round: number, signal: AbortSignal, cursor: string) => Promise<Feed>,
) {
	let state: FeedHistory = {
		round: null,
		items: [],
		nextCursor: null,
		loading: false,
		error: null,
		hasNewer: false,
	};
	let latest: Feed | null = null;
	let following = true;
	let paged = false;
	let epoch = 0;
	let pending: AbortController | null = null;
	const deleted = new Set<number>();
	const listeners = new Set<() => void>();
	const publish = (next: FeedHistory) => {
		state = next;
		for (const listener of listeners) listener();
	};
	const cancel = () => {
		epoch++;
		pending?.abort();
		pending = null;
	};
	const showLatest = () => {
		cancel();
		following = true;
		paged = false;
		publish({
			round: latest?.round ?? null,
			items: latest?.generations.filter((item) => !deleted.has(item.id)) ?? [],
			nextCursor: latest?.nextCursor ?? null,
			loading: false,
			error: null,
			hasNewer: false,
		});
	};
	return {
		subscribe: (listener: () => void) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		getSnapshot: () => state,
		cancel,
		showLatest,
		follow: (value: boolean) => {
			if (following === value) return;
			following = value;
			if (following && !paged && !state.loading) showLatest();
		},
		receive: (feed: Feed) => {
			if (
				latest &&
				(feed.round < latest.round ||
					(feed.round === latest.round && feed.serverTime < latest.serverTime))
			)
				return;
			const changedRound = state.round !== feed.round;
			latest = feed;
			if (changedRound) deleted.clear();
			if (changedRound || (following && !paged && !state.loading)) {
				showLatest();
				return;
			}
			// Reconcile deletions covered by the current first page without inserting
			// new rows above the reader or dropping any older pages.
			const head = new Map(feed.generations.map((item) => [item.id, item]));
			const floor =
				feed.nextCursor === null
					? 0
					: (feed.generations.at(-1)?.id ?? Infinity);
			publish({
				...state,
				items: state.items
					.filter(
						(item) =>
							!deleted.has(item.id) && (item.id < floor || head.has(item.id)),
					)
					.map((item) => head.get(item.id) ?? item),
				nextCursor: feed.nextCursor === null ? null : state.nextCursor,
				hasNewer: (feed.generations[0]?.id ?? 0) > (state.items[0]?.id ?? 0),
			});
		},
		remove: (id: number) => {
			deleted.add(id);
			if (state.items.some((item) => item.id === id))
				publish({
					...state,
					items: state.items.filter((item) => item.id !== id),
				});
		},
		async loadMore() {
			const { round, nextCursor: initialCursor } = state;
			if (round === null || initialCursor === null || pending) return;
			let cursor: string = initialCursor;
			const attempt = epoch;
			const controller = new AbortController();
			pending = controller;
			publish({ ...state, loading: true, error: null });
			try {
				for (let skipped = 0; skipped < 4; skipped++) {
					const page: Feed = await load(round, controller.signal, cursor);
					if (attempt !== epoch) return;
					if (page.round !== round || page.nextCursor === cursor)
						throw new Error("목록을 새로고침한 뒤 다시 확인해 주세요.");
					paged = true;
					const items = mergeFeed(
						state.items,
						page.generations.filter((item) => !deleted.has(item.id)),
						Infinity,
					);
					const nextCursor: string | null = page.nextCursor ?? null;
					if (items.length === state.items.length && nextCursor !== null) {
						// Entire pages can be removed while a request is in flight. Keep
						// advancing without requiring another content-size/end event.
						cursor = nextCursor;
						publish({ ...state, nextCursor });
						continue;
					}
					publish({
						...state,
						items,
						nextCursor,
						loading: false,
						error: null,
					});
					return;
				}
				throw new Error("목록이 변경됐어요. 이전 내역을 다시 불러와 주세요.");
			} catch (error) {
				if (attempt === epoch)
					publish({
						...state,
						loading: false,
						error:
							error instanceof Error
								? error.message
								: "이전 내역을 불러오지 못했어요.",
					});
			} finally {
				if (pending === controller) pending = null;
			}
		},
	};
}

export function deletedGenerationId(data: string): number | null {
	try {
		const id = (JSON.parse(data) as { Delete?: { id?: unknown } }).Delete?.id;
		return typeof id === "number" && Number.isSafeInteger(id) && id > 0
			? id
			: null;
	} catch {
		return null;
	}
}
