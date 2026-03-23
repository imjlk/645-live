import { getConfiguredSocialProviders, type SocialProviderId } from "$lib/server/auth-social";
import { executeAuthJsonAction } from "$lib/server/auth-request";
import { normalizeNextPath } from "$lib/server/auth-next";
import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

type AuthActionResult = {
	message?: string;
	url?: string;
	redirect?: boolean;
};

const SOCIAL_PROVIDER_IDS = new Set<SocialProviderId>(["google", "kakao", "naver"]);

export const load: PageServerLoad = async ({ parent, url, platform }) => {
	const { session } = await parent();
	const nextPath = normalizeNextPath(url.searchParams.get("next"));

	if (session?.user?.id) {
		throw redirect(303, nextPath);
	}

	return {
		nextPath,
		socialProviders: getConfiguredSocialProviders({ platform }),
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
	social: async (event) => {
		const formData = await event.request.formData();
		const provider = String(formData.get("provider") ?? "").trim() as SocialProviderId;
		const nextPath = normalizeNextPath(String(formData.get("next") ?? ""));

		if (!SOCIAL_PROVIDER_IDS.has(provider)) {
			return fail(400, {
				mode: "signIn",
				formError: "지원하지 않는 소셜 로그인 제공자입니다.",
			});
		}

		const absoluteCallbackUrl = new URL(nextPath, event.url.origin).toString();
		const absoluteErrorUrl = new URL(`/login?next=${encodeURIComponent(nextPath)}`, event.url.origin).toString();

		const { data, response } = await executeAuthJsonAction<AuthActionResult>(
			event,
			"/auth/sign-in/social",
			{
				provider,
				callbackURL: absoluteCallbackUrl,
				newUserCallbackURL: absoluteCallbackUrl,
				errorCallbackURL: absoluteErrorUrl,
				disableRedirect: true,
			},
		);

		const location = response.headers.get("location") ?? data?.url;
		if (!response.ok || !location) {
			return fail(response.status || 500, {
				mode: "signIn",
				formError: `${provider} 로그인 시작에 실패했습니다.`,
			});
		}

		throw redirect(303, location);
	},
};
