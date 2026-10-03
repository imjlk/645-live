export type TimingStage =
	| "startup_context"
	| "startup_session"
	| "generator_ready"
	| "tab_navigation"
	| "insights_first_load"
	| "live_reconnect";
export type Timing = {
	stage: TimingStage;
	duration_ms: number;
	outcome: "ready" | "failed" | "canceled";
};
export function createPerformanceTracker(
	track: (event: "performance", source: string, timing: Timing) => unknown,
	now = () => globalThis.performance?.now?.() ?? Date.now(),
) {
	return {
		start(stage: TimingStage, source: string) {
			const started = now();
			let ended = false;
			return {
				end(outcome: Timing["outcome"] = "ready") {
					if (ended) return;
					ended = true;
					const elapsed = now() - started;
					const duration_ms = Number.isFinite(elapsed)
						? Math.round(Math.max(0, Math.min(120000, elapsed)))
						: 0;
					try {
						void Promise.resolve(
							track("performance", source, { stage, duration_ms, outcome }),
						).catch(() => {});
					} catch {
						/* Measurement cannot interrupt navigation or bootstrap. */
					}
				},
			};
		},
	};
}
