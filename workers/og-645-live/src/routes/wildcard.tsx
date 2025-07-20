import { type LayoutType, OGImage, pathToTitle } from "@645/og-image-core";
import { ImageResponse } from "@cf-wasm/og";
import type { Context } from "hono";

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
		const theme =
			(url.searchParams.get("theme") as "light" | "dark") || "light";
		const layout = (url.searchParams.get("layout") as LayoutType) || "default";
		const width = Number.parseInt(url.searchParams.get("width") || "1200");
		const height = Number.parseInt(url.searchParams.get("height") || "630");
		const format = (url.searchParams.get("format") as "png" | "svg") || "png";

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
