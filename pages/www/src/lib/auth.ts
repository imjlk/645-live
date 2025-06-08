import { env } from "$env/dynamic/private";
import type { RequestEvent } from "@sveltejs/kit";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import type { DrizzleClient } from "./db";
import * as authSchema from "./db/schema/auth";

export const createAuth = (db: DrizzleClient, event?: RequestEvent) =>
	betterAuth({
		database: drizzleAdapter(db, {
			provider: "pg",
			schema: {
				...authSchema,
			},
		}),
		// emailAndPassword: {
		// 	enabled: true,
		// },
		plugins: [
			emailOTP({
				async sendVerificationOTP({ email, otp, type }) {
					if (type === "sign-in") {
						console.log(`Sending OTP for sign-in to ${email}: ${otp}`);
					}
				},
			}),
		],
	});

export type BetterAuth = ReturnType<typeof createAuth>;
