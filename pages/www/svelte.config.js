import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { mdsvex } from "mdsvex";

const mdsvexPreprocess = mdsvex({
	extensions: [".mdx", ".svx"],
});

const normalizeMdsvexModuleScripts = {
	name: "normalize-mdsvex-module-scripts",
	async markup(options) {
		const { filename } = options;
		if (!filename || !/\.(mdx|svx)$/.test(filename)) {
			return undefined;
		}

		const processed = await mdsvexPreprocess.markup?.(options);
		if (!processed?.code) {
			return processed;
		}

		return {
			...processed,
			code: processed.code
				.replace(/<script(\s+lang=(["'])ts\2)?\s+context=(["'])module\3/g, "<script$1 module")
				.replace(/<script\s+context=(["'])module\1(\s+lang=(["'])ts\3)?/g, "<script module$2"),
		};
	},
};

const config = {
	preprocess: [
		vitePreprocess(),
		normalizeMdsvexModuleScripts,
	],
	kit: {
		adapter: adapter(),
		serviceWorker: {
			register: process.env.NODE_ENV === "production",
		},
		csrf: {
			trustedOrigins: ["*"],
		},
	},
	extensions: [".svelte", ".svx", ".mdx"],
	compilerOptions: {
		runes: true,
	},
};

export default config;
