/** Reconcile known pending intents only, with bounded, sequential retries. */
export function startPromotionRefresh(
	claimIds: string[],
	refresh: (ids: string[]) => Promise<unknown>,
	schedule: (callback: () => void, delay: number) => () => void = (
		callback,
		delay,
	) => {
		const timer = setTimeout(callback, delay);
		return () => clearTimeout(timer);
	},
) {
	const ids = [...new Set(claimIds.filter(Boolean))].slice(0, 5);
	let closed = false;
	let attempts = 0;
	let cancel = () => {};
	async function check() {
		if (closed) return;
		try {
			await refresh(ids);
		} catch {
			/* The regular attendance refresh remains available. */
		}
		attempts++;
		if (!closed && attempts < 3)
			cancel = schedule(() => {
				void check();
			}, 4000);
	}
	if (ids.length)
		cancel = schedule(() => {
			void check();
		}, 1500);
	return () => {
		closed = true;
		cancel();
	};
}
