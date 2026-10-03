import { expect, test } from "bun:test";
import type { Generation, SavedCombination } from "@645/lotto-core";
import { savedComparison } from "./saved-comparison";

const generation: Generation = {
	id: 10,
	round: 1244,
	numbers: [1, 2, 3, 4, 5, 6],
	createdAt: 1,
	displayName: "",
};
const item = (
	id: number,
	numbers: SavedCombination["numbers"],
	round = 1244,
): SavedCombination => ({
	version: 1,
	id: String(id),
	generationId: id,
	round,
	numbers,
	savedAt: id,
});
test("comparison ignores the same record and other rounds, but detects another identical combination", () => {
	const saved = [
		item(10, [1, 2, 3, 4, 5, 6]),
		item(11, [1, 2, 3, 4, 5, 6]),
		item(12, [6, 5, 4, 3, 2, 1]),
		item(13, [1, 2, 7, 8, 9, 10]),
		item(14, [1, 2, 3, 4, 5, 6], 1243),
	];
	const snapshot = JSON.stringify(saved);
	const result = savedComparison(generation, saved);
	expect(result.total).toBe(3);
	expect(result.identical).toBe(2);
	expect(result.unique).toBe(2);
	expect(result.maxOverlap).toBe(6);
	expect(result.closest.map((r) => r.item.generationId)).toEqual([12, 11, 13]);
	expect(result.frequent[0]).toEqual({ number: 1, count: 3 });
	expect(JSON.stringify(saved)).toBe(snapshot);
});
test("empty and disjoint comparisons stay useful without manufacturing overlap", () => {
	expect(savedComparison(generation, []).total).toBe(0);
	const result = savedComparison(generation, [
		item(1, [10, 11, 12, 13, 14, 15]),
	]);
	expect(result.maxOverlap).toBe(0);
	expect(result.identical).toBe(0);
	expect(result.frequent).toHaveLength(5);
});
