import { pathToTitle } from "@645/og-image-core";
import type { Context } from "hono";
import { renderOgImage } from "../lib/render.js";
import {
	normalizeOgFormat,
	normalizeOgLayout,
	normalizeOgTheme,
	parseOgDimensions,
	readOgText,
} from "../lib/request.js";

export const handleWildcard = async (c: Context) => {
	try {
		const url = new URL(c.req.url);
		const path = url.pathname;

		const title =
			readOgText(url.searchParams, "title", 160) || pathToTitle(path);
		const description = readOgText(url.searchParams, "description");
		const theme = normalizeOgTheme(url.searchParams.get("theme"));
		const layout = normalizeOgLayout(url.searchParams.get("layout"));
		const { width, height } = parseOgDimensions(url.searchParams);
		const format = normalizeOgFormat(url.searchParams.get("format"));

		return await renderOgImage(
			{ title, description, theme, layout, width, height, format },
			"page-generated",
		);
	} catch (error) {
		console.error("Error generating OG image:", error);
		return c.json({ error: "Failed to generate OG image" }, 500);
	}
};
