/** One sheet session: fair batches, three attempts per claim, and no overlapping requests. */
export function createPromotionRefresh(
	refresh: (ids: string[]) => Promise<unknown>,
	schedule: (callback: () => void, delay: number) => () => void = (
		callback,
		delay,
	) => {
		const timer = setTimeout(callback, delay);
		return () => clearTimeout(timer);
	},
) {
	const attempts = new Map<string, number>();
	let ids: string[] = [];
	let closed = false;
	let paused = false;
	let running = false;
	let cancel = () => {};
	const count = (id: string) => attempts.get(id) ?? 0;
	function enqueue(delay: number) {
		cancel();
		if (closed || paused || running || !ids.some((id) => count(id) < 3)) return;
		cancel = schedule(() => {
			void check();
		}, delay);
	}
	async function check() {
		if (closed || paused || running) return;
		const batch = ids
			.filter((id) => count(id) < 3)
			.sort((a, b) => count(a) - count(b))
			.slice(0, 5);
		if (!batch.length) return;
		running = true;
		// Consume attempts before awaiting so busy/state changes cannot reset the budget.
		for (const id of batch) attempts.set(id, count(id) + 1);
		try {
			await refresh(batch);
		} catch {
			/* Regular attendance refresh remains available. */
		} finally {
			running = false;
			enqueue(4000);
		}
	}
	return {
		update(claimIds: string[], busy = false) {
			ids = [...new Set(claimIds.filter(Boolean))];
			paused = busy;
			enqueue(1500);
		},
		dispose() {
			closed = true;
			cancel();
		},
	};
}
