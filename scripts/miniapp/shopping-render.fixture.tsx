import { expect, mock } from "bun:test";
import * as React from "react";
import { act, create } from "react-test-renderer";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
mock.module(
	Bun.resolveSync("react", `${import.meta.dir}/../../apps/toss`),
	() => React,
);
const io = React.createContext<{ manager: object | null }>({ manager: null });
let focused = true,
	shown = true,
	calls = 0,
	opens = 0;
let complete!: () => void;
const metrics: string[] = [];
const listeners = new Set<(state: string) => void>();
let time = 10_000;
let available = false;
Date.now = () => time;
const originalTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;
const refreshTimers = new Map<unknown, () => void>();
// Deliver only catalog retries in this isolated process, without a minute wait.
globalThis.setTimeout = ((...args: Parameters<typeof setTimeout>) => {
	const timer = originalTimeout(...args);
	const callback = args[0];
	if (args[1] === 60_001 && typeof callback === "function") {
		refreshTimers.set(timer, () => {
			refreshTimers.delete(timer);
			originalClearTimeout(timer);
			callback();
		});
	}
	return timer;
}) as typeof setTimeout;
globalThis.clearTimeout = (timer) => {
	refreshTimers.delete(timer);
	originalClearTimeout(timer);
};
mock.module("react-native", () => ({
	View: "view",
	Text: "text",
	Pressable: "pressable",
	Image: "image",
	StyleSheet: { create: (s: unknown) => s },
	AppState: {
		currentState: "active",
		addEventListener: (_: string, fn: (state: string) => void) => {
			listeners.add(fn);
			return { remove: () => listeners.delete(fn) };
		},
	},
}));
mock.module("@granite-js/native/@react-navigation/native", () => ({
	useIsFocused: () => focused,
}));
mock.module("@granite-js/react-native", () => ({
	IOContext: io,
	useVisibility: () => shown,
	ImpressionArea: (p: Record<string, unknown>) =>
		React.createElement("impression", p, p.children as React.ReactNode),
	openURL: () => {
		opens++;
		return new Promise<void>((r) => {
			complete = r;
		});
	},
}));
mock.module("../../apps/toss/src/telemetry", () => ({
	trackShopping: (event: string, placement: string) =>
		metrics.push(`${placement}:${event}`),
}));
mock.module("../../apps/toss/src/theme", () => ({ useTheme: () => ({}) }));
mock.module("../../apps/toss/src/api", () => ({
	LOCAL_PREVIEW: false,
	publicGet: async () => {
		calls++;
		const now = Date.now();
		return {
			serverTime: now,
			recommendations: available
				? ["generator", "previous_results"].map((placement) => ({
						placement,
						productId: "example",
						title: "Example",
						affiliateUrl: "https://toss.im/_m/example",
						imageUrl: null,
						expiresAt: now + 60000,
					}))
				: [],
		};
	},
}));
const { ShoppingRecommendation } = await import(
	"../../apps/toss/src/ShoppingRecommendation"
);
let root!: ReturnType<typeof create>;
await act(async () => {
	root = create(<ShoppingRecommendation placement="generator" />);
});
expect(root.toJSON()).toBeNull();
expect(calls).toBe(0);
const screen = (
	active = true,
	placement: "generator" | "previous_results" = "generator",
) => (
	<io.Provider value={{ manager: {} }}>
		<ShoppingRecommendation placement={placement} active={active} />
	</io.Provider>
);
await act(async () => root.update(screen(false)));
expect(calls).toBe(0);
await act(async () => root.update(screen()));
expect(calls).toBe(1);
expect(root.toJSON()).toBeNull();
expect(refreshTimers.size).toBe(1);
// Even an empty catalog must recover in place when an operator enables a slot.
focused = false;
await act(async () => root.update(screen()));
expect(refreshTimers.size).toBe(0);
focused = true;
await act(async () => root.update(screen()));
expect(calls).toBe(1);
expect(refreshTimers.size).toBe(1);
available = true;
time += 60_001;
await act(async () => {
	for (const expire of [...refreshTimers.values()]) expire();
});
expect(calls).toBe(2);
expect(root.toJSON()).not.toBeNull();
expect(refreshTimers.size).toBe(1);
expect(metrics).toEqual([]);
const impress = () =>
	root.root.findByType("impression").props.onImpressionStart();
await act(async () => {
	impress();
	impress();
});
expect(metrics).toEqual(["generator:viewed"]);
const press = () => root.root.findByType("pressable").props.onPress();
await act(async () => {
	press();
	press();
});
expect(opens).toBe(1);
expect(metrics.at(-1)).toBe("generator:clicked");
await act(async () => complete());
expect(metrics.at(-1)).toBe("generator:opened");
focused = false;
await act(async () => root.update(screen()));
await act(async () => impress());
expect(metrics).toHaveLength(3);
focused = true;
await act(async () => root.update(screen(true, "previous_results")));
expect(calls).toBe(2);
await act(async () => impress());
expect(metrics.at(-1)).toBe("previous_results:viewed");
expect(listeners.size).toBe(1);
await act(async () => {
	for (const listener of listeners) listener("background");
});
expect(refreshTimers.size).toBe(0);
const before = opens;
await act(async () => press());
expect(opens).toBe(before);
await act(async () => root.unmount());
expect(listeners.size).toBe(0);
expect(refreshTimers.size).toBe(0);
console.log("shopping visibility and navigation passed");
