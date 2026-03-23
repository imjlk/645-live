import { building } from "$app/environment";
import { env } from "$env/dynamic/private";
import type { DrizzleClient } from "$lib/db";
import type { Handle } from "@sveltejs/kit";
import { svelteKitHandler } from "better-auth/svelte-kit";

function getDatabaseUrl(event: Parameters<Handle>[0]["event"]): string {
	// 개발 환경에서는 env.DATABASE_URL을 우선 사용
	if (env.DATABASE_URL) {
		return env.DATABASE_URL;
	}

	// 프로덕션 환경 (Cloudflare)에서만 platform.env.HYPERDRIVE 사용
	if (event.platform?.env?.HYPERDRIVE?.connectionString) {
		return event.platform.env.HYPERDRIVE.connectionString;
	}

	throw new Error("No database connection available.");
}

export const handle: Handle = async ({ event, resolve }) => {
	// 빌드 중이거나 prerender 중에는 데이터베이스 연결 스킵
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

		const auth = createAuth(event.locals.db, event);
		event.locals.auth = auth;

		return await svelteKitHandler({ event, resolve, auth, building });
	} catch (error) {
		console.error("Database connection failed:", error);
		(event.locals as { db?: DrizzleClient }).db = undefined;
		event.locals.auth = undefined;
		return resolve(event);
	}
};
