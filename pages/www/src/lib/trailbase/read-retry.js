const transientStatuses = new Set([502, 503, 504]);
const transientCodes = new Set([
	"ECONNRESET",
	"ECONNREFUSED",
	"EPIPE",
	"ETIMEDOUT",
	"EAI_AGAIN",
	"UND_ERR_CONNECT_TIMEOUT",
	"UND_ERR_HEADERS_TIMEOUT",
	"UND_ERR_SOCKET",
	"ConnectionRefused",
	"ConnectionClosed",
]);

function isTransient(error) {
	return (
		transientStatuses.has(error?.status) ||
		transientCodes.has(error?.code) ||
		transientCodes.has(error?.cause?.code) ||
		(error instanceof TypeError && error.message === "fetch failed")
	);
}

function wait(ms, signal) {
	return new Promise((resolve, reject) => {
		signal.throwIfAborted();
		const onAbort = () => {
			clearTimeout(timer);
			reject(signal.reason);
		};
		const timer = setTimeout(() => {
			signal.removeEventListener("abort", onAbort);
			resolve(undefined);
		}, ms);
		signal.addEventListener("abort", onAbort, { once: true });
	});
}

/**
 * Retry a public, finite read during SSG, including a connection lost while
 * reading the body. Never use this for mutations or subscription streams.
 * @param {(signal: AbortSignal) => Promise<Response>} read
 * @param {{signal?: AbortSignal | null, maxAttempts?: number, attemptTimeoutMs?: number, budgetMs?: number, initialDelayMs?: number, onRetry?: (attempt: number, error: unknown) => void}} options
 */
export async function retryPublicRead(
	read,
	{
		signal,
		maxAttempts = 6,
		attemptTimeoutMs = 15_000,
		budgetMs = 60_000,
		initialDelayMs = 1_000,
		onRetry = () => {},
	} = {},
) {
	const budget = new AbortController();
	const timer = setTimeout(
		() =>
			budget.abort(
				new DOMException("Public read retry budget exceeded", "TimeoutError"),
			),
		budgetMs,
	);
	const overallSignal = signal
		? AbortSignal.any([signal, budget.signal])
		: budget.signal;
	try {
		for (let attempt = 1; ; attempt++) {
			overallSignal.throwIfAborted();
			const timeout = new AbortController();
			const timeoutId = setTimeout(
				() =>
					timeout.abort(
						new DOMException("Public read timed out", "TimeoutError"),
					),
				attemptTimeoutMs,
			);
			let failure;
			try {
				const response = await read(
					AbortSignal.any([overallSignal, timeout.signal]),
				);
				if (transientStatuses.has(response.status)) {
					await response.body?.cancel();
					throw Object.assign(
						new Error(`Public TrailBase read returned ${response.status}`),
						{ status: response.status },
					);
				}
				if (!response.ok) return response;
				const hasBody = response.body !== null;
				const body = await response.arrayBuffer();
				return new Response(hasBody ? body : null, {
					status: response.status,
					statusText: response.statusText,
					headers: response.headers,
				});
			} catch (error) {
				overallSignal.throwIfAborted();
				if (
					attempt >= maxAttempts ||
					(!timeout.signal.aborted && !isTransient(error))
				)
					throw error;
				failure = error;
			} finally {
				clearTimeout(timeoutId);
			}
			onRetry(attempt, failure);
			await wait(
				Math.min(initialDelayMs * 2 ** (attempt - 1), 10_000),
				overallSignal,
			);
		}
	} finally {
		clearTimeout(timer);
	}
}

/**
 * TrailBase 0.10 has no injectable fetch option. Decorate only this anonymous
 * client's public Record API reads; leave the SDK's HTTP errors intact.
 * @template {{fetch: (path: string, init?: RequestInit) => Promise<Response>}} T
 * @param {T} client
 * @param {Parameters<typeof retryPublicRead>[1]} options
 * @returns {T}
 */
export function withBuildReadRetries(client, options = {}) {
	const originalFetch = client.fetch.bind(client);
	client.fetch = (path, init) => {
		if (
			(init?.method ?? "GET").toUpperCase() !== "GET" ||
			init?.body != null ||
			!/^\/api\/records\/v1\/lotto_\w+(?:\/[^/?]+)?(?:\?.*)?$/.test(path)
		)
			return originalFetch(path, init);
		return retryPublicRead(
			(signal) => originalFetch(path, { ...init, signal }),
			{
				onRetry: (attempt) =>
					console.warn(
						`[ssg] Retrying ${path.split("?")[0]} after transient failure (retry ${attempt})`,
					),
				...options,
				signal: init?.signal,
			},
		);
	};
	return client;
}
