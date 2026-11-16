import { expect, test } from "bun:test";
import { createAdTelemetry } from "./ad-telemetry";
import { createProductTelemetry } from "./product-telemetry";

test("product and journey events can be joined within one document without an account ID", () => {
	const sessions: Array<string | undefined> = [];
	createProductTelemetry(
		(event) => {
			sessions.push(event.params.session_id);
		},
		"test",
		"entry-session",
	)("app_opened");
	createAdTelemetry(
		(event) => {
			sessions.push(event.params.session_id);
		},
		"test",
		"entry-session",
	).track("journey_entered", { placement: "app_journey" });
	expect(sessions).toEqual(["entry-session", "entry-session"]);
});

test("funnel telemetry contains only event and bounded source, and cannot break actions", async () => {
	const events: unknown[] = [];
	const track = createProductTelemetry((event) => events.push(event));
	track("combination_saved", "first_save");
	expect(events).toEqual([
		{
			log_name: "lotto_combination_saved",
			log_type: "event",
			params: { source: "first_save", app_version: "unknown" },
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

test("release comparisons retain only bounded version and source metadata", () => {
	const events: unknown[] = [];
	const track = createProductTelemetry((event) => events.push(event), "1.4.4");
	track("insights_detail_viewed", "ranking");
	expect(events).toEqual([
		{
			log_name: "lotto_insights_detail_viewed",
			log_type: "event",
			params: { source: "ranking", app_version: "1.4.4" },
		},
	]);
});
