import { SESSION_COOKIE, createSessionClient } from "@/shared/config/appwrite";
import { type Actions, redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
	try {
		const { account } = createSessionClient(event);
		const user = await account.get();

		if (!user) {
			redirect(302, "/login");
		}

		return {
			user,
		};
	} catch (error) {
		redirect(302, "/login");
		// Not logged in, continue to login page
	}
};

export const actions: Actions = {
	logout: async (event) => {
		const { account } = createSessionClient(event);

		await account.deleteSession("current");
		event.cookies.delete(SESSION_COOKIE, { path: "/" });
		throw redirect(302, "/");
	},
};
