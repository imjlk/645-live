import { describe, expect, test } from "bun:test";
import type { SavedCombination } from "@645/lotto-core";
import { createSavedStore, SAVED_LIMIT } from "./saved-store";

function item(id: number): SavedCombination {
	return {
		version: 1,
		id: String(id),
		generationId: id,
		round: 1242,
		numbers: [1, 2, 3, 4, 5, 6],
		savedAt: 100,
	};
}
describe("durable local collection", () => {
	test("a full expanded collection survives overflow and can accept a replacement after removal", async () => {
		let raw = JSON.stringify(
			Array.from({ length: SAVED_LIMIT - 1 }, (_, index) => item(index + 1)),
		);
		const store = createSavedStore(
			{
				getItem: () => raw,
				setItem: (_, value) => {
					raw = value;
				},
			},
			"saved",
		);
		await store.add(item(SAVED_LIMIT));
		const full = raw;
		await expect(store.add(item(SAVED_LIMIT + 1))).rejects.toThrow("1,000");
		expect(raw).toBe(full);
		await store.remove("1");
		await store.add(item(SAVED_LIMIT + 1));
		const restored = await createSavedStore(
			{ getItem: () => raw, setItem: () => {} },
			"saved",
		).read();
		expect(restored).toHaveLength(SAVED_LIMIT);
		expect(restored[0].generationId).toBe(SAVED_LIMIT + 1);
		expect(restored.some((value) => value.id === "1")).toBe(false);
	});
	test("concurrent saves serialize without losing a combination", async () => {
		let raw: string | null = null;
		const storage = {
			getItem: async () => raw,
			setItem: async (_key: string, value: string) => {
				await new Promise((r) => setTimeout(r, 1));
				raw = value;
			},
		};
		const store = createSavedStore(storage, "saved");
		await Promise.all([
			store.add(item(1)),
			store.add(item(2)),
			store.add(item(1)),
		]);
		expect((await store.read()).map((i) => i.id)).toEqual(["2", "1"]);
		await store.celebrate(["1"], "result");
		expect(
			(await store.read()).find((i) => i.id === "1")?.celebratedResult,
		).toBe("result");
	});
	test("write failure is visible and does not poison later writes", async () => {
		let raw: string | null = null;
		let fail = true;
		const store = createSavedStore(
			{
				getItem: () => raw,
				setItem: (_key, value) => {
					if (fail) throw new Error("disk full");
					raw = value;
				},
			},
			"saved",
		);
		await expect(store.add(item(1))).rejects.toThrow("disk full");
		fail = false;
		await store.add(item(2));
		expect(await store.read()).toHaveLength(1);
	});
	test("corruption is preserved for recovery", async () => {
		let raw = '{"version":99}';
		const store = createSavedStore(
			{
				getItem: () => raw,
				setItem: (_, value) => {
					raw = value;
				},
			},
			"saved",
		);
		await expect(store.add(item(1))).rejects.toThrow();
		expect(raw).toBe('{"version":99}');
		await store.clear();
		expect(await store.read()).toEqual([]);
	});
	test("never expires a saved number at drawing time", async () => {
		let raw = JSON.stringify([item(1)]);
		const store = createSavedStore(
			{
				getItem: () => raw,
				setItem: (_, value) => {
					raw = value;
				},
			},
			"saved",
		);
		expect((await store.read())[0].round).toBe(1242);
		await store.remove("1");
		expect(await store.read()).toEqual([]);
	});
});
