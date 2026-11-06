import { createAdSkipRequestId } from "@trailbase-apps-in-toss-kit/ait-web/ad-skip";
import { createPersistentJsonAtom } from "@trailbase-apps-in-toss-kit/ait-web/storage";
import type { Storage } from "./saved-store";
export const FEATURE_AD_MIN_USES = 3;
export const FEATURE_AD_MAX_USES = 15;
export const FEATURE_AD_POLICY = `device:${FEATURE_AD_MIN_USES}-${FEATURE_AD_MAX_USES}`;
const PROMPT = /^[A-Za-z0-9._:-]{1,128}$/;
type Progress = { remaining: number; prompt: string | null };
/**
 * Device-owned detail cadence. A due prompt keeps one opaque key until it is
 * continued, so a watched ad and an ad skip ticket settle the same prompt once.
 */
export function createFeatureAdCounter(
	storage: Storage,
	key: string,
	random = Math.random,
	newPrompt = () => `f-${createAdSkipRequestId()}`,
) {
	const interval = () =>
		FEATURE_AD_MIN_USES +
		Math.floor(
			Math.max(0, Math.min(0.999999, random())) *
				(FEATURE_AD_MAX_USES - FEATURE_AD_MIN_USES + 1),
		);
	const valid = (v: unknown): v is number =>
		typeof v === "number" &&
		Number.isInteger(v) &&
		v >= 0 &&
		v <= FEATURE_AD_MAX_USES;
	// A plain number is the original format; an object only while a prompt is open.
	const atom = createPersistentJsonAtom<number | Progress>({
		storage,
		key,
		fallback: () => interval(),
		normalize: (v) => {
			if (valid(v)) return v;
			const p = v as Progress | null;
			return p &&
				typeof p === "object" &&
				valid(p.remaining) &&
				typeof p.prompt === "string" &&
				PROMPT.test(p.prompt)
				? { remaining: p.remaining, prompt: p.prompt }
				: null;
		},
	});
	let snapshot = {
		remaining: FEATURE_AD_MAX_USES,
		prompt: null as string | null,
		ready: false,
	};
	let loading: Promise<void> | null = null;
	let writes = Promise.resolve();
	const listeners = new Set<() => void>();
	function publish(remaining: number, prompt: string | null = null) {
		snapshot = { remaining, prompt, ready: true };
		for (const fn of listeners) fn();
		const value = prompt ? { remaining, prompt } : remaining;
		writes = writes.then(() => atom.write(value)).catch(() => {});
	}
	return {
		getSnapshot: () => snapshot,
		subscribe(fn: () => void) {
			listeners.add(fn);
			return () => listeners.delete(fn);
		},
		load() {
			loading ??= atom
				.read()
				.then((v) =>
					typeof v === "number" ? publish(v) : publish(v.remaining, v.prompt),
				);
			return loading;
		},
		used() {
			if (snapshot.ready)
				publish(Math.max(0, snapshot.remaining - 1), snapshot.prompt);
		},
		continued() {
			publish(interval());
		},
		prepare() {
			publish(0, snapshot.prompt);
		},
		/** The current prompt's key, created once and kept until it is continued. */
		opportunityKey() {
			if (!snapshot.ready) return null;
			if (!snapshot.prompt) publish(snapshot.remaining, newPrompt());
			return snapshot.prompt;
		},
	};
}
