import aitDevtools from "@apps-in-toss/devtools/unplugin";
import { defineConfig } from "vite";
import { resolveLottoRuntime } from "./src/runtime-config";
export default defineConfig(({ command }) => {
	const env = process.env.LOTTO_APP_ENV ?? "production";
	const base = process.env.LOTTO_API_BASE_URL ?? "https://trail.645.live";
	resolveLottoRuntime(env, base);
	return {
		base: "./",
		plugins: [
			command === "serve" && aitDevtools.vite(),
			{
				name: "lotto-runtime",
				generateBundle() {
					this.emitFile({
						type: "asset",
						fileName: "lotto-runtime.json",
						source: JSON.stringify({
							LOTTO_APP_ENV: env,
							LOTTO_API_BASE_URL: base,
						}),
					});
				},
			},
		],
		define: {
			"import.meta.env.LOTTO_APP_ENV": JSON.stringify(env),
			"import.meta.env.LOTTO_API_BASE_URL": JSON.stringify(base),
		},
		// RN Web deep-imports Babel CommonJS defaults. Use the same package's ESM
		// distribution so Rolldown binds the prefixer and its plugins as functions.
		resolve: {
			alias: [
				{ find: /^css-in-js-utils\/lib\//, replacement: "css-in-js-utils/es/" },
				{
					find: /^inline-style-prefixer\/lib\//,
					replacement: "inline-style-prefixer/es/",
				},
			],
			dedupe: ["react", "react-dom", "@emotion/react"],
		},
	};
});
