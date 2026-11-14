import type { createProductTelemetry } from "./product-telemetry";

/** Keys only deduplicate impressions in memory; IDs/numbers are never sent. */
export function createActionTelemetry(
	track: ReturnType<typeof createProductTelemetry>,
	action: "generation_cta" | "save_cta",
	source: string,
) {
	const seen = new Set<string>();
	const view = (key: string) => {
		if (seen.has(key)) return;
		seen.add(key);
		track(`${action}_viewed`, source);
	};
	return {
		view,
		click(key: string) {
			// A real tap also proves exposure, including taps before the observer fires.
			view(key);
			track(`${action}_clicked`, source);
		},
	};
}
