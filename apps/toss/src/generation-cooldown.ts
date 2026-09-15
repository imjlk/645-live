export const GENERATION_COOLDOWN_MS = 1_000;
type Schedule = (callback: () => void, delay: number) => () => void;

export function createGenerationCooldown(
	now = Date.now,
	schedule: Schedule = (callback, delay) => {
		const timer = setTimeout(callback, delay);
		return () => clearTimeout(timer);
	},
) {
	let until = 0;
	let cooling = false;
	let cancel: (() => void) | null = null;
	const listeners = new Set<() => void>();
	const publish = (value: boolean) => {
		cooling = value;
		for (const listener of listeners) listener();
	};
	return {
		getSnapshot: () => cooling,
		subscribe(listener: () => void) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		blocked: () => now() < until,
		start() {
			cancel?.();
			until = now() + GENERATION_COOLDOWN_MS;
			publish(true);
			cancel = schedule(() => {
				cancel = null;
				publish(false);
			}, GENERATION_COOLDOWN_MS);
		},
		stop() {
			cancel?.();
			cancel = null;
			until = 0;
			publish(false);
		},
	};
}
