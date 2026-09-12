import { describe, expect, it } from "bun:test";
import { fitText, normalizeText } from "./text.js";
import { getBallColors } from "./theme.js";

describe("OG text layout", () => {
	it("keeps short Korean text intact", () => {
		expect(fitText("로또 당첨 결과", 1088, [72], 2).lines).toEqual([
			"로또 당첨 결과",
		]);
	});
	it("bounds long unspaced Korean and Latin titles with an ellipsis", () => {
		for (const title of ["한글제목".repeat(200), "LONGTITLE".repeat(200)]) {
			const result = fitText(title, 1088, [64, 56, 48], 2);
			expect(result.lines).toHaveLength(2);
			expect(result.lines[1]).toEndWith("…");
			expect(result.lines.every((line) => line.length <= 50)).toBe(true);
		}
	});
	it("normalizes Hangul and handles empty descriptions", () => {
		expect(normalizeText("  한글\n제목  ")).toBe("한글 제목");
		expect(fitText("", 1088, [26], 2).lines).toEqual([]);
	});
	it("balances two-line headlines without leaving one short word alone", () => {
		const title = "제1240회 로또 지역 분포 분석, 경기 주목";
		const result = fitText(title, 1088, [64], 2);
		expect(result.lines.join(" ")).toBe(title);
		expect(result.lines).toHaveLength(2);
		expect((result.lines[1] ?? "").length).toBeGreaterThan(8);
	});
});

describe("lottery colors", () => {
	it("uses five distinct ranges with shared boundary colors in both themes", () => {
		for (const theme of ["light", "dark"] as const) {
			expect(
				new Set(
					[1, 11, 21, 31, 41].map((n) => getBallColors(n, theme).background),
				).size,
			).toBe(5);
			for (const [from, to] of [
				[1, 10],
				[11, 20],
				[21, 30],
				[31, 40],
				[41, 45],
			] as const)
				expect(getBallColors(from, theme)).toEqual(getBallColors(to, theme));
		}
		expect(getBallColors(11, "light")).not.toEqual(getBallColors(11, "dark"));
	});
});
