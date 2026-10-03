// Exercise the real model with an empty feed and a lost POST response.
// Native mocks stay isolated from the bridge and navigation fixtures.
import { expect, mock } from "bun:test";
import {
	EMPTY_OPTIONS,
	type Generation,
	type GenerationOptions,
} from "@645/lotto-core";
import * as React from "react";
import { act, create } from "react-test-renderer";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
mock.module(
	Bun.resolveSync("react", `${import.meta.dir}/../../apps/toss`),
	() => React,
);
const { createGenerationCooldown } = await import(
	"../../apps/toss/src/generation-cooldown"
);
let clock = 0;
let timer: (() => void) | null = null;
mock.module("../../apps/toss/src/generation-cooldown", () => ({
	createGenerationCooldown: () =>
		createGenerationCooldown(
			() => clock,
			(callback) => {
				timer = callback;
				return () => {
					timer = null;
				};
			},
		),
}));
async function advance() {
	await act(async () => {
		clock += 1_000;
		const callback = timer;
		timer = null;
		callback?.();
	});
}
const appStates = new Set<(state: string) => void>();
const appState = {
	currentState: "active",
	addEventListener: (_event: string, listener: (state: string) => void) => {
		appStates.add(listener);
		return { remove: () => appStates.delete(listener) };
	},
};
mock.module("react-native", () => ({
	AccessibilityInfo: {
		isReduceMotionEnabled: async () => true,
		addEventListener: () => ({ remove() {} }),
	},
	AppState: appState,
}));
let ads = 0;
let failAd = false;
let failRequest = 0;
let requests = 0;
let feedReads = 0;
let attendanceReads = 0;
let failAttendance = true;
let releaseInitialFeed: (() => void) | null = null;
let holdInitialFeed = true;
let releaseAds: (() => void) | null = null;
const initialAds = new Promise<void>((resolve) => {
	releaseAds = resolve;
});
let holdInitialAds = true;
const identities: string[] = [];
const records = new Map<string, Generation>();
mock.module("../../apps/toss/src/ad-bridge", () => ({
	createAdController: () => ({
		dispose() {},
		unavailableReason: () => null,
		unlock: async () => {
			ads++;
			if (failAd) throw new Error("unfinished ad");
			return { resolution: "ad_completed" };
		},
	}),
	setResultNotification: async () => true,
}));
const performanceEvents: { stage?: string; outcome?: string }[] = [];
mock.module("../../apps/toss/src/telemetry", () => ({
	trackProduct(
		event: string,
		_source: string,
		timing?: { stage?: string; outcome?: string },
	) {
		if (event === "performance" && timing) performanceEvents.push(timing);
	},
	adTelemetry: { track() {} },
}));
mock.module("../../apps/toss/src/realtime", () => ({
	subscribeRealtime: () => () => {},
}));
const listeners = new Set<() => void>();
let progress = { ready: true, remaining: 5 };
const day = 100;
const at = day * 86_400_000;
const api = {
	preferences: {},
	featureAds: {
		getSnapshot: () => progress,
		subscribe: () => () => {},
		load: async () => {},
	},
	generationAds: {
		getSnapshot: () => progress,
		subscribe: (listener: () => void) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		load: async () => {},
		continued() {
			progress = { ready: true, remaining: 15 };
			for (const listener of listeners) listener();
		},
		generated() {
			progress = { ...progress, remaining: progress.remaining - 1 };
			for (const listener of listeners) listener();
		},
	},
	context: async () => ({
		targetRound: 1244,
		serverTime: at,
		latestDraw: null,
	}),
	feed: async () => {
		feedReads++;
		if (holdInitialFeed) {
			holdInitialFeed = false;
			await new Promise<void>((resolve) => {
				releaseInitialFeed = resolve;
			});
		}
		return {
			round: 1244,
			serverTime: at,
			generations: [],
			totalGenerations: 0,
			numberCounts: Array(45).fill(0),
			activeUsers: 0,
			nextCursor: null,
		};
	},
	ensure: async () => ({ id: "fixture", displayName: "fixture" }),
	saved: () => ({ read: async () => [], clear: async () => [] }),
	notificationPrompt: () => ({ clear: async () => {} }),
	withdraw: async () => ({ credentialsCleared: true }),
	ads: async () => {
		if (holdInitialAds) {
			holdInitialAds = false;
			await initialAds;
		}
		return {
			generationAdPolicy: {
				counter: "device",
				firstGenerations: 5,
				minGenerations: 10,
				maxGenerations: 50,
			},
			placements: [{ placement: "generation_continue", enabled: true }],
		};
	},
	attendance: async () => {
		attendanceReads++;
		if (failAttendance) {
			failAttendance = false;
			throw new Error("attendance temporarily unavailable");
		}
		return {
			day,
			serverTime: at,
			generatedToday: false,
			checkedIn: false,
			promotions: [],
		};
	},
	heartbeat: async () => {},
	reconnect() {},
	dispose() {},
	generate: async (
		id: string,
		round: number,
		_options: GenerationOptions,
		device: boolean,
	) => {
		requests++;
		identities.push(id);
		expect(device).toBe(true);
		const existing = records.get(id);
		const generation = existing ?? {
			id: records.size + 1,
			round,
			numbers: [7, 10, 25, 29, 30, 43],
			displayName: "fixture",
			createdAt: at,
		};
		records.set(id, generation);
		if (requests === failRequest) throw new Error("lost response");
		return { generation, replayed: !!existing };
	},
};
let requestId = 0;
mock.module("../../apps/toss/src/api", () => ({
	createApi: () => api,
	API_BASE: "https://fixture.invalid",
	LOCAL_PREVIEW: false,
	apiErrorCode: () => null,
	newRequestId: () => `fixture-${++requestId}`,
}));
const { useLotto } = await import("../../apps/toss/src/use-lotto");
let model!: ReturnType<typeof useLotto>;
function Probe() {
	model = useLotto();
	return null;
}
let root!: ReturnType<typeof create>;
await act(async () => {
	root = create(<Probe />);
});
// A slow feed cannot block authenticated generation, but pending ad policy must.
expect(model.user).not.toBeNull();
expect(model.generationReady).toBe(false);
await act(async () => {
	expect(await model.generate()).toBe(false);
});
expect(requests).toBe(0);
await act(async () => {
	releaseAds?.();
});
expect(model.generationReady).toBe(true);
expect(model.error).toBe("attendance temporarily unavailable");
expect(model.feed).toBeNull();
expect(feedReads).toBe(1);
expect(attendanceReads).toBe(1);
await act(async () => {
	releaseInitialFeed?.();
});
expect(model.publishedGenerationId).toBeNull();
expect(ads).toBe(0);
expect(requests).toBe(0);
const beforeAttendance = attendanceReads;
const beforeFeed = feedReads;
await act(async () => {
	expect(await model.generate()).toBe(true);
});
expect(requests).toBe(1);
expect(model.current?.id).toBe(1);
expect(model.publishedGenerationId).toBe(1);
expect(model.feed?.generations).toEqual([]);
expect(model.attendance?.generatedToday).toBe(true);
expect(attendanceReads - beforeAttendance).toBe(1);
await act(async () => {
	expect(await model.generate()).toBe(false);
});
expect(requests).toBe(1);

