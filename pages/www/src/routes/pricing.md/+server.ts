import { getPricingMarkdown } from "$lib/agent/content";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
	return new Response(getPricingMarkdown(), {
		headers: {
			"content-type": "text/markdown; charset=utf-8",
			"cache-control": "public, max-age=300, s-maxage=900, stale-while-revalidate=1800",
		},
	});
};
