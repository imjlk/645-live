import { describe, expect, it } from "bun:test";
import {
	DEFAULT_OG_HEIGHT,
	DEFAULT_OG_WIDTH,
	MAX_OG_HEIGHT,
	MAX_OG_WIDTH,
	MIN_OG_HEIGHT,
	MIN_OG_WIDTH,
	normalizeOgFormat,
	normalizeOgLayout,
	parseDrawNumbers,
	parseOgDimensions,
	readOgText,
} from "./request.js";

describe("OG query text", () => {
	it("preserves percent signs and already-decoded query text", () => {
		const params = new URLSearchParams({
			title: "100% 확인 · %41 그대로",
			rev: "2026-09-12-balls-v1",
		});
		expect(readOgText(params, "title")).toBe("100% 확인 · %41 그대로");
	});
	it("supports previously double-encoded links", () => {
		const params = new URLSearchParams({
			title: encodeURIComponent("로또 6/45"),
			rev: "2026-03-25-1",
		});
		expect(readOgText(params, "title")).toBe("로또 6/45");
	});
	it("rejects incomplete or duplicate winning combinations", () => {
		for (const input of [
			"1,2,3",
			"1,1,2,3,4,5",
			"1x,2,3,4,5,6",
			"0,2,3,4,5,6",
			"1,2,3,4,5,46",
		])
			expect(parseDrawNumbers(input)).toBeUndefined();
		expect(parseDrawNumbers("11,13,19,20,31,44")).toEqual([
			11, 13, 19, 20, 31, 44,
		]);
	});
});

describe("parseOgDimensions", () => {
	it("clamps width and height into the supported range", () => {
		const params = new URLSearchParams({
			width: String(MAX_OG_WIDTH + 1000),
			height: String(MIN_OG_HEIGHT - 100),
		});

		expect(parseOgDimensions(params)).toEqual({
			width: MAX_OG_WIDTH,
			height: MIN_OG_HEIGHT,
		});
	});

	it("falls back to defaults for invalid values", () => {
		const params = new URLSearchParams({
			width: "abc",
			height: "NaN",
		});

		expect(parseOgDimensions(params)).toEqual({
			width: DEFAULT_OG_WIDTH,
			height: DEFAULT_OG_HEIGHT,
		});
	});

	it("accepts valid dimensions unchanged", () => {
		const params = new URLSearchParams({
			width: String(MIN_OG_WIDTH),
			height: String(MAX_OG_HEIGHT),
		});

		expect(parseOgDimensions(params)).toEqual({
			width: MIN_OG_WIDTH,
			height: MAX_OG_HEIGHT,
		});
	});
});

describe("normalizeOgLayout", () => {
	it("keeps supported layouts", () => {
		expect(normalizeOgLayout("hero")).toBe("hero");
		expect(normalizeOgLayout("news")).toBe("news");
	});

	it("falls back for unknown layouts", () => {
		expect(normalizeOgLayout("wild")).toBe("default");
	});
});

describe("normalizeOgFormat", () => {
	it("defaults to png", () => {
		expect(normalizeOgFormat(null)).toBe("png");
		expect(normalizeOgFormat("jpeg")).toBe("png");
	});

	it("accepts svg explicitly", () => {
		expect(normalizeOgFormat("svg")).toBe("svg");
	});
});
