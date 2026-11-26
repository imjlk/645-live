import type { PurchaseEntryPoint } from "./ad-free";
import { type AdTelemetry, createAdFlow } from "./ad-telemetry";

/** Presentation events are separate from accepted checkout attempts. */
export function createPurchaseEntryTelemetry(
	telemetry: AdTelemetry,
	entryPoint: PurchaseEntryPoint,
) {
	const context = {
		placement: "ad_free_purchase",
		policy: "purchase-v1",
		format: "non_consumable",
		entryPoint,
	};
	const presentation = createAdFlow(telemetry, context);
	return {
		linkViewed: () => presentation.track("purchase_link_viewed"),
		linkClicked: () => presentation.track("purchase_link_clicked"),
		infoViewed: (outcome: "price_ready" | "price_unavailable") =>
			presentation.track("purchase_info_viewed", outcome),
		ctaViewed: () => presentation.track("purchase_cta_viewed", "price_ready"),
		clicked: () =>
			createAdFlow(telemetry, context).track(
				"purchase_button_clicked",
				"price_ready",
			),
	};
}
