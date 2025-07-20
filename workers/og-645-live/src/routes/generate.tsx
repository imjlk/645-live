import {
	type CustomLayoutOptions,
	OGImage,
	validateOGImageOptions,
} from "@645/og-image-core";
import { ImageResponse } from "@cf-wasm/og";
import type { Context } from "hono";

export const handleGenerate = async (c: Context) => {
	try {
		const body = await c.req.json();

		if (!validateOGImageOptions(body)) {
			return c.json(
				{ error: "Invalid OG image options. Title is required." },
				400,
			);
		}

		const options = body as CustomLayoutOptions;
		const format = (options.format as "png" | "svg") || "png";

		// Determine content type based on format
		const contentType = format === "svg" ? "image/svg+xml" : "image/png";

		const response = new ImageResponse(<OGImage {...options} />, {
			width: options.width || 1200,
			height: options.height || 630,
			format,
			headers: {
				"Content-Type": contentType,
				"Cache-Control": "public, max-age=86400",
			},
		});

		return response;
	} catch (error) {
		console.error("Error generating OG image:", error);
		return c.json({ error: "Failed to generate OG image" }, 500);
	}
};
