import { createAdSkipRequestId } from "@trailbase-apps-in-toss-kit/ait-rn/ad-skip";
import { createPersistentJsonAtom } from "@trailbase-apps-in-toss-kit/ait-rn/storage";
import type { Storage } from "./saved-store";

export type GenerationAdPolicy = {
	counter: "device";
	firstGenerations: number;
	firstMaxGenerations?: number;
	experiment?: string;
	storageExperiment?: string;
	/** Carry only an unresolved prompt/daily receipt across a phase transition. */
	previousStorageExperiment?: string;
	initialGenerated?: number;
	variant?: "control" | "short";
	minGenerations: number;
	maxGenerations: number;
};
type Progress = {
	remaining: number;
	lastGenerationId: number | null;
	continuedDay?: number;
	/** Opaque key of the open ad prompt; an ad or a ticket settles it once. */
	prompt?: string;
};
const PROMPT = /^[A-Za-z0-9._:-]{1,128}$/;
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
	principalScope: () => string = () => "",
	newPrompt = () => `g-${createAdSkipRequestId()}`,
) {
	let policy = DEFAULT_POLICY;
	const interval = () =>
		policy.minGenerations +
		Math.floor(random() * (policy.maxGenerations - policy.minGenerations + 1));
	const createAtom = (storageKey: string) =>
		createPersistentJsonAtom<Progress>({
			storage,
			key: storageKey,
			// Each experimental principal starts a fresh, persisted first gate.
			fallback: () => ({
				remaining: Math.max(
					0,
					policy.firstGenerations +
						Math.floor(
							random() *
								((policy.firstMaxGenerations ?? policy.firstGenerations) -
									policy.firstGenerations +
									1),
						) -
						(policy.initialGenerated ?? 0),
				),
				lastGenerationId: null,
			}),
			normalize(value) {
				if (!value || typeof value !== "object") return null;
				const p = value as Progress;
				return Number.isInteger(p.remaining) &&
					p.remaining >= 0 &&
					p.remaining <= MAX_INTERVAL &&
					(p.lastGenerationId === null ||
						(Number.isSafeInteger(p.lastGenerationId) &&
							p.lastGenerationId > 0))
					? {
							remaining: p.remaining,
							lastGenerationId: p.lastGenerationId,
							...(Number.isSafeInteger(p.continuedDay)
								? { continuedDay: p.continuedDay }
								: {}),
							...(typeof p.prompt === "string" && PROMPT.test(p.prompt)
								? { prompt: p.prompt }
								: {}),
						}
					: null;
			},
		});
	let atom = createAtom(key);
	let loadedKey = key;
	let loadEpoch = 0;
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
		const destination = atom;
		writes = writes.then(() => destination.write(progress)).catch(() => {});
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
				Number.isInteger(next.firstMaxGenerations ?? next.firstGenerations) &&
				(next.firstMaxGenerations ?? next.firstGenerations) >=
					next.firstGenerations &&
				(next.firstMaxGenerations ?? next.firstGenerations) <= MAX_INTERVAL &&
				next.minGenerations >= 1 &&
				next.maxGenerations <= MAX_INTERVAL &&
				next.minGenerations <= next.maxGenerations
			)
				policy = next;
			const nextKey = policy.experiment
				? `${key}.${policy.storageExperiment ?? policy.experiment}.${policy.variant}.${principalScope()}`
				: key;
			if (nextKey !== loadedKey) {
				loadedKey = nextKey;
				loadEpoch += 1;
				atom = createAtom(nextKey);
				loading = null;
				snapshot = { ...snapshot, ready: false };
			}
			const epoch = loadEpoch;
			const source = atom;
			const previousKey = policy.previousStorageExperiment
				? `${key}.${policy.previousStorageExperiment}.${policy.variant}.${principalScope()}`
				: null;
			loading ??= writes
				.then(async () => {
					const value = await source.read();
					if (!previousKey) return value;
					try {
						if (await storage.getItem(nextKey)) return value;
						const raw = await storage.getItem(previousKey);
						if (!raw) return value;
						const previous = JSON.parse(raw) as Progress;
						return {
							...value,
							...(Number.isSafeInteger(previous.continuedDay)
								? { continuedDay: previous.continuedDay }
								: {}),
							// A paid/pending ticket receipt must still match its old prompt.
							...(typeof previous.prompt === "string" &&
							PROMPT.test(previous.prompt)
								? { remaining: 0, prompt: previous.prompt }
								: {}),
						};
					} catch {
						return value;
					}
				})
				.then((value) => {
					if (loadEpoch === epoch) publish(value);
				});
			return loading;
		},
		generated(id: number) {
			if (!snapshot.ready || snapshot.lastGenerationId === id) return;
			publish({
				...snapshot,
				remaining: Math.max(0, snapshot.remaining - 1),
				lastGenerationId: id,
			});
		},
		continued(day?: number) {
			const { ready: _, prompt: __, ...progress } = snapshot;
			publish({
				...progress,
				...(Number.isSafeInteger(day) ? { continuedDay: day } : {}),
				remaining: interval(),
				lastGenerationId: snapshot.lastGenerationId,
			});
		},
		/** The current prompt's key, created once and kept until it is continued. */
		opportunityKey() {
			if (!snapshot.ready) return null;
			if (!snapshot.prompt) {
				const { ready: _, ...progress } = snapshot;
				publish({ ...progress, prompt: newPrompt() });
			}
			return snapshot.prompt ?? null;
		},
		prepare() {
			publish({ ...snapshot, remaining: 0 });
		},
	};
}
