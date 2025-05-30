import { verification } from "$lib/server/db/schema";
import { json } from "@sveltejs/kit";
import { desc } from "drizzle-orm";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
	const [latestOtp] = await locals.db
		.select({ value: verification.value })
		.from(verification)
		.orderBy(desc(verification.createdAt))
		.limit(1);

	return json({ otp: latestOtp?.value });
};
