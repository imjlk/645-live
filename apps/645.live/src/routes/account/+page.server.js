import { SESSION_COOKIE, createSessionClient } from "$lib/appwrite";
import { redirect } from "@sveltejs/kit";

export async function load({ locals }) {
	if (!locals.user) throw redirect(302, "/auth");

	return {
		user: locals.user,
	};
}

export const actions = {
	logout: async (event) => {
		const { account } = createSessionClient(event);

		await account.deleteSession("current");
		event.cookies.delete(SESSION_COOKIE, { path: "/" });
		throw redirect(302, "/");
	},
};
