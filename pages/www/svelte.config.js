import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { mdsvex } from "mdsvex";

const config = {
	preprocess: [vitePreprocess(), mdsvex()],
	kit: {
		adapter: adapter(),
		serviceWorker: {
			register: true,
		},
		csrf: {
			checkOrigin: false,
		},
	},
	extensions: [".svelte", ".svx"],
	compilerOptions: {
		runes: true,
	},
};

export default config;
