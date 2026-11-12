import { expect, test } from "bun:test";
import { createAdTelemetry } from "./ad-telemetry";
import { createPurchaseEntryTelemetry } from "./purchase-entry-telemetry";

test("purchase exposure is deduplicated per presentation and clicks remain separate from checkout", () => {
	const events: { name: string; flow: string; entry: string; type: string }[] =
		[];
	const telemetry = createAdTelemetry((e) => {
		events.push({
			name: e.log_name,
			flow: e.params.flow_id,
			entry: e.params.entry_point,
			type: e.log_type,
		});
	});
	const view = createPurchaseEntryTelemetry(telemetry, "attendance");
	view.infoViewed("price_unavailable");
	view.infoViewed("price_ready");
	view.ctaViewed();
	view.ctaViewed();
	view.clicked();
	view.clicked();
	expect(events.map((e) => e.name)).toEqual([
		"lotto_ad_purchase_info_viewed",
		"lotto_ad_purchase_cta_viewed",
		"lotto_ad_purchase_button_clicked",
		"lotto_ad_purchase_button_clicked",
	]);
	expect(events.every((e) => e.entry === "attendance")).toBe(true);
	expect(events[0].flow).toBe(events[1].flow);
	expect(events[2].flow).not.toBe(events[3].flow);
	expect(events[2].type).toBe("click");
	createPurchaseEntryTelemetry(telemetry, "settings").infoViewed("price_ready");
	expect(events[4].entry).toBe("settings");
});
