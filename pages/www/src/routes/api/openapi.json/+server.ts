import { getPublicOpenApiDocument } from "$lib/server/agent-api";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
	return Response.json(getPublicOpenApiDocument(), {
		headers: {
			"cache-control": "public, max-age=300, s-maxage=900, stale-while-revalidate=1800",
		},
	});
};
