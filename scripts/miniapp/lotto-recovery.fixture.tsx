import { expect, mock } from "bun:test";
import type { Generation, SavedCombination } from "@645/lotto-core";
import * as React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
mock.module(
	Bun.resolveSync("react", `${import.meta.dir}/../../apps/toss`),
	() => React,
);
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
mock.module("../../apps/toss/src/telemetry", () => ({
	trackProduct() {},
	adTelemetry: {},
}));
mock.module("../../apps/toss/src/ad-bridge", () => ({
	createAdController: () => ({
		preload() {},
		dispose() {},
		unavailableReason: () => null,
	}),
	setResultNotification: async () => true,
}));
mock.module("../../apps/toss/src/realtime", () => ({
	subscribeRealtime: () => () => {},
}));
const generation: Generation = {
	id: 1,
	round: 100,
	numbers: [10, 11, 12, 13, 14, 15],
	displayName: "test",
	createdAt: 1,
};
const item: SavedCombination = {
	version: 1,
	id: "generation-1",
	generationId: 1,
	round: 100,
	numbers: generation.numbers,
	savedAt: 1,
};
let items = [item];
let promptShown = true;
let failDraw = true;
let failRemove = false;
let attendanceGate: Promise<void> | null = null;
const order: string[] = [];
const progress = { ready: true, remaining: 10 };
const api = {
	preferences: {},
	generationAds: { getSnapshot: () => progress, subscribe: () => () => {} },
	context: async () => ({ targetRound: 101, serverTime: 1, latestDraw: null }),
	feed: async () => ({
		round: 101,
		serverTime: 1,
		generations: [],
		totalGenerations: 0,
		numberCounts: Array(45).fill(0),
		activeUsers: 0,
		nextCursor: null,
	}),
	ensure: async () => ({ id: "same-user", displayName: "test" }),
	saved: () => ({
		read: async () => items,
		clear: async () => {
			order.push("saved");
			items = [];
			return items;
		},
		add: async (next: SavedCombination) => {
			items = [next];
			return items;
		},
		remove: async () => {
			if (failRemove) throw new Error("cannot delete");
			return items;
		},
	}),
	notificationPrompt: () => ({
		read: async () => promptShown,
		write: async (value: boolean) => {
			promptShown = value;
		},
		clear: async () => {
			order.push("prompt");
			promptShown = false;
		},
	}),
	ads: async () => ({ placements: [] }),
	attendance: async () => {
		if (attendanceGate) await attendanceGate;
		return {
			serverTime: 1,
			notificationTemplateCode: "result",
			notificationsEnabled: false,
		};
	},
	draw: async () => {
		if (failDraw) throw new Error("offline");
		return {
			round: 100,
			numbers: [1, 2, 3, 4, 5, 6],
			bonus: 7,
			drawDate: "2026-01-01",
		};
	},
	heartbeat: async () => {},
	reconnect() {},
	dispose() {},
	withdraw: async () => {
		order.push("withdraw");
		return { credentialsCleared: true };
	},
};
mock.module("../../apps/toss/src/api", () => ({
	createApi: () => api,
	API_BASE: "http://test",
	LOCAL_PREVIEW: false,
	apiErrorCode: () => null,
	newRequestId: () => "",
}));
const { useLotto } = await import("../../apps/toss/src/use-lotto");
let model: ReturnType<typeof useLotto>;
function Probe() {
	model = useLotto();
	return null;
}
let root: ReactTestRenderer;
await act(async () => {
	root = create(<Probe />);
});
expect(model.actionError?.source).toBe("saved-results");
failDraw = false;
await act(async () => {
	model.retry();
});
expect(model.results[100]).toBeDefined();
expect(model.actionError).toBeNull();
failRemove = true;
await act(async () => {
	await model.remove(item);
});
expect(model.actionError?.message).toBe("cannot delete");
await act(async () => {
	model.retry();
});
expect(model.actionError?.message).toBe("cannot delete");
failDraw = true;
await act(async () => {
	model.retry();
});
expect(model.actionError?.message).toBe("cannot delete");
promptShown = false;
await act(async () => {
	await model.notifications(false);
});
expect(promptShown).toBe(true);
await act(async () => {
	await model.save(generation);
});
expect(model.notificationPrompt).toBe(false);
await act(async () => {
	await model.withdraw();
});
expect(order).toEqual(["saved", "prompt", "withdraw"]);
expect(promptShown).toBe(false);
expect(model.user).toBeNull();
await act(async () => {
	model.retry();
});
await act(async () => {
	await model.save(generation);
});
expect(model.notificationPrompt).toBe(true);
expect(promptShown).toBe(false);
await act(async () => {
	model.dismissNotificationPrompt();
});
expect(promptShown).toBe(true);
await act(async () => {
	root.unmount();
});
promptShown = false;
let releaseAttendance: () => void = () => {};
attendanceGate = new Promise<void>((resolve) => {
	releaseAttendance = resolve;
});
await act(async () => {
	root = create(<Probe />);
});
expect(model.notificationPrompt).toBe(false);
await act(async () => {
	await model.save(generation);
});
expect(model.notificationPrompt).toBe(false);
await act(async () => {
	releaseAttendance();
});
expect(model.notificationPrompt).toBe(true);
expect(promptShown).toBe(false);
await act(async () => {
	root.unmount();
});
attendanceGate = null;
await act(async () => {
	root = create(<Probe />);
});
expect(model.notificationPrompt).toBe(false);
expect(promptShown).toBe(false);
await act(async () => {
	root.unmount();
});
console.log("saved-result retry and notification onboarding reset passed");
