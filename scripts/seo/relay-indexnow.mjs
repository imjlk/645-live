const WORKER_ORIGIN = "https://indexnow-645-live.645.workers.dev";
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const SITE_ORIGIN = "https://645.live";

const relayToken = (process.env.INDEXNOW_RELAY_TOKEN || "").trim();
const indexNowKey = (process.env.INDEXNOW_KEY || "").trim();
const probeUrl = (process.env.INDEXNOW_PROBE_URL || "").trim();

function assertConfig() {
	if (!/^[A-Za-z0-9-]{8,128}$/.test(indexNowKey)) {
		throw new Error("INDEXNOW_KEY_INVALID");
	}
	if (relayToken.length < 32) throw new Error("INDEXNOW_RELAY_TOKEN_INVALID");
}

function canonicalSiteUrl(value) {
	const url = new URL(value);
	if (
		url.origin !== SITE_ORIGIN ||
		url.username !== "" ||
		url.password !== "" ||
		url.search !== "" ||
		url.hash !== ""
	) {
		throw new Error("INDEXNOW_RELAY_URL_INVALID");
	}
	return url.toString();
}

async function workerRequest(path, body) {
	const response = await fetch(new URL(path, WORKER_ORIGIN), {
		method: "POST",
		headers: {
			authorization: `Bearer ${relayToken}`,
			"content-type": "application/json; charset=utf-8",
		},
		body: JSON.stringify(body),
		signal: AbortSignal.timeout(20_000),
	});
	if (!response.ok) {
		throw new Error(`INDEXNOW_RELAY_WORKER_HTTP_${response.status}`);
	}
	return response.json();
}

function validateClaim(claim) {
	if (!claim || claim.outcome !== "claimed") return;
	if (
		claim.endpoint !== INDEXNOW_ENDPOINT ||
		claim.host !== new URL(SITE_ORIGIN).host ||
		claim.keyLocation !== `${SITE_ORIGIN}/${indexNowKey}.txt` ||
		typeof claim.claimId !== "string" ||
		!Array.isArray(claim.urlList) ||
		claim.urlList.length === 0 ||
		claim.urlList.length > 10_000
	) {
		throw new Error("INDEXNOW_RELAY_CLAIM_INVALID");
	}
	claim.urlList = [...new Set(claim.urlList.map(canonicalSiteUrl))];
}

async function submit(endpoint, host, keyLocation, urlList) {
	try {
		const response = await fetch(endpoint, {
			method: "POST",
			headers: { "content-type": "application/json; charset=utf-8" },
			body: JSON.stringify({ host, key: indexNowKey, keyLocation, urlList }),
			signal: AbortSignal.timeout(20_000),
		});
		return {
			retryAfter: response.headers.get("retry-after") || undefined,
			status: response.status,
		};
	} catch {
		return { status: 599 };
	}
}

async function settleWithRetry(settlement) {
	let lastError;
	for (const delay of [0, 1_000, 3_000, 5_000]) {
		if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
		try {
			return await workerRequest("/relay/settle", settlement);
		} catch (error) {
			lastError = error;
		}
	}
	throw lastError;
}

async function runProbe() {
	const url = canonicalSiteUrl(probeUrl);
	const result = await submit(
		INDEXNOW_ENDPOINT,
		new URL(SITE_ORIGIN).host,
		`${SITE_ORIGIN}/${indexNowKey}.txt`,
		[url],
	);
	console.log(`[indexnow-relay] probe status=${result.status}`);
	if (result.status !== 200 && result.status !== 202) {
		throw new Error(`INDEXNOW_PROBE_HTTP_${result.status}`);
	}
}

async function runRelay() {
	const claim = await workerRequest("/relay/claim", {});
	validateClaim(claim);
	if (claim.outcome !== "claimed") {
		console.log(`[indexnow-relay] outcome=${claim.outcome}`);
		return;
	}

	const provider = await submit(
		claim.endpoint,
		claim.host,
		claim.keyLocation,
		claim.urlList,
	);
	const settlement = await settleWithRetry({
		claimId: claim.claimId,
		retryAfter: provider.retryAfter,
		status: provider.status,
	});
	console.log(
		`[indexnow-relay] providerStatus=${provider.status} outcome=${settlement.outcome} urlCount=${claim.urlList.length}`,
	);
	if ([400, 403, 422].includes(provider.status)) {
		throw new Error(`INDEXNOW_PERMANENT_HTTP_${provider.status}`);
	}
}

assertConfig();
await (probeUrl ? runProbe() : runRelay());
