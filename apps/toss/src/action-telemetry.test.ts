import { expect, test } from "bun:test";
import { createActionTelemetry } from "./action-telemetry";
import { createProductTelemetry } from "./product-telemetry";

test("a fast tap records exposure before click, without sending generation IDs", () => {
	const events: unknown[] = [];
	const action = createActionTelemetry(
		createProductTelemetry((event) => events.push(event), "test", "session"),
		"generation_cta",
		"generator",
	);
	action.click("private-generation-id");
	action.view("private-generation-id");
	action.click("private-generation-id");
	expect(events).toEqual(
		["viewed", "clicked", "clicked"].map((event) => ({
			log_name: `lotto_generation_cta_${event}`,
			log_type: "event",
			params: {
				source: "generator",
				app_version: "test",
				session_id: "session",
			},
		})),
	);
});

test("each new save candidate has one impression even after leaving and returning", () => {
	const events: string[] = [];
	const action = createActionTelemetry(
		createProductTelemetry((event) => events.push(event.log_name)),
		"save_cta",
		"attendance",
	);
	action.view("first");
	action.view("first");
	action.view("next");
	action.view("first");
	action.click("next");
	expect(events).toEqual([
		"lotto_save_cta_viewed",
		"lotto_save_cta_viewed",
		"lotto_save_cta_clicked",
	]);
});
