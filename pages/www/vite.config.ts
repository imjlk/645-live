import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig(async ({ command }) => {
	const [tailwindPlugins, sveltePlugins] = await Promise.all([
		Promise.resolve(tailwindcss()),
		Promise.resolve(sveltekit()),
	]);

	return {
		plugins: [...tailwindPlugins, ...sveltePlugins],
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
