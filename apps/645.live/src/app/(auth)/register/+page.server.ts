import { getCurrent } from "@/features/auth/actions";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
	const user = await getCurrent(event);
	if (user) redirect(302, "/");
};
