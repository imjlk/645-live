import { existsSync } from "node:fs";
import path from "node:path";
import { appsInToss } from "@apps-in-toss/framework/plugins";
import { env } from "@granite-js/plugin-env";
import { defineConfig } from "@granite-js/react-native/config";

const root = path.resolve(process.cwd(), "../..");
export default defineConfig({
	scheme: "intoss",
	appName: "645-live",
	entryFile: "./index.ts",
	metro: {
		watchFolders: [
			root,
			path.join(root, "node_modules"),
			path.join(root, "node_modules/.bun"),
		].filter(existsSync),
		resolver: { conditionNames: ["react-native", "import", "node", "default"] },
	},
	plugins: [
		appsInToss({
			brand: {
				displayName: "645LIVE 로또 번호생성기",
				primaryColor: "#3182F6",
				icon: "https://645.live/assets/icons/icon-512.png",
			},
			permissions: [],
			navigationBar: { withBackButton: true, withHomeButton: false },
		}),
		env({
			LOTTO_APP_ENV: process.env.LOTTO_APP_ENV ?? "development",
			LOTTO_API_BASE_URL:
				process.env.LOTTO_API_BASE_URL ?? "https://trail.645.live",
		}),
	],
});
