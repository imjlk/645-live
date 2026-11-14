import { Analytics } from "@apps-in-toss/web-framework";
import { version } from "../package.json";
import { createAdTelemetry } from "./ad-telemetry";
import { LOCAL_PREVIEW } from "./api";
import { createProductTelemetry } from "./product-telemetry";
import { createShoppingTelemetry } from "./shopping-telemetry";

// One random ID per document, shared across product and journey events. Never persisted.
const sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
// Local previews never contaminate production conversion events. The kit
// isolates missing/rejected native bridge calls from generation and ads.
export const adTelemetry = createAdTelemetry(
	(event) => {
		if (LOCAL_PREVIEW) {
			console.info("[lotto analytics]", event.log_name, event.params);
			return;
		}
		return Analytics.log(event);
	},
	version,
	sessionId,
);

export const trackShopping = createShoppingTelemetry((event) => {
	if (LOCAL_PREVIEW) {
		console.info("[lotto analytics]", event.log_name, event.params);
		return;
	}
	return Analytics.log(event);
}, version);

export const trackProduct = createProductTelemetry(
	(event) => {
		if (LOCAL_PREVIEW) {
			console.info("[lotto analytics]", event.log_name, event.params);
			return;
		}
		return Analytics.log(event);
	},
	version,
	sessionId,
);
