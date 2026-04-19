import { getLlmsFullText } from "$lib/agent/content";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
	return new Response(getLlmsFullText(), {
		headers: {
			"content-type": "text/plain; charset=utf-8",
			"cache-control": "public, max-age=300, s-maxage=900, stale-while-revalidate=1800",
		},
	});
};
