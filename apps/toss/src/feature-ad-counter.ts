import { createPersistentJsonAtom } from "@trailbase-apps-in-toss-kit/ait-rn/storage";
import type { Storage } from "./saved-store";
export const FEATURE_AD_MIN_USES = 3;
export const FEATURE_AD_MAX_USES = 15;
export const FEATURE_AD_POLICY = `device:${FEATURE_AD_MIN_USES}-${FEATURE_AD_MAX_USES}`;
export function createFeatureAdCounter(
	storage: Storage,
	key: string,
	random = Math.random,
) {
	const interval = () =>
		FEATURE_AD_MIN_USES +
		Math.floor(
			Math.max(0, Math.min(0.999999, random())) *
				(FEATURE_AD_MAX_USES - FEATURE_AD_MIN_USES + 1),
		);
	const atom = createPersistentJsonAtom<number>({
		storage,
		key,
		fallback: () => interval(),
		normalize: (v) =>
			typeof v === "number" &&
			Number.isInteger(v) &&
			v >= 0 &&
			v <= FEATURE_AD_MAX_USES
				? v
				: null,
	});
	let snapshot = { remaining: FEATURE_AD_MAX_USES, ready: false };
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
