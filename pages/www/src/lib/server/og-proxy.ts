const PUBLIC_OG_WORKER_ORIGIN = "https://og-645-live.645.workers.dev";
const SERVICE_BINDING_RETRY_DELAY_MS = 120;

export const PAGES_OG_PROXY_VERSION = "2026-03-25-3";

export type OgUpstreamMode = "binding" | "public";
export type OgWorkerBinding = Pick<Env["OG_645_LIVE"], "fetch">;

export function applyPagesOgProxyHeaders(headers: Headers) {
	headers.set("X-Pages-OG-Proxy-Version", PAGES_OG_PROXY_VERSION);
}

async function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPublicWorkerUrl(ogUrl: URL): URL {
	const publicUrl = new URL(ogUrl.toString());
	publicUrl.protocol = "https:";
	publicUrl.host = PUBLIC_OG_WORKER_ORIGIN.replace(/^https?:\/\//, "");
	return publicUrl;
}

export async function fetchOgUpstream(
	binding: OgWorkerBinding,
	ogUrl: URL,
	options?: {
		sleepFn?: (ms: number) => Promise<unknown>;
		fetchFn?: typeof fetch;
		retryDelayMs?: number;
	},
): Promise<{ response: Response; upstream: OgUpstreamMode } | null> {
	const sleepFn = options?.sleepFn ?? sleep;
	const fetchFn = options?.fetchFn ?? fetch;
	const retryDelayMs = options?.retryDelayMs ?? SERVICE_BINDING_RETRY_DELAY_MS;
	let lastResponse: Response | null = null;
	let lastError: unknown = null;

	for (let attempt = 0; attempt < 2; attempt += 1) {
		try {
			const response = await binding.fetch(new Request(ogUrl.toString()));
			if (response.ok) {
				return { response, upstream: "binding" };
			}

			lastResponse = response;
			console.warn("OG service binding returned non-ok response", {
				status: response.status,
				url: ogUrl.toString(),
				attempt: attempt + 1,
			});
		} catch (error) {
			lastError = error;
			console.warn("OG service binding request failed", {
				url: ogUrl.toString(),
				attempt: attempt + 1,
				error,
			});
		}

		if (attempt === 0) {
			await sleepFn(retryDelayMs);
		}
	}

	const publicUrl = buildPublicWorkerUrl(ogUrl);

	try {
		const response = await fetchFn(publicUrl.toString());
		if (response.ok) {
			console.warn("OG proxy fell back to public worker", {
				url: publicUrl.toString(),
			});
			return { response, upstream: "public" };
		}

		lastResponse = response;
		console.warn("Public OG worker returned non-ok response", {
			status: response.status,
			url: publicUrl.toString(),
		});
	} catch (error) {
		lastError = error;
		console.error("Public OG worker request failed", {
			url: publicUrl.toString(),
			error,
		});
	}

	if (lastResponse) {
		return { response: lastResponse, upstream: "binding" };
	}

	if (lastError) {
		throw lastError;
	}

	return null;
}

export function createUnavailableOgResponse() {
	const headers = new Headers({
		"Cache-Control": "no-store",
	});
	applyPagesOgProxyHeaders(headers);

	return new Response("OG service unavailable", {
		status: 503,
		headers,
	});
}

export async function createProxiedImageResponse(
	upstream: Response,
	upstreamMode: OgUpstreamMode,
	fallbackContentType = "image/png",
) {
	const headers = new Headers();

	for (const name of [
		"content-type",
		"cache-control",
		"etag",
		"last-modified",
		"x-og-cache-key",
		"x-og-source",
		"x-cache",
	]) {
		const value = upstream.headers.get(name);
		if (value) {
			headers.set(name, value);
		}
	}

	if (!headers.get("content-type")) {
		headers.set("content-type", fallbackContentType);
	}

	const upstreamCacheControl = headers.get("cache-control");
	if (upstreamCacheControl) {
		headers.set("CDN-Cache-Control", upstreamCacheControl);
		headers.set("Cloudflare-CDN-Cache-Control", upstreamCacheControl);
	}

	const body = await upstream.arrayBuffer();
	headers.set("content-length", String(body.byteLength));
	applyPagesOgProxyHeaders(headers);
	headers.set("X-Pages-OG-Upstream", upstreamMode);

	return new Response(body, {
		status: upstream.status,
		headers,
	});
}
