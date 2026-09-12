import { OGImage, type OGImageOptions } from "@645/og-image-core";
import { Resvg } from "@cf-wasm/resvg/workerd";
import { type Font, satori } from "@cf-wasm/satori/workerd";
import { OG_DESIGN_VERSION } from "../../../../config/og.mjs";
import boldFont from "../assets/Pretendard-Bold.woff";
import regularFont from "../assets/Pretendard-Regular.woff";

export { OG_DESIGN_VERSION };

// Reuse font objects so Satori can reuse parsed fonts across requests.
const fonts: Font[] = [
	{ name: "Pretendard", data: regularFont, weight: 400, style: "normal" },
	{ name: "Pretendard", data: boldFont, weight: 700, style: "normal" },
];

async function renderPng(svg: string): Promise<Uint8Array<ArrayBuffer>> {
	const renderer = await Resvg.async(svg, { font: { loadSystemFonts: false } });
	try {
		const rendered = renderer.render();
		try {
			// Own the response bytes before releasing the WASM allocations.
			return new Uint8Array(rendered.asPng());
		} finally {
			rendered.free();
		}
	} finally {
		renderer.free();
	}
}

export async function renderOgImage(options: OGImageOptions, source: string) {
	const svg = await satori(<OGImage {...options} />, {
		width: options.width ?? 1200,
		height: options.height ?? 630,
		fonts,
		embedFont: true,
		// Korean and Latin are bundled. Unsupported glyphs must not trigger network I/O.
		loadAdditionalAsset: async () => [],
	});
	const isSvg = options.format === "svg";
	const body = isSvg ? svg : await renderPng(svg);
	return new Response(body, {
		headers: {
			"Content-Type": isSvg ? "image/svg+xml" : "image/png",
			"Cache-Control": isSvg
				? "no-store"
				: "public, max-age=10800, stale-while-revalidate=604800",
			"X-OG-Source": source,
			"X-OG-Design-Version": OG_DESIGN_VERSION,
			"X-Content-Type-Options": "nosniff",
		},
	});
}
