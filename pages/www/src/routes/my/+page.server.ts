import { createMyScansService } from "$lib/server/my-scans";
import { normalizeNextPath } from "$lib/server/auth-next";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, parent, url }) => {
	const { session } = await parent();

	if (!session?.user?.id) {
		throw redirect(
			303,
			`/login?next=${encodeURIComponent(normalizeNextPath(url.pathname))}`,
		);
	}

	const myScansService = createMyScansService(locals.db);
	const [summary, recentScans] = await Promise.all([
		myScansService.getSummary(session.user.id),
		myScansService.list(session.user.id, { limit: 10 }),
	]);

	return {
		session,
		summary,
		recentScans,
	};
};
