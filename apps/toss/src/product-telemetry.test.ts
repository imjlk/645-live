import { expect, test } from "bun:test";
import { createProductTelemetry } from "./product-telemetry";

test("funnel telemetry contains only event and bounded source, and cannot break actions", async () => {
	const events: unknown[] = [];
	const track = createProductTelemetry((event) => events.push(event));
	track("combination_saved", "first_save");
	expect(events).toEqual([
		{
			log_name: "lotto_combination_saved",
			log_type: "event",
			params: { source: "first_save" },
		},
	]);
	expect(() =>
		createProductTelemetry(() => {
			throw new Error("native unavailable");
		})("generation_started"),
	).not.toThrow();
	createProductTelemetry(() => Promise.reject(new Error("offline")))(
		"generation_succeeded",
	);
	await Promise.resolve();
});
