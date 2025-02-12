import { SESSION_COOKIE, createAdminClient } from "$lib/appwrite";
import { redirect, type Actions } from "@sveltejs/kit";
import { ID, OAuthProvider } from "node-appwrite";

export const actions: Actions = {
	register: async ({ request, cookies }) => {
		const form = await request.formData();
		const email = form.get("email") as string;
		const password = form.get("password") as string;
		const name = form.get("name") as string;

		const { account } = createAdminClient();

		await account.create(ID.unique(), email, password, name);
		const session = await account.createEmailPasswordSession(email, password);

		cookies.set(SESSION_COOKIE, session.secret, {
			sameSite: "strict",
			expires: new Date(session.expire),
			secure: true,
			path: "/",
		});

		throw redirect(302, "/account");
	},
	login: async ({ request, cookies }) => {
		const form = await request.formData();
		const email = form.get("email") as string;
		const password = form.get("password") as string;

		const { account } = createAdminClient();

		const session = await account.createEmailPasswordSession(email, password);

		cookies.set(SESSION_COOKIE, session.secret, {
			sameSite: "strict",
			expires: new Date(session.expire),
			secure: true,
			path: "/",
		});

		throw redirect(302, "/account");
	},
};
