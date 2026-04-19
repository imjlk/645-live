import { getPublicStatusDocument } from "$lib/server/agent-api";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async (event) => {
	return Response.json(getPublicStatusDocument(event), {
		headers: {
			"cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=300",
		},
	});
};
