import { expect, test } from "bun:test";
import { validateScanGames } from "../../services/trailbase/wasm-guest/src/scan-data";

test("QR aggregate inputs require complete games and do not mutate the caller", () => {
	const input = [{ round: 1242, numbers: [45, 20, 10, 3, 2, 1] }];
	const validated = validateScanGames(input);
	expect(validated[0].numbers).toEqual([1, 2, 3, 10, 20, 45]);
	expect(input[0].numbers).toEqual([45, 20, 10, 3, 2, 1]);
	for (const numbers of [
		[1, 2, 3],
		[1, 1, 2, 3, 4, 5],
		[0, 1, 2, 3, 4, 5],
		[1, 2, 3, 4, 5, 46],
		[1, 2, 3, 4, 5, 6.5],
		[1, 2, 3, 4, 5, "6"],
	])
		expect(() => validateScanGames([{ numbers }])).toThrow();
	for (const round of [0, -1, 99999, 1242.5, "1242"])
		expect(() =>
			validateScanGames([{ round, numbers: [1, 2, 3, 4, 5, 6] }]),
		).toThrow();
});
