import { afterEach, expect, mock, test } from "bun:test";

const originalFetch = globalThis.fetch;
const kit = await import("@trailbase-apps-in-toss-kit/trailbase-client");
let fetchPath: (path: string) => Promise<Response>;
let bootstrapCount = 0;
let adEnvironment = "toss";
let adLoadFails = false;
let adShowCount = 0;
let sessionFailure: Error | null = null;
const adEvents = [
	"requested",
	"show",
	"impression",
	"userEarnedReward",
	"dismissed",
];
type AdCallbacks = {
	onEvent: (event: { type: string }) => void;
	onError: (error: unknown) => void;
};
const json = (value: unknown, status = 200) =>
	new Response(JSON.stringify(value), { status });

mock.module("@apps-in-toss/framework", () => ({
	Storage: {},
	getAnonymousKey: async () => "fixture",
	getOperationalEnvironment: () => adEnvironment,
	loadFullScreenAd: Object.assign(
		({ onEvent, onError }: AdCallbacks) => {
			queueMicrotask(() =>
				adLoadFails
					? onError(new Error("no fill"))
					: onEvent({ type: "loaded" }),
			);
			return () => {};
		},
		{ isSupported: () => true },
	),
	showFullScreenAd: Object.assign(
		({ onEvent }: AdCallbacks) => {
			adShowCount += 1;
			queueMicrotask(() => {
				for (const type of adEvents) onEvent({ type });
			});
			return () => {};
		},
		{ isSupported: () => true },
	),
	requestNotificationAgreement: () => {},
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
		getOrCreateAppSession: () => {
			if (sessionFailure) throw sessionFailure;
			return options.bootstrap("ait:fixture-identity");
		},
		clearSessions: async () => {},
		cancelPendingOperations: () => {},
	}),
}));
mock.module("trailbase", () => ({
	initClient: () => ({ fetch: (path: string) => fetchPath(path) }),
}));
const { createApi } = await import("./api");
const { createAdController } = await import("./ad-bridge");
type AdApi = Parameters<typeof createAdController>[0];
afterEach(() => {
	globalThis.fetch = originalFetch;
	adEnvironment = "toss";
	adLoadFails = false;
	adShowCount = 0;
	sessionFailure = null;
});

test("a synchronous session runtime failure can be diagnosed and retried", async () => {
	globalThis.fetch = (async () =>
		json({
			user: { id: "fixture-user", displayName: "노랑공" },
			authTokens: { authToken: "fixture", refreshToken: "refresh" },
		})) as typeof fetch;
	const api = createApi();
	sessionFailure = new TypeError("undefined is not a function");
	await expect(api.ensure()).rejects.toThrow("연결 코드 C30");
	sessionFailure = null;
	api.reconnect();
	await expect(api.ensure()).resolves.toEqual({
		id: "fixture-user",
		displayName: "노랑공",
	});
	api.dispose();
});

test("a lost ad completion response is retried without showing another ad", async () => {
	let starts = 0;
	let completions = 0;
	const api: AdApi = {
		startAd: async () => {
			starts += 1;
			return {
				alreadyGranted: false,
				id: "fixture-ad",
				format: "rewarded",
				groupId: "fixture-group",
				expiresAt: Date.now() + 300000,
			};
		},
		completeAd: async (_id, events) => {
			completions += 1;
			expect(events).toContain("userEarnedReward");
			if (completions === 1) throw new Error("response lost");
			return { feature: "generation_continue" };
		},
	};
	const controller = createAdController(api);
	try {
		await expect(controller.unlock("generation_continue")).rejects.toThrow(
			"response lost",
		);
		await controller.unlock("generation_continue");
		expect(starts).toBe(1);
		expect(adShowCount).toBe(1);
		expect(completions).toBe(2);
	} finally {
		controller.dispose();
	}
});

test("no-fill and unsupported environments continue generation without a fabricated reward", async () => {
	for (const environment of ["toss", "sandbox"]) {
		adEnvironment = environment;
		adLoadFails = true;
		const events: string[][] = [];
		const api: AdApi = {
			startAd: async () => ({
				alreadyGranted: false,
				id: "fixture-ad",
				format: "rewarded",
				groupId: "fixture-group",
				expiresAt: Date.now() + 300000,
			}),
			completeAd: async (_id, observed) => {
				events.push(observed);
				return { feature: "generation_continue", continuedWithoutAd: true };
			},
		};
		const controller = createAdController(api);
		try {
			expect(
				(await controller.unlock("generation_continue"))?.continuedWithoutAd,
			).toBe(true);
			expect(events).toEqual([["failedToShow"]]);
			expect(adShowCount).toBe(0);
		} finally {
			controller.dispose();
		}
	}
});

test("feature passes keep their normal no-fill failure behavior", async () => {
	adLoadFails = true;
	const events: string[][] = [];
	const controller = createAdController({
		startAd: async () => ({
			alreadyGranted: false,
			id: "fixture-ad",
			format: "rewarded",
			groupId: "fixture-group",
			expiresAt: Date.now() + 300000,
		}),
		completeAd: async (_id, observed) => {
			events.push(observed);
			return { feature: "custom" };
		},
	});
	try {
		await expect(controller.unlock("custom")).rejects.toThrow("load failed");
		expect(events).toEqual([["cancelled"]]);
		expect(adShowCount).toBe(0);
	} finally {
		controller.dispose();
	}
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
