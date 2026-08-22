import { buildIndexNowManifest } from "$lib/server/indexnow-manifest.js";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
	return Response.json(await buildIndexNowManifest(), {
		headers: {
			"cache-control":
				"public, max-age=0, s-maxage=300, stale-while-revalidate=300",
			"x-robots-tag": "noindex, nofollow",
		},
	});
};
