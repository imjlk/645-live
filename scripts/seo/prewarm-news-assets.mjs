import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REPO_ROOT = process.cwd();
const NEWS_DIR = path.join(REPO_ROOT, "pages/www/src/content/news");

const SITE_BASE_URL = normalizeBaseUrl(
	process.env.SITE_BASE_URL || "https://645.live",
);
const CHANGED_NEWS_FILES = parseCsv(process.env.CHANGED_NEWS_FILES || "");
const PREWARM_MAX_NEWS = safePositiveInt(process.env.PREWARM_MAX_NEWS, 10);
const PREWARM_TIMEOUT_MS = safePositiveInt(process.env.PREWARM_TIMEOUT_MS, 15000);
const PREWARM_RETRY_ROUNDS = safePositiveInt(
	process.env.PREWARM_RETRY_ROUNDS,
	8,
);
const PREWARM_RETRY_DELAY_MS = safePositiveInt(
	process.env.PREWARM_RETRY_DELAY_MS,
	10000,
);
const PREWARM_USER_AGENT =
	process.env.PREWARM_USER_AGENT ||
	"Mozilla/5.0 (compatible; 645live-prewarm/1.0; +https://645.live)";
const NEWS_OG_CACHE_BUSTER =
	process.env.NEWS_OG_CACHE_BUSTER || "2026-03-24-3";

function normalizeBaseUrl(raw) {
	try {
		const url = new URL(raw);
		url.pathname = "";
		return url.toString().replace(/\/+$/, "");
	} catch {
		return "https://645.live";
	}
}

