import { expect, test } from "bun:test";
import { createPageStartupTracker } from "./page-startup";
import type { Timing } from "./performance";

test("page startup includes pre-React time and uses the buffered paint timestamp", () => {
	let clock = 2500;
	const events: Timing[] = [];
	const page = createPageStartupTracker(
		(_event, _source, timing) => {
			if (timing) events.push(timing);
		},
		false,
		() => clock,
	);
	page.paint(80);
	clock = 2800;
	page.finish("ready");
	page.finish("failed");
	page.paint(100);
	expect(events).toEqual([
		{ stage: "page_first_contentful_paint", duration_ms: 80, outcome: "ready" },
		{ stage: "page_generator_ready", duration_ms: 2800, outcome: "ready" },
	]);
});

test("background launches and hidden-before-ready launches are excluded from ready timings", () => {
	for (const hiddenAtStart of [true, false]) {
		const events: Timing[] = [];
		const page = createPageStartupTracker(
			(_event, _source, timing) => {
				if (timing) events.push(timing);
			},
			hiddenAtStart,
			() => 3000,
		);
		if (!hiddenAtStart) page.hide();
		page.finish("ready");
		page.paint(2000);
		expect(events).toHaveLength(2);
		expect(events.every((event) => event.outcome === "canceled")).toBe(true);
	}
});

test("an initial failure stays a failure after retry; retry timings remain in the existing tracker", () => {
	const events: Timing[] = [];
	const page = createPageStartupTracker(
		(_event, _source, timing) => {
			if (timing) events.push(timing);
		},
		false,
		() => 12000,
	);
	page.finish("failed");
	page.finish("ready");
	expect(events).toEqual([
		{ stage: "page_generator_ready", duration_ms: 12000, outcome: "failed" },
	]);
});
