import { expect, test } from "bun:test";
import type { Draw, Generation } from "@645/lotto-core";
import { summarizeSavedResults } from "./saved-results";

const draw: Draw = {
	round: 10,
	numbers: [1, 2, 3, 4, 5, 6],
	bonus: 7,
	drawDate: "2026-01-03",
};
function game(id: number, numbers: Generation["numbers"], round = 10): Generation {
	return { id, numbers, round, displayName: "test", createdAt: 1 };
}
test("counts every rank, bonus distinctions and repeated combinations", () => {
	const games = [
		game(1, [1, 2, 3, 4, 5, 6]),
		game(2, [1, 2, 3, 4, 5, 7]),
		game(3, [1, 2, 3, 4, 5, 8]),
		game(4, [1, 2, 3, 4, 8, 9]),
		game(5, [1, 2, 3, 8, 9, 10]),
		game(6, [1, 2, 3, 8, 9, 10]),
		game(7, [1, 2, 8, 9, 10, 11]),
		game(8, [1, 2, 3, 4, 5, 6], 11),
	];
	expect(summarizeSavedResults(games, { 10: draw, 11: null })).toEqual({
		ranks: [1, 1, 1, 1, 2],
		checked: 7,
	});
});
test("unloaded rounds remain unchecked and corrected draws update ranks", () => {
	const games = [game(1, [1, 2, 3, 4, 5, 6])];
	expect(summarizeSavedResults(games, {})).toEqual({
		ranks: [0, 0, 0, 0, 0],
		checked: 0,
	});
	expect(
		summarizeSavedResults(games, {
			10: { ...draw, numbers: [11, 12, 13, 14, 15, 16] },
		}),
	).toEqual({ ranks: [0, 0, 0, 0, 0], checked: 1 });
});
