import { createPersistentJsonAtom } from "@trailbase-apps-in-toss-kit/ait-rn/storage";
import type { Storage } from "./saved-store";
export function createFeatureAdCounter(
	storage: Storage,
	key: string,
	random = Math.random,
) {
	const interval = () =>
		3 + Math.floor(Math.max(0, Math.min(0.999999, random())) * 13);
	const atom = createPersistentJsonAtom<number>({
		storage,
		key,
		fallback: () => interval(),
		normalize: (v) =>
			typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 15
				? v
				: null,
	});
	let snapshot = { remaining: 15, ready: false };
	let loading: Promise<void> | null = null;
	let writes = Promise.resolve();
	const listeners = new Set<() => void>();
	function publish(remaining: number) {
		snapshot = { remaining, ready: true };
		for (const fn of listeners) fn();
		writes = writes.then(() => atom.write(remaining)).catch(() => {});
	}
	return {
		getSnapshot: () => snapshot,
		subscribe(fn: () => void) {
			listeners.add(fn);
			return () => listeners.delete(fn);
		},
		load() {
			loading ??= atom.read().then((v) => publish(v));
			return loading;
		},
		used() {
			if (snapshot.ready) publish(Math.max(0, snapshot.remaining - 1));
		},
		continued() {
			publish(interval());
		},
		prepare() {
			publish(0);
		},
	};
}
