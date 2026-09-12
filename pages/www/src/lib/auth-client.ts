import { createAuthClient } from "better-auth/svelte";

export const authClient = createAuthClient({
	basePath: "/auth",
	fetchOptions: {
		credentials: "same-origin",
		cache: "no-store",
	},
});
