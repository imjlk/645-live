import { executeAuthJsonAction } from "$lib/server/auth-request";
import { normalizeNextPath } from "$lib/server/auth-next";
import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

type AuthActionResult = {
	message?: string;
};

export const load: PageServerLoad = async ({ parent, url }) => {
	const { session } = await parent();
	const nextPath = normalizeNextPath(url.searchParams.get("next"));

	if (session?.user?.id) {
		throw redirect(303, nextPath);
	}

	return {
		nextPath,
	};
};

export const actions: Actions = {
	signIn: async (event) => {
		const formData = await event.request.formData();
		const email = String(formData.get("email") ?? "").trim();
		const password = String(formData.get("password") ?? "");
		const nextPath = normalizeNextPath(String(formData.get("next") ?? ""));

		const { data, response } = await executeAuthJsonAction<AuthActionResult>(
			event,
			"/auth/sign-in/email",
			{
				email,
				password,
				rememberMe: true,
				callbackURL: nextPath,
			},
		);

		if (!response.ok) {
			return fail(response.status, {
				mode: "signIn",
				values: { email },
				formError: data?.message ?? "로그인에 실패했습니다.",
			});
		}

		throw redirect(303, nextPath);
	},
	signUp: async (event) => {
		const formData = await event.request.formData();
		const name = String(formData.get("name") ?? "").trim();
		const email = String(formData.get("email") ?? "").trim();
		const password = String(formData.get("password") ?? "");
		const nextPath = normalizeNextPath(String(formData.get("next") ?? ""));

		const { data, response } = await executeAuthJsonAction<AuthActionResult>(
			event,
			"/auth/sign-up/email",
			{
				name,
				email,
				password,
				rememberMe: true,
				callbackURL: nextPath,
			},
		);

		if (!response.ok) {
			return fail(response.status, {
				mode: "signUp",
				values: { name, email },
				formError: data?.message ?? "회원가입에 실패했습니다.",
			});
		}

		throw redirect(303, nextPath);
	},
};
