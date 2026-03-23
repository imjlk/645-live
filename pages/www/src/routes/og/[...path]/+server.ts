import { dev } from "$app/environment";
import type { RequestHandler } from "./$types";

function createGenericFallbackSvg(title: string, description?: string) {
	return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
	<defs>
		<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" stop-color="#0f172a" />
			<stop offset="100%" stop-color="#1d4ed8" />
		</linearGradient>
	</defs>
	<rect width="1200" height="630" fill="url(#bg)" />
	<text x="80" y="250" font-family="sans-serif" font-size="56" font-weight="700" fill="#ffffff">${title}</text>
	<text x="80" y="330" font-family="sans-serif" font-size="28" fill="#dbeafe">${description ?? "645.live Open Graph preview"}</text>
	<text x="80" y="570" font-family="sans-serif" font-size="24" fill="#93c5fd">645.live</text>
</svg>`;
}

function createDevFallbackResponse(title: string, description?: string) {
	return new Response(createGenericFallbackSvg(title, description), {
		headers: {
			"content-type": "image/svg+xml",
			"cache-control": "no-store",
		},
	});
}

function createUnavailableResponse() {
	return new Response("OG service unavailable", {
		status: 503,
		headers: {
			"cache-control": "no-store",
		},
	});
}

async function createImageResponse(
	upstream: Response,
	fallbackContentType = "image/png",
) {
	const headers = new Headers();

	for (const name of [
		"content-type",
		"cache-control",
		"etag",
		"last-modified",
		"x-og-cache-key",
		"x-og-source",
	]) {
		const value = upstream.headers.get(name);
		if (value) {
			headers.set(name, value);
		}
	}

	if (!headers.get("content-type")) {
		headers.set("content-type", fallbackContentType);
	}

	const body = await upstream.arrayBuffer();
	headers.set("content-length", String(body.byteLength));

	return new Response(body, {
		status: upstream.status,
		headers,
	});
}

export const GET: RequestHandler = async ({ platform, url, params }) => {
	const title =
		url.searchParams.get("title") ||
		params.path?.split("/").filter(Boolean).at(-1) ||
		"645.live";
	const description = url.searchParams.get("description") || undefined;
	const format = url.searchParams.get("format") || "png";

	if (!platform?.env.OG_645_LIVE) {
		return dev
			? createDevFallbackResponse(title, description)
			: createUnavailableResponse();
	}

	try {
		const pathSegments = params.path
			? params.path.split("/").filter(Boolean)
			: [];
		const ogPath = pathSegments.length > 0 ? `/${pathSegments.join("/")}` : "/";
		const ogUrl = new URL(`https://worker${ogPath}`);

		for (const [key, value] of url.searchParams) {
			ogUrl.searchParams.set(key, value);
		}

		if (!ogUrl.searchParams.has("title")) ogUrl.searchParams.set("title", title);
		if (description && !ogUrl.searchParams.has("description")) {
			ogUrl.searchParams.set("description", description);
		}
		if (!ogUrl.searchParams.has("theme")) ogUrl.searchParams.set("theme", "light");
		if (!ogUrl.searchParams.has("format")) ogUrl.searchParams.set("format", format);

		const ogRequest = new Request(ogUrl.toString());
		const response = await platform.env.OG_645_LIVE.fetch(ogRequest);

		if (response.ok) {
			return await createImageResponse(
				response,
				format === "svg" ? "image/svg+xml" : "image/png",
			);
		}

		return dev
			? createDevFallbackResponse(title, description)
			: createUnavailableResponse();
	} catch (error) {
		console.error("Error calling OG Image Worker:", error);
		return dev
			? createDevFallbackResponse(title, description)
			: createUnavailableResponse();
	}
};
