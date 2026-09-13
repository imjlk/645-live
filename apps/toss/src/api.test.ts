import { afterEach, expect, mock, test } from "bun:test";

const originalFetch = globalThis.fetch;
const kit = await import("@trailbase-apps-in-toss-kit/trailbase-client");
let fetchPath: (path: string) => Promise<Response>;
let bootstrapCount = 0;
const json = (value: unknown, status = 200) =>
	new Response(JSON.stringify(value), { status });

mock.module("@apps-in-toss/framework", () => ({
	Storage: {},
	getAnonymousKey: async () => "fixture",
}));
mock.module("@trailbase-apps-in-toss-kit/ait-rn/storage", () => ({
	createAppsInTossSessionStorage: () => ({
		storage: { getItem: () => null, setItem: () => {} },
	}),
}));
mock.module("@trailbase-apps-in-toss-kit/trailbase-client", () => ({
	...kit,
	createAppsInTossSessionManager: (options: {
		bootstrap: (key: string) => Promise<unknown>;
	}) => ({
		getOrCreateAppSession: () => options.bootstrap("ait:fixture-identity"),
		clearSessions: async () => {},
		cancelPendingOperations: () => {},
	}),
}));
mock.module("trailbase", () => ({
	initClient: () => ({ fetch: (path: string) => fetchPath(path) }),
}));
const { createApi } = await import("./api");
afterEach(() => {
	globalThis.fetch = originalFetch;
});

test("a late heartbeat 401 cannot recreate a withdrawn identity", async () => {
	bootstrapCount = 0;
	globalThis.fetch = (async () => {
		bootstrapCount += 1;
		return json({
			user: { id: "fixture-user", displayName: "노랑공" },
			authTokens: {
				authToken: "fixture",
				refreshToken: "refresh",
				csrfToken: "csrf",
			},
		});
	}) as typeof fetch;
	let release!: (value: Response) => void;
	let started!: () => void;
	const entered = new Promise<void>((resolve) => {
		started = resolve;
	});
	fetchPath = async (path) => {
		if (path.endsWith("heartbeat")) {
			started();
			return new Promise<Response>((resolve) => {
				release = resolve;
			});
		}
		return json({ deleted: true });
	};
	const api = createApi();
	await api.ensure();
	const heartbeat = api.heartbeat().then(
		() => null,
		(error) => error,
	);
	await entered;
	await api.withdraw();
	release(json({ error: { code: "AUTH_REQUIRED" } }, 401));
	expect(await heartbeat).toBeInstanceOf(Error);
	expect(bootstrapCount).toBe(1);
	await expect(api.ensure()).rejects.toThrow("연결 요청을 중단");
	api.reconnect();
	await api.ensure();
	expect(bootstrapCount).toBe(2);
	api.dispose();
});
