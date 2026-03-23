import { createOrpcFetchHandler, createAppRouter } from "@645/api";
import { toPublicSession, toPublicUser } from "$lib/server/session";
import type { RequestHandler } from "@sveltejs/kit";

const runHandler: RequestHandler = async (event) => {
	const sessionValue = event.locals.auth
		? await event.locals.auth.api.getSession({
				headers: event.request.headers,
			})
		: null;
	const session = toPublicSession(sessionValue);
	const router = createAppRouter();
	const handle = createOrpcFetchHandler(router, {
		prefix: "/rpc",
		context: {
			request: event.request,
			db: event.locals.db,
			auth: {
				session,
				user: toPublicUser(session),
				userId: session?.user.id ?? null,
			},
		},
	});

	return handle(event.request);
};

export const GET: RequestHandler = runHandler;
export const POST: RequestHandler = runHandler;
export const PUT: RequestHandler = runHandler;
export const PATCH: RequestHandler = runHandler;
export const DELETE: RequestHandler = runHandler;
export const OPTIONS: RequestHandler = runHandler;
export const HEAD: RequestHandler = runHandler;
