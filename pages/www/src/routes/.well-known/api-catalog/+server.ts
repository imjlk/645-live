import { DISCOVERY_PATHS } from "$lib/agent/content";
import { SITE_ORIGIN, absoluteUrl } from "$lib/seo/index.js";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
	const body = {
		linkset: [
			{
				anchor: `${SITE_ORIGIN}/api`,
				"service-desc": [
					{
						href: absoluteUrl(DISCOVERY_PATHS.openApi),
						type: "application/json",
					},
				],
				"service-doc": [
					{
						href: absoluteUrl(DISCOVERY_PATHS.docs),
						type: "text/html",
					},
				],
				status: [
					{
						href: absoluteUrl(DISCOVERY_PATHS.apiStatus),
						type: "application/json",
					},
				],
			},
		],
	};

	return new Response(JSON.stringify(body), {
		headers: {
			"content-type": "application/linkset+json; charset=utf-8",
			"cache-control": "public, max-age=300, s-maxage=900, stale-while-revalidate=1800",
		},
	});
};
