/** Keep rendering predictable even when a subscription never becomes quiet. */
export const LIVE_BATCH_MS = 1000;
export const LIVE_COUNT_MOTION_MS = 800;

export type BatchTimer = (callback: () => void, delay: number) => () => void;
const schedule: BatchTimer = (callback, delay) => {
	const timer = setTimeout(callback, delay);
	return () => clearTimeout(timer);
};

/** Trailing throttle: replace the pending value without moving its deadline. */
export function createLiveBatch<T>(
	publish: (value: T) => void,
	timer: BatchTimer = schedule,
) {
	let pending: { value: T } | null = null;
	let cancelTimer: (() => void) | null = null;
	const cancel = () => {
		cancelTimer?.();
		cancelTimer = null;
		pending = null;
	};
	const flush = () => {
		const next = pending;
		cancel();
		if (next) publish(next.value);
	};
	return {
		push(value: T) {
			pending = { value };
			cancelTimer ??= timer(flush, LIVE_BATCH_MS);
		},
		flush,
		cancel,
	};
}
