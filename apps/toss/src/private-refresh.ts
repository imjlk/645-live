/** Share ordinary reads, but mutation settlement must observe a read started after the mutation. */
export function createPrivateRefresh(load: () => Promise<void>) {
	let pending: Promise<void> | null = null;
	return async (fresh = false) => {
		const previous = pending;
		if (previous) {
			if (!fresh) return previous;
			await previous.catch(() => {});
			if (pending) return pending;
		}
		const request = Promise.resolve().then(load);
		pending = request;
		const clear = () => {
			if (pending === request) pending = null;
		};
		void request.then(clear, clear);
		return request;
	};
}
