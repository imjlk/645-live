import { expect, test } from "bun:test";
import { createPerformanceTracker } from "./performance";
import { createProductTelemetry } from "./product-telemetry";

test("durations settle once, remain bounded and omit extraneous payloads", () => {
	let clock = 0;
	const events: unknown[] = [];
	const performance = createPerformanceTracker(
		createProductTelemetry((event) => events.push(event), "test"),
		() => clock,
	);
	const timing = performance.start("tab_navigation", "live");
	clock = 58.4;
	timing.end();
	timing.end("failed");
	expect(events).toEqual([
		{
			log_name: "lotto_performance",
			log_type: "event",
			params: {
				source: "live",
				app_version: "test",
				stage: "tab_navigation",
				duration_ms: 58,
				outcome: "ready",
			},
		},
	]);
	const long = performance.start("live_reconnect", "live");
	clock = 200000;
	long.end();
	expect(
		(events[1] as { params: { duration_ms: number } }).params.duration_ms,
	).toBe(120000);
	const rollback = performance.start("startup_context", "startup");
	clock = 1;
	rollback.end("canceled");
	expect(
		(events[2] as { params: { duration_ms: number } }).params.duration_ms,
	).toBe(0);
});
test("failed metrics bridges do not interrupt measured work", async () => {
	for (const track of [
		() => {
			throw new Error("bridge");
		},
		() => Promise.reject(new Error("offline")),
	])
		expect(() =>
			createPerformanceTracker(track).start("generator_ready", "startup").end(),
		).not.toThrow();
	await Promise.resolve();
});
