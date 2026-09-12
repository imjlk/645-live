import { createAppRouter, createOrpcFetchHandler } from "@645/api";
import type { RequestHandler } from "@sveltejs/kit";
import { createMyScansService } from "$lib/server/my-scans";
import { toPublicSession, toPublicUser } from "$lib/server/session";

const runHandler: RequestHandler = async (event) => {
	const sessionValue = event.locals.auth
		? await event.locals.auth.api.getSession({
				headers: event.request.headers,
			})
		: null;
	const session = toPublicSession(sessionValue);
	const expectedMember = event.request.headers.get("x-645-member-id");
	if (
		event.url.pathname.startsWith("/rpc/myScans/") &&
		expectedMember &&
		expectedMember !== session?.user.id
	) {
		return Response.json(
			{
				json: {
					defined: false,
					code: "CONFLICT",
					status: 409,
					message: "로그인 계정이 변경됐습니다. 다시 확인해주세요.",
				},
			},
			{ status: 409 },
		);
	}
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
			services: {
				myScans: createMyScansService(event.locals.db),
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
