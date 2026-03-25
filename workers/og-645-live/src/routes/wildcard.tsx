import { OGImage, pathToTitle } from "@645/og-image-core";
import { ImageResponse } from "@cf-wasm/og";
import type { Context } from "hono";
import {
	normalizeOgFormat,
	normalizeOgLayout,
	normalizeOgTheme,
	parseOgDimensions,
} from "../lib/request.js";

export const handleWildcard = async (c: Context) => {
	try {
		const url = new URL(c.req.url);
		const path = url.pathname;

		const rawTitle = url.searchParams.get("title");
		const rawDescription = url.searchParams.get("description");

		const title = rawTitle ? decodeURIComponent(rawTitle) : pathToTitle(path);
		const description = rawDescription
			? decodeURIComponent(rawDescription)
			: undefined;
		const theme = normalizeOgTheme(url.searchParams.get("theme"));
		const layout = normalizeOgLayout(url.searchParams.get("layout"));
		const { width, height } = parseOgDimensions(url.searchParams);
		const format = normalizeOgFormat(url.searchParams.get("format"));

		// Determine content type based on format
		const contentType = format === "svg" ? "image/svg+xml" : "image/png";

		const response = new ImageResponse(
			<OGImage
				title={title}
				description={description}
				theme={theme}
				layout={layout}
				width={width}
				height={height}
			/>,
			{
				width,
				height,
				format,
				headers: {
					"Content-Type": contentType,
					"Cache-Control": "public, max-age=86400",
				},
			},
		);

		return response;
	} catch (error) {
		console.error("Error generating OG image:", error);
		return c.json({ error: "Failed to generate OG image" }, 500);
	}
};
