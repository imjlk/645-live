import type { LayoutType, OGImageOptions } from "@645/og-image-core";

export const DEFAULT_OG_WIDTH = 1200;
export const DEFAULT_OG_HEIGHT = 630;
export const MIN_OG_WIDTH = 800;
export const MAX_OG_WIDTH = 2400;
export const MIN_OG_HEIGHT = 418;
export const MAX_OG_HEIGHT = 1260;

export const DEFAULT_OG_THEME: OGImageOptions["theme"] = "light";
export const DEFAULT_OG_FORMAT: OGImageOptions["format"] = "png";
export const DEFAULT_OG_LAYOUT: LayoutType = "default";

const VALID_LAYOUTS = new Set<LayoutType>([
	"default",
	"centered",
	"minimal",
	"blog",
	"news",
	"product",
	"hero",
	"testimonial",
	"event",
]);

export function parseIntWithRange(
	value: string | null,
	fallback: number,
	min: number,
	max: number,
): number {
	const parsed = Number.parseInt(value ?? "", 10);
	if (!Number.isFinite(parsed)) {
		return fallback;
	}

	return Math.min(max, Math.max(min, parsed));
}

export function parseOgDimensions(params: URLSearchParams): {
	width: number;
	height: number;
} {
	return {
		width: parseIntWithRange(
			params.get("width"),
			DEFAULT_OG_WIDTH,
			MIN_OG_WIDTH,
			MAX_OG_WIDTH,
		),
		height: parseIntWithRange(
			params.get("height"),
			DEFAULT_OG_HEIGHT,
			MIN_OG_HEIGHT,
			MAX_OG_HEIGHT,
		),
	};
}

export function normalizeOgTheme(
	value: string | null,
): OGImageOptions["theme"] {
	return value === "dark" ? "dark" : DEFAULT_OG_THEME;
}

export function normalizeOgFormat(
	value: string | null,
): OGImageOptions["format"] {
	return value === "svg" ? "svg" : DEFAULT_OG_FORMAT;
}

export function normalizeOgLayout(
	value: string | null,
	fallback: LayoutType = DEFAULT_OG_LAYOUT,
): LayoutType {
	if (!value) {
		return fallback;
	}

	return VALID_LAYOUTS.has(value as LayoutType)
		? (value as LayoutType)
		: fallback;
}
