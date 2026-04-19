import { createMcpNotFoundResponse } from "$lib/server/mcp";
import type { RequestHandler } from "./$types";

const notFound: RequestHandler = async ({ url }) => {
	return createMcpNotFoundResponse(url.pathname);
};

export const GET: RequestHandler = notFound;
export const POST: RequestHandler = notFound;
export const DELETE: RequestHandler = notFound;
export const OPTIONS: RequestHandler = notFound;
