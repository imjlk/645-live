import { dev } from "$app/environment";
import type { RequestHandler } from "./$types";

const PAGES_OG_PROXY_VERSION = "2026-03-25-2";
const PUBLIC_OG_WORKER_ORIGIN = "https://og-645-live.645.workers.dev";
const SERVICE_BINDING_RETRY_DELAY_MS = 120;

function applyPagesOgProxyHeaders(headers: Headers) {
	headers.set("x-pages-og-proxy-version", PAGES_OG_PROXY_VERSION);
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchFromWorker(
	binding: Env["OG_645_LIVE"],
	ogUrl: URL,
): Promise<{ response: Response; upstream: "binding" | "public" } | null> {
	let lastResponse: Response | null = null;
	let lastError: unknown = null;

	for (let attempt = 0; attempt < 2; attempt += 1) {
		try {
			const response = await binding.fetch(new Request(ogUrl.toString()));
			if (response.ok) {
				return { response, upstream: "binding" };
			}

			lastResponse = response;
			console.warn("OG service binding returned non-ok response", {
				status: response.status,
				url: ogUrl.toString(),
				attempt: attempt + 1,
			});
		} catch (error) {
			lastError = error;
			console.warn("OG service binding request failed", {
				url: ogUrl.toString(),
				attempt: attempt + 1,
				error,
			});
		}

		if (attempt === 0) {
			await sleep(SERVICE_BINDING_RETRY_DELAY_MS);
		}
	}

	const publicUrl = new URL(ogUrl.toString());
	publicUrl.protocol = "https:";
	publicUrl.host = PUBLIC_OG_WORKER_ORIGIN.replace(/^https?:\/\//, "");

	try {
		const response = await fetch(publicUrl.toString());
		if (response.ok) {
			console.warn("OG proxy fell back to public worker", {
				url: publicUrl.toString(),
			});
			return { response, upstream: "public" };
		}

		lastResponse = response;
		console.warn("Public OG worker returned non-ok response", {
			status: response.status,
			url: publicUrl.toString(),
		});
	} catch (error) {
		lastError = error;
		console.error("Public OG worker request failed", {
			url: publicUrl.toString(),
			error,
		});
	}

	if (lastResponse) {
		return { response: lastResponse, upstream: "binding" };
	}

	if (lastError) {
		throw lastError;
	}

	return null;
}

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
	const headers = new Headers({
		"content-type": "image/svg+xml",
		"cache-control": "no-store",
	});
	applyPagesOgProxyHeaders(headers);

	return new Response(createGenericFallbackSvg(title, description), {
		headers,
	});
}

function createUnavailableResponse() {
	const headers = new Headers({
		"cache-control": "no-store",
	});
	applyPagesOgProxyHeaders(headers);

	return new Response("OG service unavailable", {
		status: 503,
		headers,
	});
}

async function createImageResponse(
	upstream: Response,
	upstreamMode: "binding" | "public",
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

	const upstreamCacheControl = headers.get("cache-control");
	if (upstreamCacheControl) {
		headers.set("cdn-cache-control", upstreamCacheControl);
		headers.set("cloudflare-cdn-cache-control", upstreamCacheControl);
	}

	const body = await upstream.arrayBuffer();
	headers.set("content-length", String(body.byteLength));
	applyPagesOgProxyHeaders(headers);
	headers.set("x-pages-og-upstream", upstreamMode);

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

		const upstreamResult = await fetchFromWorker(platform.env.OG_645_LIVE, ogUrl);
		if (upstreamResult?.response.ok) {
			return await createImageResponse(
				upstreamResult.response,
				upstreamResult.upstream,
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
