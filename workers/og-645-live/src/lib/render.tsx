import { OGImage, type OGImageOptions } from "@645/og-image-core";
import { ImageResponse } from "@cf-wasm/og/workerd";
import boldFont from "../assets/Pretendard-Bold.woff";
import regularFont from "../assets/Pretendard-Regular.woff";

export const OG_DESIGN_VERSION = "2026-09-12-balls-v1";

export async function renderOgImage(options: OGImageOptions, source: string) {
	return await ImageResponse.async(<OGImage {...options} />, {
		width: options.width ?? 1200,
		height: options.height ?? 630,
		format: options.format ?? "png",
		defaultFont: { data: regularFont },
		fonts: [
			{ name: "Pretendard", data: regularFont, weight: 400, style: "normal" },
			{ name: "Pretendard", data: boldFont, weight: 700, style: "normal" },
		],
		// Korean and Latin are bundled. Unsupported glyphs must not trigger network I/O.
		loadAdditionalAsset: () => [],
		headers: {
			"Content-Type": options.format === "svg" ? "image/svg+xml" : "image/png",
			"Cache-Control":
				options.format === "svg"
					? "no-store"
					: "public, max-age=10800, stale-while-revalidate=604800",
			"X-OG-Source": source,
			"X-OG-Design-Version": OG_DESIGN_VERSION,
			"X-Content-Type-Options": "nosniff",
		},
	});
}
