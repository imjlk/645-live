import { validateOGImageOptions } from "@645/og-image-core";
import type { Context } from "hono";
import { renderOgImage } from "../lib/render.js";
import { normalizeOgFormat, parseOgDimensions } from "../lib/request.js";

export const handleGenerate = async (c: Context) => {
	try {
		const body: unknown = await c.req.json().catch(() => null);

		if (!validateOGImageOptions(body)) {
			return c.json(
				{ error: "Invalid OG image options. Title is required." },
				400,
			);
		}

		const dimensions = parseOgDimensions(
			new URLSearchParams({
				width: String(body.width ?? 1200),
				height: String(body.height ?? 630),
			}),
		);
		const response = await renderOgImage(
			{
				...body,
				...dimensions,
				format: normalizeOgFormat(body.format ?? null),
			},
			"custom-generated",
		);
		response.headers.set("Cache-Control", "no-store");
		return response;
	} catch (error) {
		console.error("Error generating OG image:", error);
		return c.json({ error: "Failed to generate OG image" }, 500);
	}
};
