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
	parseOgDimensions,
} from "./request.js";

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
