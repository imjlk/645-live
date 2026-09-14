import { afterEach, describe, expect, test } from "bun:test";
import type { Generation } from "@645/lotto-core";
import { createGenerationSession, IDENTITY_KEY } from "./api";
import { parseBatch, parseGenerations } from "./storage";

const originalFetch = globalThis.fetch;
afterEach(() => {
	globalThis.fetch = originalFetch;
});
function storage(): Storage {
	const values = new Map<string, string>();
	return {
		get length() {
			return values.size;
		},
		clear() {
			values.clear();
		},
		key(i) {
			return [...values.keys()][i] ?? null;
		},
		getItem: (k) => values.get(k) ?? null,
		setItem: (k, v) => {
			values.set(k, v);
		},
		removeItem: (k) => {
			values.delete(k);
		},
	};
}
const batch = {
	requestId: "same-request-0123456789",
	round: 1242,
	games: [[1, 2, 3, 4, 5, 6]],
};
const generation: Generation = {
	id: 12,
	round: 1242,
	numbers: [1, 2, 3, 4, 5, 6],
	displayName: "파랑공 테스트",
	createdAt: 1234,
};
const auth = (n: number) => ({
	authTokens: { authToken: `official-${n}`, csrfToken: `csrf-${n}` },
});
describe("independent web generation session", () => {
	test("concurrent writes share bootstrap and an auth retry keeps the exact batch", async () => {
		let bootstraps = 0;
		let writes = 0;
		const seen: RequestInit[] = [];
		globalThis.fetch = Object.assign(
			async (url: RequestInfo | URL, init?: RequestInit) => {
				expect(init?.credentials).toBe("omit");
				if (String(url).endsWith("/session"))
					return Response.json(auth(++bootstraps));
				seen.push(init ?? {});
				writes++;
				return writes === 1
					? Response.json(
							{ code: "AUTH_REQUIRED", message: "expired" },
							{ status: 401 },
						)
					: Response.json({ generations: [generation] });
			},
			{ preconnect: originalFetch.preconnect },
		);
		const store = storage();
		const session = createGenerationSession("https://trail.test", store);
		await session.publish(batch);
		expect(bootstraps).toBe(2);
		expect(seen.map((v) => JSON.parse(String(v.body)))).toEqual([batch, batch]);
		expect(new Headers(seen[1].headers).get("Authorization")).toBe(
			"Bearer official-2",
		);
		expect(store.length).toBe(1);
		expect(store.getItem(IDENTITY_KEY)).toMatch(/^[\w-]{43}$/);
		// Concurrent requests on a restored browser share one login task.
		const restored = createGenerationSession("https://trail.test", store);
		await Promise.all([restored.publish(batch), restored.publish(batch)]);
		expect(bootstraps).toBe(3);
	});
	test("reset prevents a late login response from publishing or restoring tokens", async () => {
		let release!: (value: Response) => void;
		let calls = 0;
		globalThis.fetch = Object.assign(
			async () => {
				calls++;
				return new Promise<Response>((resolve) => {
					release = resolve;
				});
			},
			{ preconnect: originalFetch.preconnect },
		);
		const session = createGenerationSession("https://trail.test", storage());
		const request = session.publish(batch);
		const outcome = request.then(
			() => "resolved",
			() => "rejected",
		);
		session.reset();
		release(Response.json(auth(1)));
		expect(await outcome).toBe("rejected");
		expect(calls).toBe(1);
	});
	test("unknown network outcome preserves identity for an idempotent retry", async () => {
		const store = storage();
		let firstKey = "";
		globalThis.fetch = Object.assign(
			async (_url: RequestInfo | URL, init?: RequestInit) => {
				firstKey ||= JSON.parse(String(init?.body)).installationKey;
				throw new TypeError("offline");
			},
			{ preconnect: originalFetch.preconnect },
		);
		const session = createGenerationSession("https://trail.test", store);
		await expect(session.publish(batch)).rejects.toThrow("다시 확인");
		expect(store.getItem(IDENTITY_KEY)).toBe(firstKey);
	});
	test("withdrawal removes only the web connection after server success", async () => {
		const store = storage();
		store.setItem("member-session", "untouched");
		globalThis.fetch = Object.assign(
			async (url: RequestInfo | URL) =>
				Response.json(
					String(url).endsWith("/session") ? auth(1) : { deleted: true },
				),
			{ preconnect: originalFetch.preconnect },
		);
		const session = createGenerationSession("https://trail.test", store);
		await session.publish(batch);
		await session.withdraw();
		expect(store.getItem(IDENTITY_KEY)).toBeNull();
		expect(store.getItem("member-session")).toBe("untouched");
	});
});
test("corrupt saved data is rejected, not silently replaced with an empty collection", () => {
	expect(parseGenerations(JSON.stringify([generation])).at(0)).toEqual(
		generation,
	);
	for (const raw of [
		"{}",
		"[null]",
		JSON.stringify([{ ...generation, numbers: [1, 1, 2, 3, 4, 5] }]),
		JSON.stringify([{ ...generation, id: -1 }]),
	])
		expect(() => parseGenerations(raw)).toThrow();
	expect(parseBatch(JSON.stringify(batch))).toEqual(batch);
	expect(() => parseBatch(JSON.stringify({ ...batch, games: [] }))).toThrow();
});
