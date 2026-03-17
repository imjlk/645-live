import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { mdsvex } from "mdsvex";

const config = {
	preprocess: [
		vitePreprocess(),
		mdsvex({
			extensions: [".mdx", ".svx"],
		}),
	],
	kit: {
		adapter: adapter(),
		serviceWorker: {
			register: process.env.NODE_ENV === "production",
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
