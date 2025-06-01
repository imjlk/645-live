import { env } from "$env/dynamic/private";
import { createAuth } from "$lib/auth"; // path to your auth file
import { createDrizzleClient } from "$lib/db";
import type { Handle } from "@sveltejs/kit";
import { svelteKitHandler } from "better-auth/svelte-kit";

function getDatabaseUrl(event: Parameters<Handle>[0]["event"]): string {
	if (event.platform?.env?.HYPERDRIVE?.connectionString) {
		return event.platform.env.HYPERDRIVE.connectionString;
	}

	if (env.DATABASE_URL) {
		return env.DATABASE_URL;
	}

	throw new Error("No database connection available.");
}

export const handle: Handle = async ({ event, resolve }) => {
	try {
		const databaseUrl = getDatabaseUrl(event);
		event.locals.db = createDrizzleClient(databaseUrl);

		const auth = createAuth(event.locals.db);
		event.locals.auth = auth;

		return await svelteKitHandler({ event, resolve, auth });
	} catch (error) {
		console.error("Database connection failed:", error);
		throw error;
	}
};
