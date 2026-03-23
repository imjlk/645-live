import { executeAuthJsonAction } from "$lib/server/auth-request";
import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async (event) => {
	await executeAuthJsonAction(event, "/auth/sign-out");
	throw redirect(303, "/");
};
