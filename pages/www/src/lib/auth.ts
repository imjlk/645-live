import { env } from "$env/dynamic/private";
import type { RequestEvent } from "@sveltejs/kit";
import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { sveltekitCookies } from "better-auth/svelte-kit";
import type { DrizzleClient } from "./db";
import * as authSchema from "./db/schema/auth";
import { createAuthPasswordHasher } from "./server/auth-password-hasher";
import { getBetterAuthSocialProviders } from "./server/auth-social";
import { shouldAllowLocalAuthFallback } from "./server/auth-runtime";

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
	const configuredSecret = platformEnv.BETTER_AUTH_SECRET ?? env.BETTER_AUTH_SECRET;
	if (typeof configuredSecret === "string" && configuredSecret.trim().length > 0) {
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
		plugins: [
			sveltekitCookies(() => event),
		],
	});

export type BetterAuth = ReturnType<typeof createAuth>;

export const handleAuthRequest = async (
	event: RequestEvent,
	request: Request = event.request,
): Promise<Response> => {
	const auth = createAuth(event.locals.db, event);
	return auth.handler(request);
};
