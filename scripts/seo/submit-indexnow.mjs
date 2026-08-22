import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const REPO_ROOT = process.cwd();
const NEWS_DIR = path.join(REPO_ROOT, 'pages/www/src/content/news');

const SITE_BASE_URL = normalizeBaseUrl(process.env.SITE_BASE_URL || 'https://645.live');
const CHANGED_NEWS_FILES = parseCsv(process.env.CHANGED_NEWS_FILES || '');

const INDEXNOW_ENDPOINT = (process.env.INDEXNOW_ENDPOINT || 'https://api.indexnow.org/indexnow').replace(/\/+$/, '');
const INDEXNOW_HOST = (process.env.INDEXNOW_HOST || new URL(SITE_BASE_URL).host).trim();
const INDEXNOW_KEY = (process.env.INDEXNOW_KEY || '').trim();
const INDEXNOW_KEY_LOCATION = (
	process.env.INDEXNOW_KEY_LOCATION || (INDEXNOW_KEY ? `${SITE_BASE_URL}/${INDEXNOW_KEY}.txt` : '')
).trim();
const INDEXNOW_MAX_URLS = safePositiveInt(process.env.INDEXNOW_MAX_URLS, 100);
const INDEXNOW_ENABLED = parseBool(process.env.INDEXNOW_ENABLED, true);

const GOOGLE_INDEXING_ENABLED = parseBool(process.env.GOOGLE_INDEXING_ENABLED, true);
const GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON = process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON || '';
const GOOGLE_INDEXING_NOTIFY_TYPE = String(process.env.GOOGLE_INDEXING_NOTIFY_TYPE || 'URL_UPDATED').toUpperCase() === 'URL_DELETED'
	? 'URL_DELETED'
	: 'URL_UPDATED';
const GOOGLE_INDEXING_ENDPOINT = (process.env.GOOGLE_INDEXING_ENDPOINT || 'https://indexing.googleapis.com/v3/urlNotifications:publish').replace(/\/+$/, '');
const GOOGLE_OAUTH_TOKEN_ENDPOINT = (process.env.GOOGLE_OAUTH_TOKEN_ENDPOINT || 'https://oauth2.googleapis.com/token').replace(/\/+$/, '');
const GOOGLE_INDEXING_SCOPE = 'https://www.googleapis.com/auth/indexing';
const GOOGLE_INDEXING_MAX_URLS = safePositiveInt(process.env.GOOGLE_INDEXING_MAX_URLS, 20);

const NAVER_SUBMIT_ENABLED = parseBool(process.env.NAVER_SUBMIT_ENABLED, true);
const NAVER_SEARCHADVISOR_ACCESS_TOKEN = (process.env.NAVER_SEARCHADVISOR_ACCESS_TOKEN || '').trim();
const NAVER_CRAWL_REQUEST_ENDPOINT = (process.env.NAVER_CRAWL_REQUEST_ENDPOINT || 'https://apis.naver.com/searchadvisor/crawl-request/submit.json').replace(/\/+$/, '');
const NAVER_MAX_URLS = safePositiveInt(process.env.NAVER_MAX_URLS, 100);

function parseBool(value, fallback = false) {
	if (value === undefined || value === null || value === '') return fallback;
	if (typeof value === 'boolean') return value;
	return /^(1|true|yes|on)$/i.test(String(value));
}

