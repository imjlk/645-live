import build from "@hono/vite-build/cloudflare-pages";
import devServer from "@hono/vite-dev-server";
import adapter from "@hono/vite-dev-server/cloudflare";

import UnpluginTypia from "@ryoppippi/unplugin-typia/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		UnpluginTypia() as any,
		sveltekit(),
		tailwindcss(),
		// build(),
		// devServer({
		// 	adapter,
		// 	// entry: "src/index.tsx",
		// }),
	],
});