function parseCsv(raw) {
	return String(raw)
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

function safePositiveInt(value, fallback) {
	const parsed = Number.parseInt(String(value ?? ""), 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function extractSlug(filePath) {
	const fileName = path.basename(filePath);
	if (!fileName.endsWith(".mdx")) return null;
	return fileName.slice(0, -4);
}

function dedupe(values) {
	return Array.from(new Set(values.filter(Boolean)));
}

function extractRound(slug) {
	const match = String(slug).match(/(\d{3,5})/);
	if (!match) return 0;
	return Number.parseInt(match[1], 10);
}

async function listRecentNewsSlugs(limit = 10) {
	try {
		const entries = await fs.readdir(NEWS_DIR, { withFileTypes: true });
		return entries
			.filter((entry) => entry.isFile() && entry.name.endsWith(".mdx"))
			.map((entry) => entry.name.slice(0, -4))
			.sort(
				(left, right) =>
					extractRound(right) - extractRound(left) ||
					right.localeCompare(left, "ko-KR", { numeric: true }),
			)
			.slice(0, limit);
	} catch {
		return [];
	}
}

async function readNewsVersion(slug) {
	const filePath = path.join(NEWS_DIR, `${slug}.mdx`);
	try {
		const source = await fs.readFile(filePath, "utf8");
		const updatedAt =
			source.match(/^updatedAt:\s*["']?([^"'\n]+)["']?/m)?.[1] || undefined;
		const date = source.match(/^date:\s*["']?([^"'\n]+)["']?/m)?.[1] || undefined;
		return updatedAt || date || undefined;
	} catch {
		return undefined;
	}
}

function newsPostUrl(slug) {
	return `${SITE_BASE_URL}/news/posts/${encodeURIComponent(slug)}`;
}

function newsOgUrl(slug, version) {
	const params = new URLSearchParams();
	params.set("rev", NEWS_OG_CACHE_BUSTER);
	if (version) {
		params.set("v", version);
	}
	const query = params.toString();
	return `${SITE_BASE_URL}/og/news/${encodeURIComponent(slug)}${query ? `?${query}` : ""}`;
}

async function buildPrewarmTargets() {
	const changedSlugs = dedupe(CHANGED_NEWS_FILES.map(extractSlug));
	const fallbackSlugs =
		changedSlugs.length > 0 ? [] : await listRecentNewsSlugs(PREWARM_MAX_NEWS);
	const newsSlugs = dedupe([...changedSlugs, ...fallbackSlugs]).slice(
		0,
		PREWARM_MAX_NEWS,
	);

	const versions = await Promise.all(
		newsSlugs.map(async (slug) => [slug, await readNewsVersion(slug)]),
	);
	const versionMap = new Map(versions);

	const urls = dedupe([
		`${SITE_BASE_URL}/news`,
		`${SITE_BASE_URL}/feed.xml`,
		`${SITE_BASE_URL}/sitemap.xml`,
		...newsSlugs.map(newsPostUrl),
		...newsSlugs.map((slug) => newsOgUrl(slug, versionMap.get(slug))),
	]);

	return { newsSlugs, urls };
}

async function fetchWithTimeout(url) {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), PREWARM_TIMEOUT_MS);

	try {
		const response = await fetch(url, {
			method: "GET",
			headers: {
				"user-agent": PREWARM_USER_AGENT,
				accept: "text/html,application/xhtml+xml,application/xml,image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
			},
			signal: controller.signal,
		});
		await response.arrayBuffer();
		return {
			ok: response.ok,
			status: response.status,
			contentType: response.headers.get("content-type") || "",
		};
	} catch (error) {
		return {
			ok: false,
			status: 0,
			contentType: "",
			error: error?.name || error?.message || String(error),
		};
	} finally {
		clearTimeout(timeoutId);
	}
}

function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

async function main() {
	const { newsSlugs, urls } = await buildPrewarmTargets();

	if (urls.length === 0) {
		console.log("[prewarm] skip: no URLs to prewarm.");
		return;
	}

	console.log(
		`[prewarm] start targets=${urls.length} news_slugs=${newsSlugs.join(",") || "none"}`,
	);

	let successCount = 0;
	let pendingUrls = [...urls];
	const failedResults = new Map();

	for (let attempt = 1; attempt <= PREWARM_RETRY_ROUNDS; attempt += 1) {
		if (pendingUrls.length === 0) break;

		console.log(
			`[prewarm] attempt=${attempt}/${PREWARM_RETRY_ROUNDS} pending=${pendingUrls.length}`,
		);

		const nextPending = [];
		for (const [index, url] of pendingUrls.entries()) {
			const result = await fetchWithTimeout(url);
			if (result.ok) {
				successCount += 1;
				failedResults.delete(url);
				console.log(
					`[prewarm] ok attempt=${attempt} ${index + 1}/${pendingUrls.length} status=${result.status} type=${result.contentType} url=${url}`,
				);
				continue;
			}

			failedResults.set(url, result);
			nextPending.push(url);
			console.warn(
				`[prewarm] failed attempt=${attempt} ${index + 1}/${pendingUrls.length} status=${result.status} reason=${result.error || result.contentType || "unknown"} url=${url}`,
			);
		}

		pendingUrls = nextPending;
		if (pendingUrls.length === 0 || attempt >= PREWARM_RETRY_ROUNDS) {
			break;
		}

		console.log(
			`[prewarm] retry_wait_ms=${PREWARM_RETRY_DELAY_MS} remaining=${pendingUrls.length}`,
		);
		await sleep(PREWARM_RETRY_DELAY_MS);
	}

	const failCount = pendingUrls.length;
	console.log(
		`[prewarm] summary total=${urls.length} success=${successCount} failed=${failCount}`,
	);

	if (pendingUrls.length > 0) {
		console.warn(`[prewarm] failed_urls=${pendingUrls.join(",")}`);
		for (const url of pendingUrls) {
			const result = failedResults.get(url);
			if (!result) continue;
			console.warn(
				`[prewarm] final_failure status=${result.status} reason=${result.error || result.contentType || "unknown"} url=${url}`,
			);
		}
	}
}

main().catch((error) => {
	console.warn(`[prewarm] unexpected error=${error?.message || error}`);
	process.exitCode = 0;
});
