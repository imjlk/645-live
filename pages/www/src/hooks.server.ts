import type { Handle } from "@sveltejs/kit";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { building } from "$app/environment";
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

		return await svelteKitHandler({ event, resolve, auth, building });
	} catch (error) {
		const summary = describeDatabaseBootstrapError(error);
		console.error(`[db bootstrap] ${summary}`, error);
		(event.locals as { db?: DrizzleClient }).db = undefined;
		event.locals.auth = undefined;
		event.locals.dbBootstrapError = summary;
		return resolve(event);
	}
};
