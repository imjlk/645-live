import { expect, test } from "bun:test";
import { adPolicyLabel } from "./ad-telemetry";
import { createGenerationAdCounter } from "./generation-ad-counter";
import {
	dailyGenerationAdRequired,
	generationAdVariant,
	generationExperimentPolicy,
} from "./generation-ad-experiment";

const base = {
	counter: "device" as const,
	firstGenerations: 5,
	minGenerations: 5,
	maxGenerations: 30,
};
function principal(variant: "control" | "short") {
	const result = Array.from({ length: 100 }, (_, i) => `test-${i}`).find(
		(id) => generationAdVariant(id) === variant,
	);
	if (!result) throw Error("Missing fixture principal");
	return result;
}
function storage() {
	const values = new Map<string, string>();
	return {
		getItem: async (key: string) => values.get(key) ?? null,
		setItem: async (key: string, value: string) => {
			values.set(key, value);
		},
	};
}
test("stable balanced assignment does not override changed server policy", () => {
	const sample = Array.from({ length: 1000 }, (_, i) =>
		generationAdVariant(`test-${i}`),
	);
	expect(sample.filter((x) => x === "short").length).toBeGreaterThan(450);
	expect(sample.filter((x) => x === "short").length).toBeLessThan(550);
	expect(generationAdVariant(principal("short"))).toBe("short");
	expect(generationExperimentPolicy(base, "")).toBe(base);
	const rollback = { ...base, maxGenerations: 29 };
	expect(generationExperimentPolicy(rollback, "any")).toBe(rollback);
	expect(generationExperimentPolicy(undefined, "any")).toBeUndefined();
});
for (const [random, expected, recurring] of [
	[0, 1, 2],
	[0.25, 1, 3],
	[0.5, 2, 5],
	[0.999999, 3, 8],
]) {
	test(`short arm first and recurring gates draw ${expected}, persist, and ignore replay`, async () => {
		const db = storage();
		const id = principal("short");
		const policy = generationExperimentPolicy(base, id);
		if (!policy) throw Error("Missing fixture policy");
		const counter = createGenerationAdCounter(
			db,
			"cadence",
			() => random,
			() => id,
		);
		await counter.load(policy);
		expect(counter.getSnapshot().remaining).toBe(expected);
		for (let n = 1; n <= expected; n++) {
			counter.generated(n);
			counter.generated(n);
		}
		expect(counter.getSnapshot().remaining).toBe(0);
		counter.continued(123);
		expect(counter.getSnapshot().remaining).toBe(recurring);
		// The generation performed by the ad CTA is the first in the new cycle.
		counter.generated(100);
		expect(counter.getSnapshot().remaining).toBe(recurring - 1);
		await Bun.sleep(1);
		const reopened = createGenerationAdCounter(
			db,
			"cadence",
			() => 0.9,
			() => id,
		);
		await reopened.load(policy);
		expect(reopened.getSnapshot().continuedDay).toBe(123);
		expect(reopened.getSnapshot().remaining).toBe(recurring - 1);
		expect(adPolicyLabel(policy)).toBe(
			"generation-cadence-v3/short:device:1-3:2-8",
		);
	});
}
test("control uses daily N plus local M, preserves the remaining count across days and accounts", async () => {
	const db = storage();
	let id = principal("control");
	await db.setItem(
		"cadence",
		JSON.stringify({ remaining: 29, lastGenerationId: 10 }),
	);
	const counter = createGenerationAdCounter(
		db,
		"cadence",
		() => 0.999999,
		() => id,
	);
	await counter.load(generationExperimentPolicy(base, id, undefined, 3));
	expect(counter.getSnapshot().remaining).toBe(8);
	for (let n = 1; n <= 3; n++) counter.generated(n);
	expect(counter.getSnapshot().remaining).toBe(5);
	// The next day's larger attendance target does not reset the five remaining generations.
	await counter.load(generationExperimentPolicy(base, id, undefined, 5));
	expect(counter.getSnapshot().remaining).toBe(5);
	counter.continued();
	expect(counter.getSnapshot().remaining).toBe(10);
	id = principal("short");
	await counter.load(generationExperimentPolicy(base, id));
	expect(counter.getSnapshot().remaining).toBe(3);
	await counter.load({ ...base, maxGenerations: 29 });
	expect(counter.getSnapshot().remaining).toBe(29);
});
test("control can finish tomorrow's attendance without an ad and draws after N plus M", async () => {
	const id = principal("control");
	const db = storage();
	const counter = createGenerationAdCounter(
		db,
		"cadence",
		() => 0.999999,
		() => id,
	);
	await counter.load(generationExperimentPolicy(base, id, undefined, 3));
	for (let n = 1; n <= 3; n++) counter.generated(n);
	await Bun.sleep(1);
	const reopened = createGenerationAdCounter(
		db,
		"cadence",
		() => 0,
		() => id,
	);
	await reopened.load(generationExperimentPolicy(base, id, undefined, 3, 0));
	for (let n = 4; n <= 6; n++) reopened.generated(n);
	expect(reopened.getSnapshot().remaining).toBe(2);
	reopened.generated(7);
	reopened.generated(8);
	expect(reopened.getSnapshot().remaining).toBe(0);
});
test("treatment preserves v2 progress while control gets its own v3 progress", async () => {
	const db = storage();
	const id = principal("short");
	await db.setItem(
		`cadence.generation-cadence-v2.short.${id}`,
		JSON.stringify({ remaining: 6, lastGenerationId: 9, continuedDay: 100 }),
	);
	const counter = createGenerationAdCounter(
		db,
		"cadence",
		() => 0,
		() => id,
	);
	await counter.load(generationExperimentPolicy(base, id));
	expect(counter.getSnapshot()).toMatchObject({
		remaining: 6,
		lastGenerationId: 9,
		continuedDay: 100,
	});
});

