import type { Handle } from "@sveltejs/kit";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { building } from "$app/environment";
import {
	getAgentManifest,
	getAgentPageForRequest,
} from "$lib/agent/content";
import {
	acceptsJson,
	acceptsMarkdown,
	applyAgentResponseHeaders,
	createMarkdownResponse,
} from "$lib/agent/http";
import { getPublicAuthSummary } from "$lib/server/agent-api";
import { env } from "$env/dynamic/private";
import type { DrizzleClient } from "$lib/db";

function getDatabaseUrl(event: Parameters<Handle>[0]["event"]): string {
	if (env.DATABASE_URL) {
		return env.DATABASE_URL;
	}

	if (event.platform?.env?.HYPERDRIVE?.connectionString) {
		return event.platform.env.HYPERDRIVE.connectionString;
	}

	throw new Error(
		"No database connection available. Expected env.DATABASE_URL or platform.env.HYPERDRIVE.connectionString.",
	);
}

function describeDatabaseBootstrapError(error: unknown): string {
	if (error instanceof Error) {
		return `${error.name}: ${error.message}`;
	}

	return String(error);
}

async function maybeHandleNegotiatedAgentResponse(
	event: Parameters<Handle>[0]["event"],
): Promise<Response | null> {
	const page = getAgentPageForRequest(event.url);
	if (!page) {
		return null;
	}

	if (acceptsMarkdown(event.request)) {
		return createMarkdownResponse(event.request, page);
	}

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
	if (building) {
		return resolve(event);
	}

	try {
		const [{ createAuth }, { createDrizzleClient }] = await Promise.all([
			import("$lib/auth"),
			import("$lib/db"),
		]);

		const databaseUrl = getDatabaseUrl(event);
		event.locals.db = createDrizzleClient(databaseUrl);
		event.locals.dbBootstrapError = undefined;

		const auth = createAuth(event.locals.db, event);
		event.locals.auth = auth;

		const negotiatedResponse = await maybeHandleNegotiatedAgentResponse(event);
		if (negotiatedResponse) {
			return negotiatedResponse;
		}

		const resolveWithDiscoveryHeaders: typeof resolve = async (incomingEvent, opts) => {
			const response = await resolve(incomingEvent, opts);
			return applyAgentResponseHeaders(incomingEvent.request, response);
		};

		return await svelteKitHandler({
			event,
			resolve: resolveWithDiscoveryHeaders,
			auth,
			building,
		});
	} catch (error) {
		const summary = describeDatabaseBootstrapError(error);
		console.error(`[db bootstrap] ${summary}`, error);
		(event.locals as { db?: DrizzleClient }).db = undefined;
		event.locals.auth = undefined;
		event.locals.dbBootstrapError = summary;

		const negotiatedResponse = await maybeHandleNegotiatedAgentResponse(event);
		if (negotiatedResponse) {
			return negotiatedResponse;
		}

		const response = await resolve(event);
		return applyAgentResponseHeaders(event.request, response);
	}
};
