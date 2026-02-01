import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { mdsvex } from "mdsvex";

const config = {
	preprocess: [
		vitePreprocess(),
		mdsvex({
			extensions: [".mdx", ".svx"]
		}),
	],
	kit: {
		adapter: adapter(),
		serviceWorker: {
			register: true,
		},
		csrf: {
			checkOrigin: false,
		},
	},
	extensions: [".svelte", ".svx", ".mdx"],
	compilerOptions: {
		runes: true,
	},
};

export default config;
