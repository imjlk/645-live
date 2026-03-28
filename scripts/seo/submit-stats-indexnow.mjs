import process from "node:process";

const SITE_BASE_URL = normalizeBaseUrl(
	process.env.SITE_BASE_URL || "https://645.live",
);
const INDEXNOW_ENDPOINT = (
	process.env.INDEXNOW_ENDPOINT || "https://api.indexnow.org/indexnow"
).replace(/\/+$/, "");
const INDEXNOW_HOST = (
	process.env.INDEXNOW_HOST || new URL(SITE_BASE_URL).host
).trim();
const INDEXNOW_KEY = (process.env.INDEXNOW_KEY || "").trim();
const INDEXNOW_KEY_LOCATION = (
	process.env.INDEXNOW_KEY_LOCATION ||
	(INDEXNOW_KEY ? `${SITE_BASE_URL}/${INDEXNOW_KEY}.txt` : "")
).trim();

function normalizeBaseUrl(raw) {
	try {
		const url = new URL(raw);
		url.pathname = "";
		return url.toString().replace(/\/+$/, "");
	} catch {
		return "https://645.live";
	}
}

function dedupe(values) {
	return Array.from(new Set(values.filter(Boolean)));
}

async function submitIndexNow(urlList) {
	if (!INDEXNOW_KEY) {
		console.log("[stats-indexnow] skip: INDEXNOW_KEY is not configured.");
		return;
	}

	const payload = {
		host: INDEXNOW_HOST,
		key: INDEXNOW_KEY,
		keyLocation: INDEXNOW_KEY_LOCATION,
		urlList,
	};

	const response = await fetch(INDEXNOW_ENDPOINT, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(payload),
	});

	const bodyText = await response.text();
	if (!response.ok) {
		throw new Error(
			`IndexNow submit failed status=${response.status} body=${bodyText.slice(0, 400)}`,
		);
	}

	console.log(
		`[stats-indexnow] submitted ${urlList.length} urls status=${response.status}`,
	);
}

async function main() {
	const urls = dedupe([
		`${SITE_BASE_URL}/stats`,
		`${SITE_BASE_URL}/guide`,
		`${SITE_BASE_URL}/stats/bonus`,
		`${SITE_BASE_URL}/stats/numbers`,
		`${SITE_BASE_URL}/stats/ac`,
		`${SITE_BASE_URL}/stats/odd-even`,
		`${SITE_BASE_URL}/stats/high-low`,
		`${SITE_BASE_URL}/stats/colors`,
		`${SITE_BASE_URL}/stats/sections`,
		`${SITE_BASE_URL}/stats/pairs`,
		`${SITE_BASE_URL}/stats/repeat`,
		`${SITE_BASE_URL}/stats/unit-digit`,
		`${SITE_BASE_URL}/stats-sitemap.xml`,
	]);

	await submitIndexNow(urls);
}

main().catch((error) => {
	console.error("[stats-indexnow] failed", error);
	process.exitCode = 1;
});
