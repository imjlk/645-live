// Exercise the real model; isolate RN/API mocks from the native ad-bridge tests.
import { expect, mock } from "bun:test";
import { EMPTY_OPTIONS, type GenerationOptions } from "@645/lotto-core";
import * as React from "react";
import { act, create } from "react-test-renderer";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
mock.module(
	Bun.resolveSync("react", `${import.meta.dir}/../../apps/toss`),
	() => React,
);
const batchModule = await import("../../apps/toss/src/generation-batch");
const batchFactory = batchModule.createGenerationBatch;
mock.module("../../apps/toss/src/generation-batch", () => ({
	...batchModule,
	createGenerationBatch: () => batchFactory(async () => {}),
}));
mock.module("../../apps/toss/src/generation-cooldown", () => ({
	createGenerationCooldown: () => ({
		getSnapshot: () => false,
		subscribe: () => () => {},
		blocked: () => false,
		start() {},
		stop() {},
	}),
}));
mock.module("react-native", () => ({
	AccessibilityInfo: {
		isReduceMotionEnabled: async () => true,
		addEventListener: () => ({ remove() {} }),
	},
	AppState: {
		currentState: "active",
		addEventListener: () => ({ remove() {} }),
	},
}));
let ads = 0;
let failAd = false;
let failRequest = 0;
let requests = 0;
let attendanceReads = 0;
const phases: string[] = [];
const conditions: number[][] = [];
const identities: string[] = [];
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
mock.module("../../apps/toss/src/telemetry", () => ({
	trackProduct() {},
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
	feed: async () => ({
		round: 1244,
		serverTime: at,
		generations: [],
		totalGenerations: 0,
		numberCounts: Array(45).fill(0),
		activeUsers: 0,
		nextCursor: null,
	}),
	ensure: async () => ({ id: "fixture", displayName: "fixture" }),
	saved: () => ({ read: async () => [] }),
	ads: async () => ({
		generationAdPolicy: {
			counter: "device",
			firstGenerations: 5,
			minGenerations: 10,
			maxGenerations: 50,
		},
		placements: [{ placement: "generation_continue", enabled: true }],
	}),
	attendance: async () => {
		attendanceReads++;
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
		options: GenerationOptions,
		device: boolean,
	) => {
		requests++;
		conditions.push([...options.fixed]);
		identities.push(id);
		expect(device).toBe(true);
		if (requests === failRequest) throw new Error("offline");
		return {
			generation: {
				id: requests,
				round,
				numbers: [7, 10, 25, 29, 30, 43],
				displayName: "fixture",
				createdAt: at,
			},
			replayed: false,
		};
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
	phases.push(model.batchProgress.phase);
	return null;
}
let root!: ReturnType<typeof create>;
await act(async () => {
	root = create(<Probe />);
});
expect(ads).toBe(0);
expect(requests).toBe(0);
expect(model.canGenerateMany).toBe(true);
const beforeAttendance = attendanceReads;
await act(async () => {
	expect(await model.generateMany()).toBe(true);
});
expect(ads).toBe(1);
expect(requests).toBe(5);
expect(model.recent.map((item) => item.id)).toEqual([5, 4, 3, 2, 1]);
expect(model.current?.id).toBe(5);
expect(attendanceReads - beforeAttendance).toBe(1);
expect(phases).toContain("idle");

failRequest = 8;
await act(async () => {
	expect(await model.generateMany({ ...EMPTY_OPTIONS, fixed: [7] })).toBe(
		false,
	);
});
expect(ads).toBe(2);
expect(model.batchProgress).toEqual({
	phase: "paused",
	completed: 2,
	remaining: 3,
});
expect(model.recent.slice(0, 2).map((item) => item.id)).toEqual([7, 6]);
const pendingIdentity = identities.at(-1);
// A normal request has a different idempotency lane and leaves the batch credit alone.
await act(async () => {
	expect(await model.generate()).toBe(true);
});
expect(identities.at(-1)).not.toBe(pendingIdentity);
expect(model.batchProgress.remaining).toBe(3);
await act(async () => {
	expect(await model.generateMany({ ...EMPTY_OPTIONS, fixed: [12] })).toBe(
		true,
	);
});
expect(ads).toBe(2);
expect(identities.at(-3)).toBe(pendingIdentity);
expect(conditions.slice(-3)).toEqual([[7], [7], [7]]);
expect(model.batchProgress.remaining).toBe(0);

failAd = true;
const before = requests;
await act(async () => {
	expect(await model.generateMany()).toBe(false);
});
expect(requests).toBe(before);
expect(model.batchProgress.remaining).toBe(0);
expect(model.actionError?.area).toBe("make");
await act(async () => {
	root.unmount();
});
console.log("generation batch model integration passed");
