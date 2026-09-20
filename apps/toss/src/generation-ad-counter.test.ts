import { describe, expect, test } from "bun:test";
import { createGenerationAdCounter } from "./generation-ad-counter";

function fixture(raw: string | null = null) {
	let value = raw;
	const storage = {
		getItem: async () => value,
		setItem: async (_key: string, next: string) => {
			value = next;
		},
	};
	return { storage, value: () => value };
}

describe("device generation ad cadence", () => {
	for (const random of [0, 0.5, 0.999999]) {
		test(`first gate arrives after 5 generations regardless of the draw (random=${random})`, async () => {
			const { storage } = fixture();
			const counter = createGenerationAdCounter(
				storage,
				"cadence",
				() => random,
			);
			await counter.load();
			expect(counter.getSnapshot().remaining).toBe(5);
			for (let id = 1; id <= 5; id++) {
				counter.generated(id);
				expect(counter.getSnapshot().remaining).toBe(5 - id);
				counter.generated(id); // replayed API response
				expect(counter.getSnapshot().remaining).toBe(5 - id);
			}
		});
	}
	for (const [random, interval] of [
		[0, 5],
		[0.999999, 30],
	]) {
		test(`subsequent gates draw the interval from 5..30 (random=${random} -> ${interval})`, async () => {
			const { storage } = fixture(
				JSON.stringify({ remaining: 0, lastGenerationId: 4 }),
			);
			const counter = createGenerationAdCounter(
				storage,
				"cadence",
				() => random,
			);
			await counter.load();
			counter.continued();
			expect(counter.getSnapshot().remaining).toBe(interval);
			for (let id = 5; id <= interval; id++) {
				counter.generated(id);
				expect(counter.getSnapshot().remaining).toBe(interval - (id - 4));
			}
			counter.continued();
			expect(counter.getSnapshot().remaining).toBe(interval);
		});
	}
	test("honors a server policy refresh including a custom first gate", async () => {
		const { storage } = fixture();
		const counter = createGenerationAdCounter(storage, "cadence", () => 0);
		await counter.load({
			counter: "device",
			firstGenerations: 2,
			minGenerations: 6,
			maxGenerations: 8,
		});
		expect(counter.getSnapshot().remaining).toBe(2);
		counter.generated(1);
		counter.generated(2);
		expect(counter.getSnapshot().remaining).toBe(0);
		counter.continued();
		expect(counter.getSnapshot().remaining).toBe(6);
	});
	test("restores the same interval across app restarts and config refreshes", async () => {
		const { storage } = fixture(
			JSON.stringify({ remaining: 3, lastGenerationId: 12 }),
		);
		const counter = createGenerationAdCounter(storage, "cadence", () => 0);
		await counter.load();
		counter.generated(13);
		await counter.load();
		expect(counter.getSnapshot().remaining).toBe(2);
		await Bun.sleep(1);
		const reopened = createGenerationAdCounter(storage, "cadence", () => 0.9);
		await reopened.load();
		expect(reopened.getSnapshot().remaining).toBe(2);
		reopened.generated(13);
		expect(reopened.getSnapshot().remaining).toBe(2);
	});
	test("corrupt or unavailable optional storage does not block generation", async () => {
		for (const raw of [
			"{",
			'{"remaining":-1}',
			'{"remaining":999,"lastGenerationId":null}',
		]) {
			const { storage } = fixture(raw);
			const counter = createGenerationAdCounter(storage, "cadence", () => 0);
			await counter.load();
			expect(counter.getSnapshot().remaining).toBe(5);
		}
		const counter = createGenerationAdCounter(
			{
				getItem() {
					throw Error("unavailable");
				},
				setItem() {
					throw Error("unavailable");
				},
			},
			"cadence",
			() => 0,
		);
		await counter.load();
		counter.generated(1);
		expect(counter.getSnapshot().remaining).toBe(4);
	});
	test("updates immediately and preserves native write order", async () => {
		let unblock!: () => void;
		const writes: string[] = [];
		const storage = {
			getItem: async () => null,
			setItem: async (_key: string, value: string) => {
				if (!writes.length)
					await new Promise<void>((resolve) => {
						unblock = resolve;
					});
				writes.push(value);
			},
		};
		const counter = createGenerationAdCounter(storage, "cadence", () => 0);
		await counter.load();
		counter.generated(1);
		counter.generated(2);
		expect(counter.getSnapshot().remaining).toBe(3);
		expect(writes).toHaveLength(0);
		unblock();
		await Bun.sleep(1);
		expect(writes.map((value) => JSON.parse(value).remaining)).toEqual([
			5, 4, 3,
		]);
	});
});
