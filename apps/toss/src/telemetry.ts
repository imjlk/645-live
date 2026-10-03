import { eventLog } from "@apps-in-toss/framework";
import { version } from "../package.json";
import { createAdTelemetry } from "./ad-telemetry";
import { LOCAL_PREVIEW } from "./api";
import { createProductTelemetry } from "./product-telemetry";

// Local previews never contaminate production conversion events. The kit
// isolates missing/rejected native bridge calls from generation and ads.
export const adTelemetry = createAdTelemetry((event) => {
	if (LOCAL_PREVIEW) {
		console.info("[lotto analytics]", event.log_name, event.params);
		return;
	}
	return eventLog(event);
}, version);

export const trackProduct = createProductTelemetry((event) => {
	if (LOCAL_PREVIEW) {
		console.info("[lotto analytics]", event.log_name, event.params);
		return;
	}
	return eventLog(event);
}, version);