test("daily continuation applies only to repeat attendance in treatment and resets next day", () => {
	const policy = generationExperimentPolicy(base, principal("short"));
	const attendance = {
		day: 100,
		streak: 1,
		generatedToday: false,
		checkedIn: false,
	};
	expect(dailyGenerationAdRequired(policy, attendance, undefined)).toBe(true);
	expect(dailyGenerationAdRequired(policy, attendance, 100)).toBe(false);
	expect(
		dailyGenerationAdRequired(policy, { ...attendance, day: 101 }, 100),
	).toBe(true);
	expect(
		dailyGenerationAdRequired(policy, { ...attendance, streak: 0 }, undefined),
	).toBe(false);
	expect(
		dailyGenerationAdRequired(
			policy,
			{ ...attendance, generatedToday: true },
			undefined,
		),
	).toBe(false);
	expect(
		dailyGenerationAdRequired(
			policy,
			{ ...attendance, checkedIn: true },
			undefined,
		),
	).toBe(false);
	expect(
		dailyGenerationAdRequired(
			generationExperimentPolicy(base, principal("control")),
			attendance,
			undefined,
		),
	).toBe(false);
});

test("fresh control enrollment subtracts already completed daily generations only once", async () => {
	const id = principal("control");
	const counter = createGenerationAdCounter(
		storage(),
		"cadence",
		() => 0,
		() => id,
	);
	const policy = generationExperimentPolicy(base, id, undefined, 3, 2);
	await counter.load(policy);
	expect(counter.getSnapshot().remaining).toBe(3);
	await counter.load(generationExperimentPolicy(base, id, undefined, 3, 4));
	expect(counter.getSnapshot().remaining).toBe(3);
	counter.continued();
	expect(counter.getSnapshot().remaining).toBe(5);
	expect(adPolicyLabel(policy)).toBe(
		"generation-cadence-v3/control:device:5-8:5-8",
	);
});

test("relaxed mode keeps local progress but draws softer future cycles without daily gating", async () => {
	const id = principal("short");
	const counter = createGenerationAdCounter(
		storage(),
		"cadence",
		() => 0,
		() => id,
	);
	await counter.load(generationExperimentPolicy(base, id));
	counter.generated(1);
	const settings = {
		mode: "relaxed" as const,
		collectServerMetrics: true,
		returningDailyAd: true,
	};
	const policy = generationExperimentPolicy(base, id, settings);
	await counter.load(policy);
	expect(counter.getSnapshot().remaining).toBe(0);
	expect(
		dailyGenerationAdRequired(
			policy,
			{ day: 100, streak: 7, generatedToday: false, checkedIn: false },
			undefined,
			settings,
		),
	).toBe(false);
	counter.continued();
	expect(counter.getSnapshot().remaining).toBe(5);
	const fresh = createGenerationAdCounter(
		storage(),
		"new",
		() => 0.999999,
		() => id,
	);
	await fresh.load(policy);
	expect(fresh.getSnapshot().remaining).toBe(5);
	fresh.continued();
	expect(fresh.getSnapshot().remaining).toBe(30);
});
