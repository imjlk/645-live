import {
	SESSION_COOKIE,
	createAdminClient,
	createSessionClient,
} from "@/shared/config/appwrite";
import { type Actions, redirect } from "@sveltejs/kit";
import { ID, OAuthProvider } from "node-appwrite";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
	try {
		const { account } = createSessionClient(event);
		const user = await account.get();
		if (user) {
			redirect(302, "/account");
		}
	} catch (error) {
		// Not logged in, continue to auth page
	}
};

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
