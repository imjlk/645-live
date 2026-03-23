import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSitemapEntries } from "./sitemap-routes.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const WEB_ROOT = path.join(REPO_ROOT, "pages", "www");
const SITEMAP_PATH = path.join(WEB_ROOT, ".svelte-kit", "cloudflare", "sitemap.xml");
const ORIGIN = "https://645.live";

function escapeXml(value) {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

export function writeEnhancedSitemap() {
	const entries = buildSitemapEntries();

	if (!fs.existsSync(path.dirname(SITEMAP_PATH))) {
		throw new Error(`Sitemap output directory missing: ${path.dirname(SITEMAP_PATH)}`);
	}

	const urlNodes = entries
		.map((entry) => {
			const children = [
				`    <loc>${escapeXml(new URL(entry.path, ORIGIN).toString())}</loc>`,
			];

			if (entry.lastmod) {
				children.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
			}

			if (entry.changefreq) {
				children.push(`    <changefreq>${escapeXml(entry.changefreq)}</changefreq>`);
			}

			if (entry.priority) {
				children.push(`    <priority>${escapeXml(entry.priority)}</priority>`);
			}

			if (entry.image) {
				const imageChildren = [
					`      <image:loc>${escapeXml(new URL(entry.image, ORIGIN).toString())}</image:loc>`,
				];
				if (entry.imageTitle) {
					imageChildren.push(
						`      <image:title>${escapeXml(entry.imageTitle)}</image:title>`,
					);
				}
				children.push(
					`    <image:image>\n${imageChildren.join("\n")}\n    </image:image>`,
				);
			}

			return `  <url>\n${children.join("\n")}\n  </url>`;
		})
		.join("\n");

	const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urlNodes}\n</urlset>\n`;
	fs.writeFileSync(SITEMAP_PATH, xml, "utf8");
}

if (import.meta.url === `file://${process.argv[1]}`) {
	writeEnhancedSitemap();
}
