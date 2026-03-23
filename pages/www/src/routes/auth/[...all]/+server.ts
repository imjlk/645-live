import type { RequestHandler } from "@sveltejs/kit";

const handler: RequestHandler = async (event) => {
	if (!event.locals.db) {
		if (
			event.request.method === "GET" &&
			event.url.pathname.endsWith("/get-session")
		) {
			return Response.json(null);
		}

		return Response.json(
			{
				message: "Authentication is temporarily unavailable",
			},
			{
				status: 503,
			},
		);
	}

	const { handleAuthRequest } = await import("$lib/auth");
	return handleAuthRequest(event);
};

export const GET: RequestHandler = handler;
export const POST: RequestHandler = handler;
