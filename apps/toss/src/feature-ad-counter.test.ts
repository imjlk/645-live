import { describe, expect, test } from "bun:test";
import { createFeatureAdCounter } from "./feature-ad-counter";

function storage(raw: string | null = null) {
	let value = raw;
	return {
		getItem: async () => value,
		setItem: async (_key: string, next: string) => {
			value = next;
		},
	};
}
describe("optional detail ad cadence", () => {
	for (const [random, interval] of [
		[0, 3],
		[0.5, 9],
		[0.999999, 15],
	]) {
		test(`first and subsequent prompts use 3..15 detail actions (${interval})`, async () => {
			const counter = createFeatureAdCounter(
				storage(),
				"details",
				() => random,
			);
			counter.used();
			expect(counter.getSnapshot().ready).toBe(false);
			await counter.load();
			expect(counter.getSnapshot().remaining).toBe(interval);
			for (let i = 0; i < interval; i++) counter.used();
			expect(counter.getSnapshot().remaining).toBe(0);
			counter.used();
			expect(counter.getSnapshot().remaining).toBe(0);
			counter.continued();
			expect(counter.getSnapshot().remaining).toBe(interval);
		});
	}
	test("reload keeps progress rather than resetting a 24-hour pass", async () => {
		const store = storage("4"),
			counter = createFeatureAdCounter(store, "details", () => 0);
		await counter.load();
		counter.used();
		counter.used();
		await Bun.sleep(1);
		const next = createFeatureAdCounter(store, "details", () => 0.9);
		await next.load();
		expect(next.getSnapshot().remaining).toBe(2);
	});
	test("corrupt and failing optional storage still allows initial basic access", async () => {
		for (const raw of ["{", "-1", "16", '"0"']) {
			const counter = createFeatureAdCounter(storage(raw), "details", () => 0);
			await counter.load();
			expect(counter.getSnapshot().remaining).toBe(3);
		}
		const counter = createFeatureAdCounter(
			{
				getItem() {
					throw Error("offline");
				},
				setItem() {
					throw Error("offline");
				},
			},
			"details",
			() => 0,
		);
		await counter.load();
		counter.used();
		expect(counter.getSnapshot().remaining).toBe(2);
	});
});
