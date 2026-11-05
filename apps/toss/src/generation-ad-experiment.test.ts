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
for (const arm of ["control", "short"] as const) {
	for (const random of [0, 0.25, 0.5, 0.999999]) {
		test(`${arm} first 1..3 and recurring bounds persist across reopen and replay`, async () => {
			const db = storage();
			const id = principal(arm);
			const policy = generationExperimentPolicy(base, id);
			if (!policy) throw new Error("Missing fixture policy");
			const counter = createGenerationAdCounter(
				db,
				"cadence",
				() => random,
				() => id,
			);
			await counter.load(policy);
			const first = 1 + Math.floor(random * 3);
			const recurring = 2 + Math.floor(random * (arm === "control" ? 7 : 4));
			expect(counter.getSnapshot().remaining).toBe(first);
			for (let n = 1; n <= first; n++) {
				counter.generated(n);
				counter.generated(n);
			}
			expect(counter.getSnapshot().remaining).toBe(0);
			counter.continued(100);
			expect(counter.getSnapshot().remaining).toBe(recurring);
			counter.generated(100);
			await Bun.sleep(1);
			const reopened = createGenerationAdCounter(
				db,
				"cadence",
				() => 0.8,
				() => id,
			);
			await reopened.load(policy);
			expect(reopened.getSnapshot()).toMatchObject({
				remaining: recurring - 1,
				continuedDay: 100,
				lastGenerationId: 100,
			});
			expect(adPolicyLabel(policy)).toBe(
				`generation-cadence-v4/${arm}:device:1-3:2-${arm === "control" ? 8 : 5}`,
			);
		});
	}
	test(`${arm} daily continuation uses the same repeat-attendance conditions`, () => {
		const policy = generationExperimentPolicy(base, principal(arm));
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
			dailyGenerationAdRequired(
				policy,
				{ ...attendance, streak: 0 },
				undefined,
			),
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
		expect(dailyGenerationAdRequired(policy, null, undefined)).toBe(false);
		expect(
			dailyGenerationAdRequired(policy, attendance, undefined, {
				mode: "experiment",
				collectServerMetrics: true,
				returningDailyAd: false,
			}),
		).toBe(false);
	});
}
test("v4 starts a separate phase, retains stable arm assignment and isolates principals", async () => {
	const db = storage();
	let id = principal("short");
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
	expect(counter.getSnapshot().remaining).toBe(1);
	counter.generated(10);
	counter.continued(101);
	await Bun.sleep(1);
	id = principal("control");
	await counter.load(generationExperimentPolicy(base, id));
	expect(counter.getSnapshot().remaining).toBe(1);
	expect(counter.getSnapshot().continuedDay).toBeUndefined();
	id = principal("short");
	await counter.load(generationExperimentPolicy(base, id));
	expect(counter.getSnapshot()).toMatchObject({
		remaining: 2,
		continuedDay: 101,
		lastGenerationId: 10,
	});
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

for (const arm of ["control", "short"] as const) {
	test(`${arm} preserves an unresolved old prompt so ticket recovery is not charged twice`, async () => {
		const db = storage();
		const id = principal(arm);
		const old =
			arm === "control" ? "generation-cadence-v3" : "generation-cadence-v2";
		await db.setItem(
			`cadence.${old}.${arm}.${id}`,
			JSON.stringify({
				remaining: 0,
				lastGenerationId: 5,
				prompt: "g-pending",
				continuedDay: 100,
			}),
		);
		const counter = createGenerationAdCounter(
			db,
			"cadence",
			() => 0.999999,
			() => id,
		);
		const policy = generationExperimentPolicy(base, id);
		await counter.load(policy);
		expect(counter.getSnapshot()).toMatchObject({
			remaining: 0,
			prompt: "g-pending",
			continuedDay: 100,
		});
		counter.continued(101);
		await Bun.sleep(1);
		const reopened = createGenerationAdCounter(
			db,
			"cadence",
			() => 0,
			() => id,
		);
		await reopened.load(policy);
		expect(reopened.getSnapshot().prompt).toBeUndefined();
		expect(reopened.getSnapshot().remaining).toBe(arm === "control" ? 8 : 5);
		expect(reopened.getSnapshot().continuedDay).toBe(101);
	});
}
