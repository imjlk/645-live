import { expect, test } from "bun:test";
import { calculateExpectedLatestRound } from "./lotto-common";

test("sales round switches at Sunday midnight KST in both browser and build environments", () => {
	for (const value of [
		"2026-09-08T00:00:00Z",
		"2026-09-12T06:00:00Z",
		"2026-09-12T14:59:59Z",
	])
		expect(calculateExpectedLatestRound(new Date(value))).toBe(1241);
	expect(calculateExpectedLatestRound(new Date("2026-09-12T15:00:00Z"))).toBe(
		1242,
	);
});
