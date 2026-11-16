import { createPerformanceTracker, type Timing } from "./performance";
import type { createProductTelemetry } from "./product-telemetry";

/** Navigation-relative timings include downloading/parsing JS, unlike model startup. */
export function createPageStartupTracker(
	track: ReturnType<typeof createProductTelemetry>,
	initiallyHidden = false,
	now = () => performance.now(),
) {
	const timings = createPerformanceTracker(track, now);
	const paint = timings.start("page_first_contentful_paint", "startup", 0);
	const ready = timings.start("page_generator_ready", "startup", 0);
	let hidden = initiallyHidden;
	return {
		paint(at: number) {
			paint.end(hidden ? "canceled" : "ready", at);
		},
		finish(outcome: Timing["outcome"]) {
			ready.end(hidden ? "canceled" : outcome);
		},
		hide() {
			hidden = true;
			ready.end("canceled");
		},
	};
}

let entry: ReturnType<typeof createPageStartupTracker> | undefined;
let stop: (() => void) | undefined;

export function startPageStartup(
	track: ReturnType<typeof createProductTelemetry>,
) {
	if (entry) return;
	const early = (
		window as Window & {
			__lottoStartup?: { hidden: boolean; stop: () => void };
		}
	).__lottoStartup;
	entry = createPageStartupTracker(track, early?.hidden || document.hidden);
	early?.stop();
	track("app_opened", "startup");
	let observer: PerformanceObserver | undefined;
	try {
		observer = new PerformanceObserver((list) => {
			const paint = list
				.getEntries()
				.find((item) => item.name === "first-contentful-paint");
			if (paint) {
				entry?.paint(paint.startTime);
				observer?.disconnect();
			}
		});
		observer.observe({ type: "paint", buffered: true });
	} catch {
		// Older WebViews may not expose paint entries; never fabricate a duration.
	}
	const hide = () => {
		if (document.hidden) entry?.hide();
	};
	const leave = () => entry?.hide();
	document.addEventListener("visibilitychange", hide);
	window.addEventListener("pagehide", leave);
	stop = () => {
		document.removeEventListener("visibilitychange", hide);
		window.removeEventListener("pagehide", leave);
	};
}

export function finishPageStartup(outcome: Timing["outcome"]) {
	entry?.finish(outcome);
	stop?.();
}
