import path from "node:path";
import { fileURLToPath } from "node:url";
import jiti from "jiti";
import { createSitemap } from "svelte-sitemap";
import { writeEnhancedSitemap } from "./postprocess-sitemap.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const WEB_ROOT = path.join(REPO_ROOT, "pages", "www");

async function main() {
	const loadConfig = jiti(import.meta.url, { interopDefault: true });
	const config = loadConfig(path.join(WEB_ROOT, "svelte-sitemap.config.ts"));
	await createSitemap(config);
	writeEnhancedSitemap();
}

main().catch((error) => {
	console.error("[seo] sitemap generation failed", error);
	process.exitCode = 1;
});
