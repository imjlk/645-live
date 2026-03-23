import { normalizeNextPath } from "$lib/server/auth-next";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ parent, url }) => {
	const { session } = await parent();

	if (!session?.user?.id) {
		throw redirect(
			303,
			`/login?next=${encodeURIComponent(normalizeNextPath(url.pathname))}`,
		);
	}

	return { session };
};
