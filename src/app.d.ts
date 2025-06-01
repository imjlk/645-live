/// <reference types="./worker-configuration" />
import type { DrizzleClient } from "$lib/db";
import type { BetterAuth } from "./auth";

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Platform {
			env: Env;
			cf: CfProperties;
			ctx: ExecutionContext;
		}
		interface Locals {
			db: DrizzleClient;
			auth: BetterAuth;
		}
	}
}
