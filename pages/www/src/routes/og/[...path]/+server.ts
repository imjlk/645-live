import { dev } from "$app/environment";
import { createGenericDevFallbackResponse } from "$lib/server/og-fallbacks.js";
import {
	createProxiedImageResponse,
	createUnavailableOgResponse,
	fetchOgUpstream,
} from "$lib/server/og-proxy.js";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ platform, url, params }) => {
	const title =
		url.searchParams.get("title") ||
		params.path?.split("/").filter(Boolean).at(-1) ||
		"645.live";
	const description = url.searchParams.get("description") || undefined;
	const format = url.searchParams.get("format") || "png";

	if (!platform?.env.OG_645_LIVE) {
		return dev
			? createGenericDevFallbackResponse(title, description)
			: createUnavailableOgResponse();
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

		if (!ogUrl.searchParams.has("title"))
			ogUrl.searchParams.set("title", title);
		if (description && !ogUrl.searchParams.has("description")) {
			ogUrl.searchParams.set("description", description);
		}
		if (!ogUrl.searchParams.has("theme"))
			ogUrl.searchParams.set("theme", "light");
		if (!ogUrl.searchParams.has("format"))
			ogUrl.searchParams.set("format", format);

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
			? createGenericDevFallbackResponse(title, description)
			: createUnavailableOgResponse();
	} catch (error) {
		console.error("Error calling OG Image Worker:", error);
		return dev
			? createGenericDevFallbackResponse(title, description)
			: createUnavailableOgResponse();
	}
};
