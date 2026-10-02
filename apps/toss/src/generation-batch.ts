import type { GenerationOptions } from "@645/lotto-core";

export const GENERATION_BATCH_SIZE = 5;
// The server enforces 1s between writes. Wait from the previous response,
// rather than issuing a burst or relying on animation duration.
export const GENERATION_BATCH_INTERVAL_MS = 1_100;
type Phase = "idle" | "ad" | "generating" | "paused";
type BatchProgress = { phase: Phase; completed: number; remaining: number };
type BatchAction = {
	options: GenerationOptions;
	authorize: () => Promise<void>;
	generate: (options: GenerationOptions) => Promise<void>;
	canContinue: () => boolean;
};

/** A partially completed batch keeps its original conditions and ad credit.
 * A retry creates only the remaining combinations, without a second ad.
 * Credit is confined to this app session and never grants points or attendance.
 */
export function createGenerationBatch(
	wait: (signal: AbortSignal) => Promise<void> = (signal) =>
		new Promise((resolve, reject) => {
			const cancel = () => {
				clearTimeout(timer);
				reject(new Error("여러 번호 만들기를 중단했어요."));
			};
			const timer = setTimeout(() => {
				signal.removeEventListener("abort", cancel);
				resolve();
			}, GENERATION_BATCH_INTERVAL_MS);
			if (signal.aborted) cancel();
			else signal.addEventListener("abort", cancel, { once: true });
		}),
) {
	let progress: BatchProgress = { phase: "idle", completed: 0, remaining: 0 };
	let pending: GenerationOptions | null = null;
	let running = false;
	let disposed = false;
	const abort = new AbortController();
	const listeners = new Set<() => void>();
	function publish(phase: Phase, completed = progress.completed) {
		progress = {
			phase,
			completed,
			remaining: pending ? GENERATION_BATCH_SIZE - completed : 0,
		};
		if (!disposed) for (const listener of listeners) listener();
	}
	return {
		getSnapshot: () => progress,
		subscribe(listener: () => void) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		reset() {
			if (running) return false;
			pending = null;
			publish("idle", 0);
			return true;
		},
		async run(action: BatchAction) {
			if (running || disposed) return false;
			running = true;
			try {
				if (!pending) {
					// Freeze conditions before a native ad or any async work opens.
					const options = {
						...action.options,
						fixed: [...action.options.fixed],
						excluded: [...action.options.excluded],
					};
					publish("ad", 0);
					await action.authorize();
					if (disposed) return false;
					pending = options;
					publish("generating", 0);
				} else {
					// A separate normal generation may have occurred since the failure.
					await wait(abort.signal);
					publish("generating");
				}
				while (progress.completed < GENERATION_BATCH_SIZE) {
					if (disposed) return false;
					if (!action.canContinue())
						throw new Error(
							"앱으로 돌아오면 남은 번호를 이어서 만들 수 있어요.",
						);
					await action.generate(pending);
					if (disposed) return false;
					publish("generating", progress.completed + 1);
					if (progress.completed < GENERATION_BATCH_SIZE)
						await wait(abort.signal);
				}
				pending = null;
				return true;
			} finally {
				running = false;
				publish(pending ? "paused" : "idle");
			}
		},
		dispose() {
			disposed = true;
			abort.abort();
			listeners.clear();
		},
	};
}
