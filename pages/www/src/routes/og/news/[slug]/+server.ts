import { dev } from "$app/environment";
import { getNewsPostBySlug } from "$lib/server/news.js";
import type { RequestHandler } from "./$types";

const PAGES_OG_PROXY_VERSION = "2026-03-25-2";
const PUBLIC_OG_WORKER_ORIGIN = "https://og-645-live.645.workers.dev";
const SERVICE_BINDING_RETRY_DELAY_MS = 120;

function applyPagesOgProxyHeaders(headers: Headers) {
	headers.set("X-Pages-OG-Proxy-Version", PAGES_OG_PROXY_VERSION);
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

// Category color themes
const categoryThemes: Record<string, { bg: string; accent: string; text: string }> = {
	'로또분석': { bg: '#1E3A8A', accent: '#3B82F6', text: '#DBEAFE' },  // Blue
	'당첨소식': { bg: '#78350F', accent: '#F59E0B', text: '#FEF3C7' },  // Gold
	'통계': { bg: '#064E3B', accent: '#10B981', text: '#D1FAE5' },      // Green
	'default': { bg: '#374151', accent: '#6B7280', text: '#F3F4F6' }    // Gray
};

function generateEnhancedSVG(
	title: string,
	description: string,
	category: string,
	date: string,
	highlight?: string
): string {
	const theme = categoryThemes[category] || categoryThemes['default'];
	
	// Truncate title if too long
	const displayTitle = title.length > 30 ? title.substring(0, 27) + '...' : title;
	const displayDesc = description.length > 50 ? description.substring(0, 47) + '...' : description;
	
	const highlightSection = highlight ? `
		<!-- Highlight Banner -->
		<rect x="0" y="480" width="1200" height="60" fill="${theme.accent}"/>
		<text x="600" y="520" font-family="sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="#1F2937">
			🎉 ${highlight}
		</text>
	` : '';
	
	return `
	<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
		<defs>
			<linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" style="stop-color:${theme.bg};stop-opacity:1" />
				<stop offset="100%" style="stop-color:#111827;stop-opacity:1" />
			</linearGradient>
			<pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
				<path d="M 60 0 L 0 0 0 60" fill="none" stroke="${theme.accent}" stroke-width="0.5" opacity="0.2"/>
			</pattern>
		</defs>
		
		<!-- Background -->
		<rect width="1200" height="630" fill="url(#bgGradient)"/>
		<rect width="1200" height="630" fill="url(#grid)"/>
		
		<!-- Category Badge -->
		<rect x="50" y="50" width="${category.length * 20 + 40}" height="40" rx="20" fill="${theme.accent}"/>
		<text x="${50 + (category.length * 20 + 40) / 2}" y="78" font-family="sans-serif" font-size="18" font-weight="bold" text-anchor="middle" fill="#1F2937">
			${category}
		</text>
		
		<!-- Date -->
		<text x="1150" y="78" font-family="sans-serif" font-size="16" text-anchor="end" fill="${theme.text}" opacity="0.8">
			${date}
		</text>
		
		<!-- Title -->
		<text x="600" y="280" font-family="sans-serif" font-size="52" font-weight="bold" text-anchor="middle" fill="#FFFFFF">
			${displayTitle}
		</text>
		
		<!-- Description -->
		<text x="600" y="350" font-family="sans-serif" font-size="28" text-anchor="middle" fill="${theme.text}" opacity="0.9">
			${displayDesc}
		</text>
		
		<!-- Decorative lottery balls for analysis category -->
		${category === '로또분석' ? `
			<circle cx="100" cy="550" r="30" fill="#DC2626"/>
			<circle cx="170" cy="550" r="30" fill="#F59E0B"/>
			<circle cx="240" cy="550" r="30" fill="#10B981"/>
			<circle cx="310" cy="550" r="30" fill="#3B82F6"/>
			<circle cx="380" cy="550" r="30" fill="#8B5CF6"/>
			<circle cx="450" cy="550" r="30" fill="#EC4899"/>
		` : ''}
		
		${highlightSection}
		
		<!-- Branding -->
		<text x="1150" y="600" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="end" fill="${theme.text}">
			645.live
		</text>
		<text x="50" y="600" font-family="sans-serif" font-size="16" text-anchor="start" fill="${theme.text}" opacity="0.7">
			로또 뉴스 &amp; 분석
		</text>
	</svg>`;
}

function createGenericFailureResponse() {
	const headers = new Headers({
		"Cache-Control": "no-store",
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
		headers.set("CDN-Cache-Control", upstreamCacheControl);
		headers.set("Cloudflare-CDN-Cache-Control", upstreamCacheControl);
	}

	const body = await upstream.arrayBuffer();
	headers.set("content-length", String(body.byteLength));
	applyPagesOgProxyHeaders(headers);
	headers.set("X-Pages-OG-Upstream", upstreamMode);

	return new Response(body, {
		status: upstream.status,
		headers,
	});
}

export const GET: RequestHandler = async ({ platform, url, params }) => {
	const post = getNewsPostBySlug(params.slug);
	const title =
		url.searchParams.get("title") ||
		post?.title ||
		`제${params.slug.replace(/[^0-9]/g, "")}회 로또 당첨 결과`;
	const description =
		url.searchParams.get("description") ||
		post?.description ||
		"로또 추첨 결과와 당첨점 분석";
	const category =
		url.searchParams.get("category") || post?.category || "로또분석";
	const date =
		url.searchParams.get("date") ||
		post?.updatedAt ||
		post?.publishedAt ||
		post?.date ||
		new Date().toISOString().split("T")[0];
	const highlight = url.searchParams.get("highlight") || undefined;
	const round =
		url.searchParams.get("round") || params.slug.replace(/[^0-9]/g, "");
	const theme = url.searchParams.get("theme") || "news";
	const format = url.searchParams.get("format") || "png";

	const generateFallbackSVG = () => {
		const svg = generateEnhancedSVG(title, description, category, date, highlight);
		const headers = new Headers({
			"Content-Type": "image/svg+xml",
			"Cache-Control": "no-store",
		});
		applyPagesOgProxyHeaders(headers);

		return new Response(svg, {
			headers,
		});
	};

	if (!platform?.env?.OG_645_LIVE) {
		return dev ? generateFallbackSVG() : createGenericFailureResponse();
	}

	try {
		const ogUrl = new URL(`https://worker/news/${params.slug}`);

		for (const [key, value] of url.searchParams) {
			ogUrl.searchParams.set(key, value);
		}

		if (!ogUrl.searchParams.has("title")) ogUrl.searchParams.set("title", title);
		if (!ogUrl.searchParams.has("description")) {
			ogUrl.searchParams.set("description", description);
		}
		if (!ogUrl.searchParams.has("category")) {
			ogUrl.searchParams.set("category", category);
		}
		if (!ogUrl.searchParams.has("theme")) ogUrl.searchParams.set("theme", theme);
		if (!ogUrl.searchParams.has("format")) ogUrl.searchParams.set("format", format);
		if (!ogUrl.searchParams.has("layout")) ogUrl.searchParams.set("layout", "news");
		if (!ogUrl.searchParams.has("date")) ogUrl.searchParams.set("date", date);
		if (highlight && !ogUrl.searchParams.has("highlight")) {
			ogUrl.searchParams.set("highlight", highlight);
		}
		if (round && !ogUrl.searchParams.has("round")) {
			ogUrl.searchParams.set("round", round);
		}
		if (!ogUrl.searchParams.has("width")) ogUrl.searchParams.set("width", "1200");
		if (!ogUrl.searchParams.has("height")) {
			ogUrl.searchParams.set("height", "630");
		}
		const upstreamResult = await fetchFromWorker(platform.env.OG_645_LIVE, ogUrl);
		if (upstreamResult?.response.ok) {
			return await createImageResponse(
				upstreamResult.response,
				upstreamResult.upstream,
				format === "svg" ? "image/svg+xml" : "image/png",
			);
		}

		return dev ? generateFallbackSVG() : createGenericFailureResponse();
	} catch (error) {
		console.error("Error calling OG Image Worker:", error);
		return dev ? generateFallbackSVG() : createGenericFailureResponse();
	}
};
