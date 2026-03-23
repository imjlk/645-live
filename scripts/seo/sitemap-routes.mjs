import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const WEB_ROOT = path.join(REPO_ROOT, "pages", "www");
const NEWS_ROOT = path.join(WEB_ROOT, "src", "content", "news");

function readNewsFiles() {
	return fs
		.readdirSync(NEWS_ROOT)
		.filter((fileName) => fileName.endsWith(".mdx"))
		.sort()
		.map((fileName) => {
			const filePath = path.join(NEWS_ROOT, fileName);
			const source = fs.readFileSync(filePath, "utf8");
			const slug = fileName.replace(/\.mdx$/, "");
			const title = source.match(/^title:\s*["']?([^"'\n]+)["']?/m)?.[1];
			const date = source.match(/^date:\s*["']?([^"'\n]+)["']?/m)?.[1];
			const publishedAt =
				source.match(/^publishedAt:\s*["']?([^"'\n]+)["']?/m)?.[1] || undefined;
			const updatedAt =
				source.match(/^updatedAt:\s*["']?([^"'\n]+)["']?/m)?.[1] || undefined;

			return {
				slug,
				title,
				date,
				publishedAt,
				updatedAt,
				filePath,
			};
		});
}

function buildNewsOgPath(slug, updatedAt, publishedAt, date) {
	const params = new URLSearchParams();
	const version = updatedAt || publishedAt || date;
	if (version) {
		params.set("v", version);
	}

	const query = params.toString();
	return query.length > 0 ? `/og/news/${slug}?${query}` : `/og/news/${slug}`;
}

function toYyyyMmDd(value) {
	if (!value) return undefined;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return undefined;
	return date.toISOString().slice(0, 10);
}

function sourceFileLastMod(filePath) {
	try {
		return fs.statSync(filePath).mtime.toISOString().slice(0, 10);
	} catch {
		return undefined;
	}
}

export function buildSitemapEntries() {
	const newsFiles = readNewsFiles();
	const recentRoundPresets = ["10", "20", "50", "100"];
	const recentStatsSections = [
		"ac",
		"colors",
		"high-low",
		"odd-even",
		"repeat",
		"sections",
		"unit-digit",
	];

	const staticEntries = [
		{ path: "/", changefreq: "hourly", priority: "1.0", source: "src/routes/+page.svelte" },
		{ path: "/news", changefreq: "daily", priority: "0.85", source: "src/routes/news/+page.svelte" },
		{ path: "/guide", changefreq: "monthly", priority: "0.7", source: "src/routes/guide/+page.svelte" },
		{ path: "/history", changefreq: "weekly", priority: "0.8", source: "src/routes/history/+page.svelte" },
		{ path: "/qr-scan", changefreq: "monthly", priority: "0.5", source: "src/routes/qr-scan/+page.svelte" },
		{ path: "/generator", changefreq: "weekly", priority: "0.8", source: "src/routes/generator/+page.svelte" },
		{ path: "/stats", changefreq: "weekly", priority: "0.9", source: "src/routes/stats/+page.svelte" },
		{ path: "/stats/ac", changefreq: "weekly", priority: "0.6", source: "src/routes/stats/ac/+page.svelte" },
		{ path: "/stats/colors", changefreq: "weekly", priority: "0.6", source: "src/routes/stats/colors/+page.svelte" },
		{ path: "/stats/high-low", changefreq: "weekly", priority: "0.6", source: "src/routes/stats/high-low/+page.svelte" },
		{ path: "/stats/numbers", changefreq: "weekly", priority: "0.8", source: "src/routes/stats/numbers/+page.svelte" },
		{ path: "/stats/odd-even", changefreq: "weekly", priority: "0.6", source: "src/routes/stats/odd-even/+page.svelte" },
		{ path: "/stats/pairs", changefreq: "weekly", priority: "0.6", source: "src/routes/stats/pairs/+page.svelte" },
		{ path: "/stats/repeat", changefreq: "weekly", priority: "0.6", source: "src/routes/stats/repeat/+page.svelte" },
		{ path: "/stats/sections", changefreq: "weekly", priority: "0.6", source: "src/routes/stats/sections/+page.svelte" },
		{ path: "/stats/unit-digit", changefreq: "weekly", priority: "0.6", source: "src/routes/stats/unit-digit/+page.svelte" },
		{ path: "/winning-stores", changefreq: "weekly", priority: "0.7", source: "src/routes/winning-stores/+page.svelte" },
		{ path: "/privacy", changefreq: "monthly", priority: "0.4", source: "src/routes/privacy/+page.svelte" },
		{ path: "/terms-of-service", changefreq: "monthly", priority: "0.4", source: "src/routes/terms-of-service/+page.svelte" },
	];

	const recentEntries = recentStatsSections.flatMap((section) =>
		recentRoundPresets.map((rounds) => ({
			path: `/stats/${section}/recent/${rounds}`,
			changefreq: "weekly",
			priority: "0.5",
			source: `src/routes/stats/${section}/recent/[rounds]/+page.svelte`,
		})),
	);

	const numberEntries = Array.from({ length: 45 }, (_, index) => ({
		path: `/stats/numbers/${index + 1}`,
		changefreq: "weekly",
		priority: "0.7",
		source: "src/routes/stats/numbers/[number]/+page.svelte",
	}));

	const liveNumberEntries = Array.from({ length: 45 }, (_, index) => ({
		path: `/n/${index + 1}`,
		changefreq: "daily",
		priority: "0.8",
		source: "src/routes/n/[index]/+page.svelte",
	}));

	const newsEntries = newsFiles.map((item) => ({
		path: `/news/posts/${item.slug}`,
		changefreq: "weekly",
		priority: "0.75",
		lastmod:
			toYyyyMmDd(item.updatedAt || item.publishedAt || item.date) ||
			sourceFileLastMod(item.filePath),
		image: buildNewsOgPath(
			item.slug,
			item.updatedAt,
			item.publishedAt,
			item.date,
		),
		imageTitle: item.title || undefined,
	}));

	const entries = [...staticEntries, ...recentEntries, ...numberEntries, ...liveNumberEntries, ...newsEntries]
		.map((entry) => {
			const sourcePath = entry.source
				? path.join(WEB_ROOT, entry.source)
				: undefined;

			return {
				path: entry.path,
				changefreq: entry.changefreq,
				priority: entry.priority,
				lastmod: entry.lastmod || (sourcePath ? sourceFileLastMod(sourcePath) : undefined),
				image: entry.image,
				imageTitle: entry.imageTitle,
			};
		})
		.filter((entry, index, all) => all.findIndex((candidate) => candidate.path === entry.path) === index);

	return entries;
}