await advance();
failRequest = 2;
const conditions = { ...EMPTY_OPTIONS, fixed: [7] };
await act(async () => {
	expect(await model.generate(conditions)).toBe(false);
});
expect(model.current?.id).toBe(1);
expect(model.publishedGenerationId).toBe(1);
const pendingIdentity = identities.at(-1);
await advance();
await act(async () => {
	expect(await model.generate(conditions)).toBe(true);
});
expect(identities.at(-1)).toBe(pendingIdentity);
expect(model.publishedGenerationId).toBe(2);
expect(records.size).toBe(2);
for (let i = 0; i < 3; i++) {
	await advance();
	await act(async () => {
		expect(await model.generate()).toBe(true);
	});
}
expect(ads).toBe(0);
expect(model.generationAdRequired).toBe(true);
expect(model.publishedGenerationId).toBe(5);
expect(attendanceReads - beforeAttendance).toBe(1);
expect(feedReads).toBe(beforeFeed);

await advance();
failAd = true;
const before = requests;
await act(async () => {
	expect(await model.generate(EMPTY_OPTIONS, true)).toBe(false);
});
expect(requests).toBe(before);
expect(model.publishedGenerationId).toBe(5);
expect(progress.remaining).toBe(0);
await advance();
failAd = false;
await act(async () => {
	expect(await model.generate(EMPTY_OPTIONS, true)).toBe(true);
});
expect(ads).toBe(2);
expect(requests).toBe(before + 1);
expect(model.publishedGenerationId).toBe(6);
expect(progress.remaining).toBe(14);

await act(async () => {
	expect(await model.withdraw()).toBe(true);
});
expect(model.current).toBeNull();
expect(model.publishedGenerationId).toBeNull();
await act(async () => {
	model.retry();
});
expect(model.attendance?.generatedToday).toBe(false);
await act(async () => {
	root.unmount();
});
expect(timer).toBeNull();
expect(listeners.size).toBe(0);
const readyMeasurements = performanceEvents.filter(
	(event) => event.stage === "generator_ready",
).length;
appState.currentState = "background";
await act(async () => {
	root = create(<Probe />);
});
expect(model.foreground).toBe(false);
await act(async () => {
	appState.currentState = "active";
	for (const listener of appStates) listener("active");
});
expect(model.foreground).toBe(true);
expect(
	performanceEvents.filter((event) => event.stage === "generator_ready"),
).toHaveLength(readyMeasurements);
await act(async () => root.unmount());
expect(appStates.size).toBe(0);
console.log("generator publication receipts and single-generation flow passed");
