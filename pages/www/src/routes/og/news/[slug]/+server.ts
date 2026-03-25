import { dev } from "$app/environment";
import { getNewsPostBySlug } from "$lib/server/news.js";
import { createNewsDevFallbackResponse } from "$lib/server/og-fallbacks.js";
import {
	createProxiedImageResponse,
	createUnavailableOgResponse,
	fetchOgUpstream,
} from "$lib/server/og-proxy.js";
import type { RequestHandler } from "./$types";

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

	if (!platform?.env?.OG_645_LIVE) {
		return dev
			? createNewsDevFallbackResponse({
					title,
					description,
					category,
					date,
					highlight,
				})
			: createUnavailableOgResponse();
	}

	try {
		const ogUrl = new URL(`https://worker/news/${params.slug}`);

		for (const [key, value] of url.searchParams) {
			ogUrl.searchParams.set(key, value);
		}

		if (!ogUrl.searchParams.has("title"))
			ogUrl.searchParams.set("title", title);
		if (!ogUrl.searchParams.has("description")) {
			ogUrl.searchParams.set("description", description);
		}
		if (!ogUrl.searchParams.has("category")) {
			ogUrl.searchParams.set("category", category);
		}
		if (!ogUrl.searchParams.has("theme"))
			ogUrl.searchParams.set("theme", theme);
		if (!ogUrl.searchParams.has("format"))
			ogUrl.searchParams.set("format", format);
		if (!ogUrl.searchParams.has("layout"))
			ogUrl.searchParams.set("layout", "news");
		if (!ogUrl.searchParams.has("date")) ogUrl.searchParams.set("date", date);
		if (highlight && !ogUrl.searchParams.has("highlight")) {
			ogUrl.searchParams.set("highlight", highlight);
		}
		if (round && !ogUrl.searchParams.has("round")) {
			ogUrl.searchParams.set("round", round);
		}
		if (!ogUrl.searchParams.has("width"))
			ogUrl.searchParams.set("width", "1200");
		if (!ogUrl.searchParams.has("height")) {
			ogUrl.searchParams.set("height", "630");
		}
		const upstreamResult = await fetchOgUpstream(
			platform.env.OG_645_LIVE,
			ogUrl,
		);
		if (upstreamResult?.response.ok) {
			return await createProxiedImageResponse(
				upstreamResult.response,
				upstreamResult.upstream,
				format === "svg" ? "image/svg+xml" : "image/png",
			);
		}

		return dev
			? createNewsDevFallbackResponse({
					title,
					description,
					category,
					date,
					highlight,
				})
			: createUnavailableOgResponse();
	} catch (error) {
		console.error("Error calling OG Image Worker:", error);
		return dev
			? createNewsDevFallbackResponse({
					title,
					description,
					category,
					date,
					highlight,
				})
			: createUnavailableOgResponse();
	}
};
