import { createAdFlow } from "./ad-telemetry";
import { adTelemetry } from "./telemetry";

/** Shared optional analytics transport; no counters or reward decisions depend on it. */
export function createJourneyFlow(entryPoint: "generator" | "attendance") {
	return createAdFlow(adTelemetry, {
		placement: "app_journey",
		policy: "journey-v1",
		format: "product",
		entryPoint,
	});
}

export function journeyErrorCode(error: unknown) {
	// Diagnostic classification only, never arbitrary server messages or receipts.
	if (error instanceof TypeError) return "network";
	return "request_failed";
}
