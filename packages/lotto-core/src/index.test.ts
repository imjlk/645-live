import { describe, expect, test } from "bun:test";
import {
	compareDraw,
	type Draw,
	describeCombination,
	normalizeSaved,
	parseNumbers,
	resultFingerprint,
} from "./index";

const draw: Draw = {
	round: 1242,
	numbers: [1, 2, 3, 4, 5, 6],
	bonus: 7,
	drawDate: "2026-09-19",
};
describe("saved draw comparisons", () => {
	test("all ranks, including the bonus distinction", () => {
		expect(compareDraw([1, 2, 3, 4, 5, 6], draw).rank).toBe(1);
		expect(compareDraw([1, 2, 3, 4, 5, 7], draw).rank).toBe(2);
		expect(compareDraw([1, 2, 3, 4, 5, 8], draw).rank).toBe(3);
		expect(compareDraw([1, 2, 3, 4, 7, 8], draw).rank).toBe(4);
		expect(compareDraw([1, 2, 3, 7, 8, 9], draw).rank).toBe(5);
		expect(compareDraw([1, 2, 7, 8, 9, 10], draw).rank).toBeNull();
	});
	test("corrections change result fingerprint, order does not", () => {
		expect(resultFingerprint({ ...draw, numbers: [6, 5, 4, 3, 2, 1] })).toBe(
			resultFingerprint(draw),
		);
		expect(resultFingerprint({ ...draw, bonus: 8 })).not.toBe(
			resultFingerprint(draw),
		);
	});
	test("rejects invalid combinations instead of guessing", () => {
		expect(parseNumbers([1, 1, 2, 3, 4, 5])).toBeNull();
		expect(parseNumbers([0, 1, 2, 3, 4, 5])).toBeNull();
		expect(parseNumbers([1, 2, 3, 4, 5, 46])).toBeNull();
		expect(parseNumbers([1, 2, 3, 4, 5, 6.5])).toBeNull();
		expect(parseNumbers([45, 33, 5, 6, 8, 12])).toEqual([5, 6, 8, 12, 33, 45]);
		expect(() => normalizeSaved([{ version: 2 }])).toThrow();
	});
	test("report reflects actual overlap and color intervals", () => {
		expect(
			describeCombination([1, 10, 11, 21, 31, 45], [[1, 2, 11, 12, 31, 32]]),
		).toEqual({
			sum: 119,
			odd: 5,
			sections: [2, 1, 1, 1, 1],
			consecutive: 1,
			maxOverlap: 3,
		});
	});
});
