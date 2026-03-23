import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import UnpluginTypia from "@typia/unplugin/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(async ({ command }) => {
	const [tailwindPlugins, sveltePlugins] = await Promise.all([
		Promise.resolve(tailwindcss()),
		Promise.resolve(sveltekit()),
	]);
	const trailbaseTarget = process.env.TRAILBASE_URL || "http://localhost:4000";

	return {
		plugins: [
			UnpluginTypia({
				tsconfig: path.resolve(__dirname, "./tsconfig.typia.json"),
			}),
			...tailwindPlugins,
			...sveltePlugins,
		],
		resolve: {
			alias: {
				"@645/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
				"@645/api": path.resolve(__dirname, "../../packages/api/src/index.ts"),
			},
		},
		server: {
			hmr:
				command === "serve"
					? {
							// Use a different port for HMR WebSocket to avoid conflicts with Bun
							port: 24678,
							host: "localhost",
						}
					: undefined,
			watch:
				command === "serve"
					? {
							// Use polling for file watching with Bun in development
							usePolling: true,
							interval: 1000,
						}
					: undefined,
			// Force IPv4 for better Bun compatibility
			host: "127.0.0.1",
			proxy:
				command === "serve"
					? {
							"/api/records/v1": {
								target: trailbaseTarget,
								changeOrigin: true,
							},
							"/api/auth/v1": {
								target: trailbaseTarget,
								changeOrigin: true,
							},
							"/connection": {
								target: trailbaseTarget,
								changeOrigin: true,
							},
							"/scanned": {
								target: trailbaseTarget,
								changeOrigin: true,
							},
						}
					: undefined,
		},
		// Add WebSocket compatibility for Bun
		define: {
			global: "globalThis",
		},
		optimizeDeps: {
			exclude: ["ws"],
			include: ["vite > ws"],
		},
	};
});