function safePositiveInt(value, fallback) {
	const parsed = Number.parseInt(String(value ?? ''), 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeBaseUrl(raw) {
	try {
		const url = new URL(raw);
		url.pathname = '';
		return url.toString().replace(/\/+$/, '');
	} catch {
		return 'https://645.live';
	}
}

function parseCsv(raw) {
	return String(raw)
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
}

function safePreview(text, max = 400) {
	return String(text || '').trim().slice(0, max);
}

function extractSlug(filePath) {
	const fileName = path.basename(filePath);
	if (!fileName.endsWith('.mdx')) return null;
	return fileName.slice(0, -4);
}

function extractRound(slug) {
	const match = String(slug).match(/(\d{3,5})/);
	if (!match) return 0;
	return Number.parseInt(match[1], 10);
}

function newsPostUrl(slug) {
	return `${SITE_BASE_URL}/news/posts/${encodeURIComponent(slug)}`;
}

function dedupe(values) {
	return Array.from(new Set(values.filter(Boolean)));
}

async function listRecentNewsSlugs(limit = 20) {
	try {
		const entries = await fs.readdir(NEWS_DIR, { withFileTypes: true });
		return entries
			.filter((entry) => entry.isFile() && entry.name.endsWith('.mdx'))
			.map((entry) => entry.name.slice(0, -4))
			.sort((left, right) => extractRound(right) - extractRound(left) || right.localeCompare(left, 'ko-KR', { numeric: true }))
			.slice(0, limit);
	} catch {
		return [];
	}
}

async function buildUrlTargets() {
	const changedSlugs = dedupe(CHANGED_NEWS_FILES.map(extractSlug));
	const fallbackSlugs = changedSlugs.length > 0 ? [] : await listRecentNewsSlugs(20);
	const newsSlugs = dedupe([...changedSlugs, ...fallbackSlugs]);
	const newsUrls = newsSlugs.map(newsPostUrl);

	const indexNowUrls = dedupe([
		`${SITE_BASE_URL}/`,
		`${SITE_BASE_URL}/news`,
		`${SITE_BASE_URL}/sitemap.xml`,
		...newsUrls
	]).slice(0, INDEXNOW_MAX_URLS);

	const googleUrls = dedupe([
		`${SITE_BASE_URL}/news`,
		...newsUrls
	]).slice(0, GOOGLE_INDEXING_MAX_URLS);

	const naverUrls = dedupe([
		`${SITE_BASE_URL}/news`,
		...newsUrls
	]).slice(0, NAVER_MAX_URLS);

	return { indexNowUrls, googleUrls, naverUrls };
}

async function submitIndexNow(urlList) {
	if (!INDEXNOW_ENABLED) {
		console.log('[indexnow] skip: batched Cloudflare delivery is enabled.');
		return;
	}
	if (!INDEXNOW_KEY) {
		console.log('[indexnow] skip: INDEXNOW_KEY is not configured.');
		return;
	}
	if (!INDEXNOW_KEY_LOCATION) {
		console.log('[indexnow] skip: INDEXNOW_KEY_LOCATION is not configured.');
		return;
	}
	if (urlList.length === 0) {
		console.log('[indexnow] skip: no URLs to submit.');
		return;
	}

	const payload = {
		host: INDEXNOW_HOST,
		key: INDEXNOW_KEY,
		keyLocation: INDEXNOW_KEY_LOCATION,
		urlList
	};

	const response = await fetch(INDEXNOW_ENDPOINT, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(payload)
	});
	const bodyText = await response.text();

	if (!response.ok) {
		console.warn(`[indexnow] failed status=${response.status} body=${safePreview(bodyText)}`);
		return;
	}

	console.log(`[indexnow] submitted urls=${urlList.length} status=${response.status}`);
	if (bodyText.trim()) {
		console.log(`[indexnow] response=${safePreview(bodyText)}`);
	}
}

function parseGoogleServiceAccount(raw) {
	const source = String(raw || '').trim();
	if (!source) return null;
	const candidates = [source];

	try {
		candidates.push(Buffer.from(source, 'base64').toString('utf8'));
	} catch {
		// ignore
	}

	for (const candidate of candidates) {
		try {
			const json = JSON.parse(candidate);
			if (json?.client_email && json?.private_key) return json;
		} catch {
			// ignore
		}
	}

	return null;
}

function base64UrlJson(value) {
	return Buffer.from(JSON.stringify(value)).toString('base64url');
}

async function createGoogleAccessToken(serviceAccount) {
	const now = Math.floor(Date.now() / 1000);
	const header = { alg: 'RS256', typ: 'JWT' };
	const claim = {
		iss: serviceAccount.client_email,
		scope: GOOGLE_INDEXING_SCOPE,
		aud: GOOGLE_OAUTH_TOKEN_ENDPOINT,
		iat: now,
		exp: now + 3600
	};

	const unsigned = `${base64UrlJson(header)}.${base64UrlJson(claim)}`;
	const signer = crypto.createSign('RSA-SHA256');
	signer.update(unsigned);
	signer.end();
	const signature = signer.sign(serviceAccount.private_key, 'base64url');
	const assertion = `${unsigned}.${signature}`;

	const body = new URLSearchParams({
		grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
		assertion
	});

	const response = await fetch(GOOGLE_OAUTH_TOKEN_ENDPOINT, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: body.toString()
	});
	const text = await response.text();

	if (!response.ok) {
		console.warn(`[google-indexing] token fetch failed status=${response.status} body=${safePreview(text)}`);
		return null;
	}

	try {
		const parsed = JSON.parse(text);
		return parsed.access_token || null;
	} catch {
		console.warn(`[google-indexing] token parse failed body=${safePreview(text)}`);
		return null;
	}
}

