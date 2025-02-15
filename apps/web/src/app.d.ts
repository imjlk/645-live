// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		interface Platform {
			env: Env; // Env
			cf: CfProperties;
			ctx: ExecutionContext;
			caches: CacheStorage & { default: Cache };
		}
		// interface Error {}
		interface Locals {
			user: Models.User<Models.Preferences> | undefined;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
