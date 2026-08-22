import { buildIndexNowManifest } from "$lib/server/indexnow-manifest.js";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
	return Response.json(await buildIndexNowManifest(), {
		headers: {
			"cache-control": "no-store",
			"x-robots-tag": "noindex, nofollow",
		},
	});
};