async function submitGoogleIndexing(urlList) {
	if (!GOOGLE_INDEXING_ENABLED) {
		console.log('[google-indexing] skip: GOOGLE_INDEXING_ENABLED=false');
		return;
	}
	if (urlList.length === 0) {
		console.log('[google-indexing] skip: no URLs to submit.');
		return;
	}

	const serviceAccount = parseGoogleServiceAccount(GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON);
	if (!serviceAccount) {
		console.log('[google-indexing] skip: GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON is not configured.');
		return;
	}

	console.warn('[google-indexing] note: Google 공식 지원 범위는 JobPosting/BroadcastEvent URL입니다.');
	const accessToken = await createGoogleAccessToken(serviceAccount);
	if (!accessToken) {
		console.warn('[google-indexing] skip: failed to get access token.');
		return;
	}

	let successCount = 0;
	let failedCount = 0;
	for (const url of urlList) {
		const response = await fetch(GOOGLE_INDEXING_ENDPOINT, {
			method: 'POST',
			headers: {
				authorization: `Bearer ${accessToken}`,
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				url,
				type: GOOGLE_INDEXING_NOTIFY_TYPE
			})
		});
		const text = await response.text();
		if (!response.ok) {
			failedCount += 1;
			console.warn(`[google-indexing] failed url=${url} status=${response.status} body=${safePreview(text)}`);
			continue;
		}
		successCount += 1;
	}

	console.log(`[google-indexing] done success=${successCount} failed=${failedCount}`);
}

async function submitNaverCrawlRequest(urlList) {
	if (!NAVER_SUBMIT_ENABLED) {
		console.log('[naver-submit] skip: NAVER_SUBMIT_ENABLED=false');
		return;
	}
	if (!NAVER_SEARCHADVISOR_ACCESS_TOKEN) {
		console.log('[naver-submit] skip: NAVER_SEARCHADVISOR_ACCESS_TOKEN is not configured.');
		return;
	}
	if (urlList.length === 0) {
		console.log('[naver-submit] skip: no URLs to submit.');
		return;
	}

	const payload = {
		urls: urlList.map((url) => ({ url, type: 'update' }))
	};

	const response = await fetch(NAVER_CRAWL_REQUEST_ENDPOINT, {
		method: 'POST',
		headers: {
			authorization: `Bearer ${NAVER_SEARCHADVISOR_ACCESS_TOKEN}`,
			'content-type': 'application/json'
		},
		body: JSON.stringify(payload)
	});
	const text = await response.text();

	if (!response.ok) {
		console.warn(`[naver-submit] failed status=${response.status} body=${safePreview(text)}`);
		return;
	}

	console.log(`[naver-submit] submitted urls=${urlList.length} status=${response.status}`);
	if (text.trim()) {
		console.log(`[naver-submit] response=${safePreview(text)}`);
	}
}

async function main() {
	const targets = await buildUrlTargets();
	console.log(
		`[search-submit] prepared indexnow=${targets.indexNowUrls.length} google=${targets.googleUrls.length} naver=${targets.naverUrls.length}`
	);
	await submitIndexNow(targets.indexNowUrls);
	await submitGoogleIndexing(targets.googleUrls);
	await submitNaverCrawlRequest(targets.naverUrls);
}

main().catch((error) => {
	console.warn(`[search-submit] unexpected error: ${error?.message || error}`);
	process.exitCode = 0;
});
