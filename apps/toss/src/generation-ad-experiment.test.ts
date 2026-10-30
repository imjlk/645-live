import { expect, test } from "bun:test";
import { adPolicyLabel } from "./ad-telemetry";
import { createGenerationAdCounter } from "./generation-ad-counter";
import {
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
for (const [random, expected] of [
	[0, 2],
	[0.25, 3],
	[0.5, 4],
	[0.999999, 5],
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
		counter.continued();
		expect(counter.getSnapshot().remaining).toBe(expected);
		// The generation performed by the ad CTA is the first in the new cycle.
		counter.generated(100);
		expect(counter.getSnapshot().remaining).toBe(expected - 1);
		await Bun.sleep(1);
		const reopened = createGenerationAdCounter(
			db,
			"cadence",
			() => 0.9,
			() => id,
		);
		await reopened.load(policy);
		expect(reopened.getSnapshot().remaining).toBe(expected - 1);
		expect(adPolicyLabel(policy)).toBe(
			"generation-cadence-v1/short:device:2-5:2-5",
		);
	});
}
test("control keeps 5 then 5..30; old progress and another user never contaminate enrollment", async () => {
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
	expect(counter.getSnapshot().remaining).toBe(5);
	counter.continued();
	expect(counter.getSnapshot().remaining).toBe(30);
	id = principal("short");
	await counter.load(generationExperimentPolicy(base, id));
	expect(counter.getSnapshot().remaining).toBe(5);
	await counter.load({ ...base, maxGenerations: 29 });
	expect(counter.getSnapshot().remaining).toBe(29);
});
