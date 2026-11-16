export type TimingStage =
	| "page_first_contentful_paint"
	| "page_generator_ready"
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
		start(stage: TimingStage, source: string, started = now()) {
			let ended = false;
			return {
				end(outcome: Timing["outcome"] = "ready", finished = now()) {
					if (ended) return;
					ended = true;
					const elapsed = finished - started;
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
