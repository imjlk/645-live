import type { Generation } from "@645/lotto-core";

export const IDENTITY_KEY = "645:generator:identity:v1";
export class GenerationApiError extends Error {
	constructor(
		public code: string,
		message: string,
		public status = 0,
	) {
		super(message);
	}
}
export async function readJson<T>(
	url: string,
	init: RequestInit = {},
): Promise<T> {
	const controller = new AbortController();
	const abort = () => controller.abort();
	if (init.signal?.aborted) abort();
	init.signal?.addEventListener("abort", abort, { once: true });
	const timer = setTimeout(abort, 15000);
	try {
		const response = await fetch(url, {
			...init,
			signal: controller.signal,
			credentials: "omit",
			cache: "no-store",
		});
		const data = await response.json().catch(() => null);
		if (!response.ok || !data) {
			const outer =
				data && typeof data === "object"
					? (data as Record<string, unknown>)
					: {};
			const details =
				outer.error && typeof outer.error === "object"
					? (outer.error as Record<string, unknown>)
					: outer;
			throw new GenerationApiError(
				typeof details.code === "string" ? details.code : "CONNECTION_ERROR",
				typeof details.message === "string"
					? details.message
					: "연결이 원활하지 않아요. 잠시 후 다시 시도해 주세요.",
				response.status,
			);
		}
		return data as T;
	} catch (error) {
		if (error instanceof GenerationApiError) throw error;
		throw new GenerationApiError(
			"CONNECTION_ERROR",
			"연결이 원활하지 않아요. 같은 요청으로 다시 확인해 주세요.",
		);
	} finally {
		clearTimeout(timer);
		init.signal?.removeEventListener("abort", abort);
	}
}
export type Batch = { requestId: string; round: number; games: number[][] };
// The browser keeps only its independent installation credential. Official TrailBase
// tokens stay in memory and never touch the website member's cookie or SDK session.
export function createGenerationSession(base: string, storage: Storage) {
	let tokens: { authToken: string; csrfToken: string } | null = null;
	let pending: Promise<void> | null = null;
	let controller = new AbortController();
	let epoch = 0;
	function identity() {
		const saved = storage.getItem(IDENTITY_KEY);
		if (saved) {
			if (!/^[A-Za-z0-9_-]{43}$/.test(saved))
				throw new Error(
					"연결 정보가 손상됐어요. 사이트 데이터를 지우기 전에 보관함을 백업해 주세요.",
				);
			return saved;
		}
		const key = btoa(
			String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))),
		)
			.replaceAll("+", "-")
			.replaceAll("/", "_")
			.replaceAll("=", "");
		storage.setItem(IDENTITY_KEY, key);
		return key;
	}
	function reset() {
		epoch++;
		controller.abort();
		controller = new AbortController();
		pending = null;
		tokens = null;
	}
	async function connect() {
		if (tokens) return;
		if (pending) return pending;
		const current = epoch;
		const task = readJson<{ authTokens: NonNullable<typeof tokens> }>(
			`${base}/api/web/v1/lotto/session`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ installationKey: identity() }),
				signal: controller.signal,
			},
		).then((data) => {
			if (current !== epoch)
				throw new Error("연결 정보가 바뀌었어요. 다시 시도해 주세요.");
			tokens = data.authTokens;
		});
		pending = task;
		try {
			await task;
		} finally {
			if (pending === task) pending = null;
		}
	}
	async function post<T>(
		path: string,
		body: unknown,
		retry = true,
	): Promise<T> {
		const current = epoch;
		await connect();
		if (current !== epoch || !tokens)
			throw new Error("연결이 변경됐어요. 다시 시도해 주세요.");
		try {
			const data = await readJson<T>(`${base}/api/web/v1/lotto/${path}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${tokens.authToken}`,
					"CSRF-Token": tokens.csrfToken,
				},
				body: JSON.stringify(body),
				signal: controller.signal,
			});
			if (current !== epoch)
				throw new Error("연결이 변경됐어요. 다시 시도해 주세요.");
			return data;
		} catch (error) {
			if (
				current === epoch &&
				retry &&
				error instanceof GenerationApiError &&
				error.status === 401
			) {
				tokens = null;
				return post<T>(path, body, false);
			}
			throw error;
		}
	}
	return {
		reset,
		publish: (batch: Batch) =>
			post<{ generations: Generation[] }>("generations", batch),
		remove: (id: number) =>
			post<{ deleted: boolean }>("generations/delete", { id }),
		heartbeat: () =>
			storage.getItem(IDENTITY_KEY)
				? post("heartbeat", {})
				: Promise.resolve(null),
		async withdraw() {
			if (!storage.getItem(IDENTITY_KEY)) return;
			const key = storage.getItem(IDENTITY_KEY);
			await post("withdraw", {});
			if (storage.getItem(IDENTITY_KEY) === key)
				storage.removeItem(IDENTITY_KEY);
			reset();
		},
	};
}
