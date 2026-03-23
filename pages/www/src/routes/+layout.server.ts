import { toPublicSession } from "$lib/server/session";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals, request }) => {
	if (!locals.auth) {
		return { session: null };
	}

	const session = await locals.auth.api.getSession({
		headers: request.headers,
	});

	return {
		session: toPublicSession(session),
	};
};
