import type { OptionsSvelteSitemap } from "svelte-sitemap";
import { buildSitemapEntries } from "../../scripts/seo/sitemap-routes.mjs";

const config: OptionsSvelteSitemap = {
	domain: "https://645.live",
	outDir: ".svelte-kit/cloudflare",
	attribution: false,
	ignore: ["404.html"],
	additional: buildSitemapEntries().map((entry) =>
		entry.path === "/" ? "/" : entry.path.replace(/^\//, ""),
	),
};

export default config;
