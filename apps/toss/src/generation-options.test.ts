import { expect, test } from "bun:test";
import { EMPTY_OPTIONS } from "@645/lotto-core";
import { generationOptionsError } from "./generation-options";

test("custom choices report parity conflicts before generating", () => {
	expect(generationOptionsError(EMPTY_OPTIONS)).toBeNull();
	expect(
		generationOptionsError({ fixed: [7, 13], excluded: [], oddCount: 1 }),
	).toContain("2~6개");
	expect(
		generationOptionsError({ fixed: [7, 13], excluded: [], oddCount: 3 }),
	).toBeNull();
	expect(
		generationOptionsError({
			fixed: [2, 4, 6, 8, 10, 12],
			excluded: [],
			oddCount: 1,
		}),
	).toContain("0개여야");
});

test("excluded numbers can narrow the possible parity to one choice", () => {
	const excluded = Array.from({ length: 39 }, (_, i) => i + 7);
	expect(
		generationOptionsError({ fixed: [], excluded, oddCount: 3 }),
	).toBeNull();
	expect(
		generationOptionsError({ fixed: [], excluded, oddCount: 2 }),
	).toContain("3개여야");
	expect(
		generationOptionsError({ fixed: [1], excluded: [1], oddCount: null }),
	).not.toBeNull();
});
