import { getRecentDrawSnapshotResponse } from "$lib/server/recent-draw-snapshot";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request }) => {
	return getRecentDrawSnapshotResponse(request);
};
