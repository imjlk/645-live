import type { Handle } from "@sveltejs/kit";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { building } from "$app/environment";
import { env } from "$env/dynamic/private";
import { getAgentManifest, getAgentPageForRequest } from "$lib/agent/content";
import {
	acceptsJson,
	acceptsMarkdown,
	applyAgentResponseHeaders,
	createMarkdownResponse,
} from "$lib/agent/http";
import { getPublicAuthSummary } from "$lib/server/agent-api";
import {
	hasSessionCookie,
	isCrossOriginMutation,
	isPrivateEndpoint,
	needsMemberDatabase,
} from "$lib/server/request-policy";

function getDatabaseUrl(event: Parameters<Handle>[0]["event"]): string {
	const url =
		env.DATABASE_URL || event.platform?.env?.HYPERDRIVE?.connectionString;
	if (!url) throw new Error("Member database binding is unavailable");
	return url;
}

function negotiatedResponse(
	event: Parameters<Handle>[0]["event"],
): Response | null {
	if (!["GET", "HEAD"].includes(event.request.method)) return null;
	const page = getAgentPageForRequest(event.url);
	if (!page) return null;
	if (acceptsMarkdown(event.request))
		return createMarkdownResponse(event.request, page);
	if (
		event.url.pathname === "/" &&
		event.url.searchParams.get("mode") === "agent" &&
		acceptsJson(event.request)
	) {
		return applyAgentResponseHeaders(
			event.request,
			Response.json({
				...getAgentManifest(),
				page,
				auth: getPublicAuthSummary(event),
			}),
		);
	}
	return null;
}

export const handle: Handle = async ({ event, resolve }) => {
	if (building) return resolve(event);
	const negotiated = negotiatedResponse(event);
	if (negotiated) return negotiated;

	const pathname = event.url.pathname;
	const privateEndpoint = isPrivateEndpoint(pathname);
	const finish = (response: Response) => {
		const result = applyAgentResponseHeaders(event.request, response);
		result.headers.set("referrer-policy", "strict-origin-when-cross-origin");
		result.headers.set("x-content-type-options", "nosniff");
		if (privateEndpoint)
			result.headers.set("cache-control", "private, no-store");
		return result;
	};
	if (privateEndpoint && isCrossOriginMutation(event.request)) {
		return finish(
			Response.json(
				{ message: "Cross-origin requests are not allowed" },
				{ status: 403 },
			),
		);
	}
	// An anonymous visitor has no session to look up. Never read or expose HttpOnly tokens in JS.
	if (
		pathname === "/auth/get-session" &&
		event.request.method === "GET" &&
		!hasSessionCookie(event.request.headers.get("cookie"))
	) {
		return finish(Response.json(null));
	}
	if (!needsMemberDatabase(pathname)) return finish(await resolve(event));

	try {
		const [{ createAuth }, { createDrizzleClient }] = await Promise.all([
			import("$lib/auth"),
			import("$lib/db"),
		]);
		event.locals.db = createDrizzleClient(getDatabaseUrl(event));
		event.locals.auth = createAuth(event.locals.db, event);
	} catch {
		// Do not publish connection strings or turn failed authenticated writes into guest writes.
		console.error("[auth] Member database/auth configuration is unavailable");
		event.locals.db = undefined;
		event.locals.auth = undefined;
		event.locals.dbBootstrapError = "Authentication is temporarily unavailable";
		if (privateEndpoint)
			return finish(
				Response.json(
					{ message: event.locals.dbBootstrapError },
					{ status: 503 },
				),
			);
	}

	// Keep resolution outside the bootstrap catch: a failed mutation must never execute twice.
	if (event.locals.auth) {
		return finish(
			await svelteKitHandler({
				event,
				resolve,
				auth: event.locals.auth,
				building,
			}),
		);
	}
	return finish(await resolve(event));
};
