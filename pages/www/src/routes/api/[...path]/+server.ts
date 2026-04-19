import { createJsonErrorResponse } from "$lib/agent/http";
import type { RequestHandler } from "./$types";

const methodNotAllowed = () =>
	createJsonErrorResponse(
		405,
		"METHOD_NOT_ALLOWED",
		"Only GET is supported on this API surface.",
	);

export const GET: RequestHandler = async ({ params, url }) => {
	return createJsonErrorResponse(
		404,
		"ENDPOINT_NOT_FOUND",
		`No public API endpoint exists at ${url.pathname}.`,
		params.path === "lotto-draws"
			? "Try /api/lotto-draws-recent.json or /api/lotto-draws/{round}.json."
			: "See /docs or /api/openapi.json for the supported public endpoints.",
	);
};

export const POST: RequestHandler = methodNotAllowed;
export const PUT: RequestHandler = methodNotAllowed;
export const PATCH: RequestHandler = methodNotAllowed;
export const DELETE: RequestHandler = methodNotAllowed;
