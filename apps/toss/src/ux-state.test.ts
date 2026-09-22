import { expect, test } from "bun:test";
import {
	type Draw,
	EMPTY_OPTIONS,
	type Generation,
	type SavedCombination,
} from "@645/lotto-core";
import {
	actionArea,
	normalizePreferences,
	rememberGeneration,
	savedRounds,
	savedSummary,
} from "./ux-state";

const draw: Draw = {
	round: 100,
	numbers: [1, 2, 3, 4, 5, 6],
	bonus: 7,
	drawDate: "2026-01-01",
};
const saved = (
	id: number,
	round: number,
	numbers: SavedCombination["numbers"],
): SavedCombination => ({
	version: 1,
	id: String(id),
	generationId: id,
	round,
	numbers,
	savedAt: id,
});
test("round filters retain unresolved results and summary separates bonus second from third prize", () => {
	const items = [
		saved(1, 101, [1, 2, 3, 4, 5, 6]),
		saved(2, 100, [1, 2, 3, 4, 5, 7]),
		saved(3, 100, [1, 2, 3, 4, 5, 8]),
		saved(4, 100, [1, 2, 3, 8, 9, 10]),
	];
	expect(savedRounds(items, { 100: draw }, "all")).toEqual([101, 100]);
	expect(savedRounds(items, { 100: draw }, "ready")).toEqual([100]);
	expect(savedRounds(items, { 100: draw }, "waiting")).toEqual([101]);
	expect(savedSummary(items, draw)).toEqual({
		total: 3,
		rankCounts: [0, 0, 1, 1, 0, 1],
	});
});
test("recent generations are bounded, deduplicated by ID, and preserve identical distinct generations", () => {
	const generation = (id: number): Generation => ({
		id,
		round: 100,
		numbers: [1, 2, 3, 4, 5, 6],
		displayName: "me",
		createdAt: id,
	});
	let recent: Generation[] = [];
	for (let id = 1; id <= 15; id++)
		recent = rememberGeneration(recent, generation(id));
	expect(recent.map((g) => g.id)).toEqual([15, 14, 13, 12, 11, 10, 9, 8, 7, 6]);
	expect(rememberGeneration(recent, generation(15))).toHaveLength(10);
});
test("corrupt or impossible persisted generation preferences fall back safely", () => {
	for (const value of [
		null,
		{},
		{ options: { fixed: [], excluded: [] } },
		{ options: { fixed: [1], excluded: [1], oddCount: null } },
		{ options: { fixed: [1, 3, 5], excluded: [], oddCount: 0 } },
	])
		expect(normalizePreferences(value)).toBeNull();
	expect(
		normalizePreferences({ options: EMPTY_OPTIONS, liveColumns: 9 })
			?.liveColumns,
	).toBe(9);
	expect(
		normalizePreferences({ options: EMPTY_OPTIONS, liveColumns: 8 })
			?.liveColumns,
	).toBe(5);
});
test("payment and notification failures stay in their relevant UI areas", () => {
	expect(actionArea("promotion")).toBe("attendance");
	expect(actionArea("unlock-attendance_restore")).toBe("attendance");
	expect(actionArea("notifications")).toBe("saved");
	expect(actionArea("generate")).toBe("make");
});

test("preference writes preserve unread fields and retry without replacing stored data", async () => {
	const { createPreferencesStore } = await import("./ux-state");
	let raw = JSON.stringify({
		options: { fixed: [7], excluded: [], oddCount: null },
		liveColumns: 9,
	});
	let fail = true;
	const store = createPreferencesStore(
		{
			getItem: async () => {
				if (fail) throw new Error("offline");
				return raw;
			},
			setItem: async (_key, value) => {
				raw = value;
			},
		},
		"preferences",
	);
	await expect(
		store.write({ options: { fixed: [8], excluded: [], oddCount: null } }),
	).rejects.toThrow("offline");
	expect(JSON.parse(raw).options.fixed).toEqual([7]);
	fail = false;
	await store.write({ options: { fixed: [8], excluded: [], oddCount: null } });
	expect(JSON.parse(raw)).toEqual({
		options: { fixed: [8], excluded: [], oddCount: null },
		liveColumns: 9,
	});
});
