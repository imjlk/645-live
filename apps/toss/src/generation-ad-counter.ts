import { createPersistentJsonAtom } from "@trailbase-apps-in-toss-kit/ait-rn/storage";
import type { Storage } from "./saved-store";

export type GenerationAdPolicy = {
	counter: "device";
	firstGenerations: number;
	minGenerations: number;
	maxGenerations: number;
};
type Progress = { remaining: number; lastGenerationId: number | null };
const MAX_INTERVAL = 200;
const DEFAULT_POLICY: GenerationAdPolicy = {
	counter: "device",
	firstGenerations: 5,
	minGenerations: 5,
	maxGenerations: 30,
};

/** This is an ad cadence preference, never a points or attendance entitlement. */
export function createGenerationAdCounter(
	storage: Storage,
	key: string,
	random = Math.random,
) {
	let policy = DEFAULT_POLICY;
	const interval = () =>
		policy.minGenerations +
		Math.floor(random() * (policy.maxGenerations - policy.minGenerations + 1));
	const atom = createPersistentJsonAtom<Progress>({
		storage,
		key,
		// A fresh device reaches its first ad after the fixed first gate.
		fallback: () => ({
			remaining: policy.firstGenerations,
			lastGenerationId: null,
		}),
		normalize(value) {
			if (!value || typeof value !== "object") return null;
			const p = value as Progress;
			return Number.isInteger(p.remaining) &&
				p.remaining >= 0 &&
				p.remaining <= MAX_INTERVAL &&
				(p.lastGenerationId === null ||
					(Number.isSafeInteger(p.lastGenerationId) && p.lastGenerationId > 0))
				? { remaining: p.remaining, lastGenerationId: p.lastGenerationId }
				: null;
		},
	});
	let snapshot: Progress & { ready: boolean } = {
		remaining: MAX_INTERVAL,
		lastGenerationId: null,
		ready: false,
	};
	let loading: Promise<void> | null = null;
	let writes = Promise.resolve();
	const listeners = new Set<() => void>();
	function publish(progress: Progress) {
		snapshot = { ...progress, ready: true };
		for (const listener of listeners) listener();
		// Keep native writes ordered, without making the generation CTA wait for IO.
		writes = writes.then(() => atom.write(progress)).catch(() => {});
	}
	return {
		getSnapshot: () => snapshot,
		subscribe(listener: () => void) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		load(next = DEFAULT_POLICY) {
			if (
				Number.isInteger(next.firstGenerations) &&
				Number.isInteger(next.minGenerations) &&
				Number.isInteger(next.maxGenerations) &&
				next.firstGenerations >= 1 &&
				next.minGenerations >= 1 &&
				next.maxGenerations <= MAX_INTERVAL &&
				next.minGenerations <= next.maxGenerations
			)
				policy = next;
			loading ??= atom.read().then(publish);
			return loading;
		},
		generated(id: number) {
			if (!snapshot.ready || snapshot.lastGenerationId === id) return;
			publish({
				remaining: Math.max(0, snapshot.remaining - 1),
				lastGenerationId: id,
			});
		},
		continued() {
			publish({
				remaining: interval(),
				lastGenerationId: snapshot.lastGenerationId,
			});
		},
		prepare() {
			publish({ remaining: 0, lastGenerationId: snapshot.lastGenerationId });
		},
	};
}
