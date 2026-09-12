import type { RequestEvent } from "@sveltejs/kit";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { betterAuth } from "better-auth/minimal";
import { sveltekitCookies } from "better-auth/svelte-kit";
import { env } from "$env/dynamic/private";
import type { DrizzleClient } from "./db";
import * as authSchema from "./db/schema/auth";
import { createAuthPasswordHasher } from "./server/auth-password-hasher";
import { shouldAllowLocalAuthFallback } from "./server/auth-runtime";
import { getBetterAuthSocialProviders } from "./server/auth-social";

function resolveAuthBaseUrl(event: RequestEvent): string {
	const platformEnv = (event.platform?.env ?? {}) as Record<string, unknown>;
	const configuredUrl = platformEnv.BETTER_AUTH_URL ?? env.BETTER_AUTH_URL;

	if (shouldAllowLocalAuthFallback(event)) {
		return event.url.origin;
	}

	if (typeof configuredUrl === "string" && configuredUrl.trim().length > 0) {
		return configuredUrl.trim();
	}

	throw new Error("Missing BETTER_AUTH_URL.");
}

function resolveAuthSecret(event: RequestEvent): string {
	const platformEnv = (event.platform?.env ?? {}) as Record<string, unknown>;
	const configuredSecret =
		platformEnv.BETTER_AUTH_SECRET ?? env.BETTER_AUTH_SECRET;
	if (
		typeof configuredSecret === "string" &&
		configuredSecret.trim().length > 0
	) {
		return configuredSecret.trim();
	}

	if (shouldAllowLocalAuthFallback(event)) {
		return "dev-better-auth-secret-change-me";
	}

	throw new Error("Missing BETTER_AUTH_SECRET.");
}

export const createAuth = (db: DrizzleClient, event: RequestEvent) =>
	betterAuth({
		baseURL: resolveAuthBaseUrl(event),
		basePath: "/auth",
		secret: resolveAuthSecret(event),
		trustedOrigins: [event.url.origin],
		database: drizzleAdapter(db, {
			provider: "pg",
			schema: {
				...authSchema,
			},
		}),
		emailAndPassword: {
			enabled: true,
			autoSignIn: true,
			password: createAuthPasswordHasher(event),
		},
		socialProviders: getBetterAuthSocialProviders(event),
		user: {
			deleteUser: {
				enabled: true,
				beforeDelete: async (user, request) => {
					const expectedMember = request?.headers.get("x-645-member-id");
					if (expectedMember && expectedMember !== user.id) {
						throw new APIError("CONFLICT", {
							message: "로그인 계정이 변경됐습니다. 다시 확인해주세요.",
						});
					}
				},
			},
		},
		hooks: {
			before: createAuthMiddleware(async (ctx) => {
				const isSignup =
					ctx.path === "/sign-up/email" ||
					(ctx.path === "/sign-in/social" &&
						ctx.body !== null &&
						typeof ctx.body === "object" &&
						"requestSignUp" in ctx.body &&
						ctx.body.requestSignUp === true);
				if (isSignup && ctx.headers?.get("x-645-age-confirmed") !== "true") {
					throw new APIError("BAD_REQUEST", {
						code: "AGE_CONFIRMATION_REQUIRED",
						message:
							"회원가입은 만 14세 이상만 가능합니다. 가입 화면에서 확인해주세요.",
					});
				}
			}),
		},
		plugins: [sveltekitCookies(() => event)],
	});

export type BetterAuth = ReturnType<typeof createAuth>;

export const handleAuthRequest = async (
	event: RequestEvent,
	request: Request = event.request,
): Promise<Response> => {
	const auth = createAuth(event.locals.db, event);
	return auth.handler(request);
};
