import { afterEach, expect, mock, test } from "bun:test";
import {
	type AdMetricSink,
	createAdFlow,
	createAdTelemetry,
} from "./ad-telemetry";

const originalFetch = globalThis.fetch;
const kit = await import("@trailbase-apps-in-toss-kit/trailbase-client");
const storageKit = await import("@trailbase-apps-in-toss-kit/ait-rn/storage");
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
	eventLog: async () => {},
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
	...storageKit,
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
	adEvents.splice(
		0,
		adEvents.length,
		"requested",
		"show",
		"impression",
		"userEarnedReward",
		"dismissed",
	);
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
	const metrics: Parameters<AdMetricSink>[0][] = [];
	const telemetry = createAdTelemetry((e) => {
		metrics.push(e);
	});
	const flow = createAdFlow(telemetry, {
		placement: "generation_continue",
		flowId: "first",
	});
	const retry = createAdFlow(telemetry, {
		placement: "generation_continue",
		flowId: "retry",
	});
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
		await expect(
			controller.unlock("generation_continue", true, flow),
		).rejects.toThrow("response lost");
		await controller.unlock("generation_continue", true, retry);
		await telemetry.flush();
		const first = metrics
			.filter((e) => e.params.flow_id === "first")
			.map((e) => e.log_name);
		expect(first).toEqual([
			"lotto_ad_requested",
			"lotto_ad_session_started",
			"lotto_ad_shown",
			"lotto_ad_viewable",
			"lotto_ad_completed",
			"lotto_ad_failed",
		]);
		expect(
			metrics
				.filter((e) => e.params.flow_id === "retry")
				.map((e) => e.log_name),
		).toEqual(["lotto_ad_requested", "lotto_ad_settled"]);
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
		const metrics: Parameters<AdMetricSink>[0][] = [];
		const telemetry = createAdTelemetry((e) => {
			metrics.push(e);
		});
		const flow = createAdFlow(telemetry, { placement: "generation_continue" });
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
				(await controller.unlock("generation_continue", true, flow))
					?.continuedWithoutAd,
			).toBe(true);
			expect(events).toEqual([["failedToShow"]]);
			expect(adShowCount).toBe(0);
			await telemetry.flush();
			expect(
				metrics.some(
					(e) =>
						e.log_name === "lotto_ad_shown" ||
						e.log_name === "lotto_ad_completed",
				),
			).toBe(false);
			expect(
				metrics.some(
					(e) =>
						e.log_name ===
						(environment === "sandbox"
							? "lotto_ad_unavailable"
							: "lotto_ad_failed"),
				),
			).toBe(true);
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

test("attendance restoration never bypasses unavailable, unsupported, or unfinished ads", async () => {
	for (const scenario of ["no_fill", "sandbox", "unfinished"] as const) {
		adEnvironment = scenario === "sandbox" ? "sandbox" : "toss";
		adLoadFails = scenario === "no_fill";
		adEvents.splice(0, adEvents.length, "show", "impression", "dismissed");
		const completions: string[][] = [];
		const controller = createAdController({
			startAd: async () => ({
				alreadyGranted: false,
				id: "restore",
				format: "rewarded",
				groupId: "restore-group",
				expiresAt: Date.now() + 300000,
			}),
			completeAd: async (_id, events) => {
				completions.push(events);
				return { feature: "attendance_restore" };
			},
		});
		try {
			await expect(controller.unlock("attendance_restore")).rejects.toThrow();
			expect(completions).toEqual(
				scenario === "sandbox" ? [] : [["cancelled"]],
			);
		} finally {
			controller.dispose();
		}
	}
});
test("an already-restored day is distinct from a new restore and shows no second ad", async () => {
	const controller = createAdController({
		startAd: async () => ({ alreadyGranted: true }),
		completeAd: async () => {
			throw new Error("already restored must not grant again");
		},
	});
	try {
		expect(await controller.unlock("attendance_restore")).toEqual({
			feature: "attendance_restore",
			resolution: "already_granted",
			continuedWithoutAd: false,
		});
		expect(adShowCount).toBe(0);
	} finally {
		controller.dispose();
	}
});
test("a lost restore completion is retried without claiming that a new ad was watched", async () => {
	let calls = 0;
	const controller = createAdController({
		startAd: async () => ({
			alreadyGranted: false,
			id: "restore",
			format: "rewarded",
			groupId: "restore-group",
			expiresAt: Date.now() + 300000,
		}),
		completeAd: async () => {
			if (++calls === 1) throw new Error("offline");
			return { feature: "attendance_restore" };
		},
	});
	try {
		await expect(controller.unlock("attendance_restore")).rejects.toThrow(
			"offline",
		);
		const result = await controller.unlock("attendance_restore");
		expect(result.resolution).toBe("completion_retry");
		expect(adShowCount).toBe(1);
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

test("lost cancellation is retried before opening another restoration ad", async () => {
	for (const code of ["AD_INCOMPLETE", "AD_EXPIRED", "AD_NOT_FOUND"]) {
		let starts = 0;
		let cancellations = 0;
		const observed: string[] = [];
		adEvents.splice(0, adEvents.length, "show", "impression", "dismissed");
		const controller = createAdController({
			startAd: async () => {
				observed.push(`start-${++starts}`);
				return {
					alreadyGranted: false,
					id: `restore-${starts}`,
					format: "rewarded",
					groupId: "restore",
					expiresAt: Date.now() + 300000,
				};
			},
			completeAd: async (id, events) => {
				if (events.includes("cancelled")) {
					observed.push(`cancel-${id}`);
					if (++cancellations < 3) throw new Error("offline cancellation");
					throw new kit.TrailBaseHttpError("closed", {
						status: 409,
						statusText: "Conflict",
						payload: { error: { code } },
					});
				}
				return { feature: "attendance_restore" };
			},
		});
		try {
			await expect(controller.unlock("attendance_restore")).rejects.toThrow(
				"광고를 끝까지",
			);
			await expect(controller.unlock("attendance_restore")).rejects.toThrow(
				"offline cancellation",
			);
			expect(starts).toBe(1);
			adEvents.splice(
				0,
				adEvents.length,
				"show",
				"impression",
				"userEarnedReward",
				"dismissed",
			);
			expect((await controller.unlock("attendance_restore")).resolution).toBe(
				"ad_completed",
			);
			expect(observed).toEqual([
				"start-1",
				"cancel-restore-1",
				"cancel-restore-1",
				"cancel-restore-1",
				"start-2",
			]);
		} finally {
			controller.dispose();
		}
	}
});
