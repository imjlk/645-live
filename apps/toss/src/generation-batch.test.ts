import { expect, test } from "bun:test";
import { EMPTY_OPTIONS } from "@645/lotto-core";
import { createGenerationBatch } from "./generation-batch";

test("one explicit ad choice generates five sequential server combinations, paced between responses", async () => {
	const order: string[] = [];
	const batch = createGenerationBatch(async () => {
		order.push("wait");
	});
	const action = {
		options: EMPTY_OPTIONS,
		authorize: async () => {
			order.push("ad");
		},
		generate: async () => {
			order.push("generate");
		},
		canContinue: () => true,
	};
	expect(await batch.run(action)).toBe(true);
	expect(order).toEqual([
		"ad",
		"generate",
		"wait",
		"generate",
		"wait",
		"generate",
		"wait",
		"generate",
		"wait",
		"generate",
	]);
	expect(batch.getSnapshot()).toEqual({
		phase: "idle",
		completed: 5,
		remaining: 0,
	});
});

test("a partial failure resumes only the remaining requests with the original conditions and no second ad", async () => {
	let attempts = 0;
	let ads = 0;
	const options = { ...EMPTY_OPTIONS, fixed: [7], excluded: [8] };
	const generated: number[] = [];
	const batch = createGenerationBatch(async () => {});
	const action = {
		options,
		authorize: async () => {
			ads++;
		},
		generate: async (value: typeof options) => {
			if (++attempts === 3) throw new Error("offline");
			generated.push(value.fixed[0]);
		},
		canContinue: () => true,
	};
	await expect(batch.run(action)).rejects.toThrow("offline");
	expect(batch.getSnapshot()).toEqual({
		phase: "paused",
		completed: 2,
		remaining: 3,
	});
	options.fixed[0] = 12;
	expect(await batch.run(action)).toBe(true);
	expect(ads).toBe(1);
	expect(generated).toEqual([7, 7, 7, 7, 7]);
});

test("cancelled ads grant no batch credit; overlapping taps cannot show a second ad", async () => {
	let ads = 0;
	let release!: () => void;
	const gate = new Promise<void>((resolve) => {
		release = resolve;
	});
	const batch = createGenerationBatch(async () => {});
	const action = {
		options: EMPTY_OPTIONS,
		authorize: async () => {
			ads++;
			await gate;
			throw new Error("unfinished");
		},
		generate: async () => {
			throw new Error("must not generate");
		},
		canContinue: () => true,
	};
	const attempt = batch.run(action);
	expect(await batch.run(action)).toBe(false);
	release();
	await expect(attempt).rejects.toThrow("unfinished");
	expect(ads).toBe(1);
	expect(batch.getSnapshot()).toEqual({
		phase: "idle",
		completed: 0,
		remaining: 0,
	});
});

test("backgrounding pauses without losing ad credit or sending another request", async () => {
	let foreground = true;
	let requests = 0;
	let ads = 0;
	const batch = createGenerationBatch(async () => {
		foreground = false;
	});
	const action = {
		options: EMPTY_OPTIONS,
		authorize: async () => {
			ads++;
		},
		generate: async () => {
			requests++;
		},
		canContinue: () => foreground,
	};
	await expect(batch.run(action)).rejects.toThrow("앱으로 돌아오면");
	expect(requests).toBe(1);
	expect(batch.getSnapshot().remaining).toBe(4);
	expect(ads).toBe(1);
});

test("unmount cancels the pending delay and never sends a late request or update", async () => {
	const batch = createGenerationBatch();
	let requests = 0;
	let updates = 0;
	batch.subscribe(() => updates++);
	const attempt = batch.run({
		options: EMPTY_OPTIONS,
		authorize: async () => {},
		generate: async () => {
			requests++;
		},
		canContinue: () => true,
	});
	await Promise.resolve();
	await Promise.resolve();
	const before = updates;
	batch.dispose();
	await expect(attempt).rejects.toThrow("중단");
	expect(requests).toBe(1);
	expect(updates).toBe(before);
});

test("explicit data deletion clears unfinished conditions and batch credit", async () => {
	const batch = createGenerationBatch(async () => {});
	await expect(
		batch.run({
			options: EMPTY_OPTIONS,
			authorize: async () => {},
			generate: async () => {
				throw new Error("offline");
			},
			canContinue: () => true,
		}),
	).rejects.toThrow("offline");
	expect(batch.getSnapshot().remaining).toBe(5);
	expect(batch.reset()).toBe(true);
	expect(batch.getSnapshot()).toEqual({
		phase: "idle",
		completed: 0,
		remaining: 0,
	});
});
