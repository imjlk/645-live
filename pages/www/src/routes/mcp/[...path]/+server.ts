import { createMcpNotFoundResponse } from "$lib/server/mcp";
import type { RequestHandler } from "./$types";

const methodNotAllowed = () => createMcpNotFoundResponse("/mcp");

export const GET: RequestHandler = async ({ url }) => {
	return createMcpNotFoundResponse(url.pathname);
};

export const POST: RequestHandler = methodNotAllowed;
export const DELETE: RequestHandler = methodNotAllowed;
export const OPTIONS: RequestHandler = methodNotAllowed;
