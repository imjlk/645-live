import { defineConfig } from "@playwright/test";

const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
	testDir: "./e2e",
	use: {
		baseURL: externalBaseURL || "http://127.0.0.1:4173",
		headless: true,
	},
	webServer: externalBaseURL
		? undefined
		: {
				command: "bunx --bun vite dev --host 127.0.0.1 --port 4173",
				port: 4173,
				reuseExistingServer: true,
				timeout: 120_000,
			},
});
