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
			"generation-cadence-v2/short:device:1-3:2-8",
		);
	});
}
test("control uses 3 then 3..12; old progress and another user never contaminate enrollment", async () => {
	const db = storage();
	await db.setItem(
		"cadence",
		JSON.stringify({ remaining: 29, lastGenerationId: 10 }),
	);
	let id = principal("control");
	const counter = createGenerationAdCounter(
		db,
		"cadence",
		() => 0.999999,
		() => id,
	);
	await counter.load(generationExperimentPolicy(base, id));
	expect(counter.getSnapshot().remaining).toBe(3);
	counter.continued();
	expect(counter.getSnapshot().remaining).toBe(12);
	id = principal("short");
	await counter.load(generationExperimentPolicy(base, id));
	expect(counter.getSnapshot().remaining).toBe(3);
	await counter.load({ ...base, maxGenerations: 29 });
	expect(counter.getSnapshot().remaining).toBe(29);
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

test("control lower boundary is three generations before first and subsequent ads", async () => {
	const id = principal("control");
	const policy = generationExperimentPolicy(base, id);
	const counter = createGenerationAdCounter(
		storage(),
		"cadence",
		() => 0,
		() => id,
	);
	await counter.load(policy);
	expect(counter.getSnapshot().remaining).toBe(3);
	counter.generated(1);
	counter.generated(2);
	counter.generated(3);
	expect(counter.getSnapshot().remaining).toBe(0);
	counter.continued();
	expect(counter.getSnapshot().remaining).toBe(3);
	expect(adPolicyLabel(policy)).toBe(
		"generation-cadence-v2/control:device:3-3:3-12",
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
