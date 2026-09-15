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
	for (const [random, count] of [
		[0, 10],
		[0.999999, 50],
	]) {
		test(`requires the next ad after ${count} confirmed generations`, async () => {
			const { storage } = fixture();
			const counter = createGenerationAdCounter(
				storage,
				"cadence",
				() => random,
			);
			await counter.load();
			for (let id = 1; id <= count; id++) {
				counter.generated(id);
				expect(counter.getSnapshot().remaining).toBe(count - id);
				counter.generated(id); // replayed API response
				expect(counter.getSnapshot().remaining).toBe(count - id);
			}
			counter.continued();
			expect(counter.getSnapshot().remaining).toBe(count);
		});
	}
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
			expect(counter.getSnapshot().remaining).toBe(10);
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
		expect(counter.getSnapshot().remaining).toBe(9);
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
		expect(counter.getSnapshot().remaining).toBe(8);
		expect(writes).toHaveLength(0);
		unblock();
		await Bun.sleep(1);
		expect(writes.map((value) => JSON.parse(value).remaining)).toEqual([
			10, 9, 8,
		]);
	});
});
