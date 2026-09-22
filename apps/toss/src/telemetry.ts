import { eventLog } from "@apps-in-toss/framework";
import { createAdTelemetry } from "./ad-telemetry";
import { LOCAL_PREVIEW } from "./api";
import { createProductTelemetry } from "./product-telemetry";

// Local previews never contaminate production conversion events. The kit
// isolates missing/rejected native bridge calls from generation and ads.
export const adTelemetry = createAdTelemetry((event) => {
	if (LOCAL_PREVIEW) return;
	return eventLog(event);
});

export const trackProduct = createProductTelemetry((event) => {
	if (LOCAL_PREVIEW) return;
	return eventLog(event);
});
