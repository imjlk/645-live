import { expect, mock } from "bun:test";
import { EMPTY_OPTIONS } from "@645/lotto-core";
import * as React from "react";
import { act, create } from "react-test-renderer";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
mock.module(
	Bun.resolveSync("react", `${import.meta.dir}/../../apps/toss`),
	() => React,
);
const host = (name: string) => (props: Record<string, unknown>) =>
	React.createElement(name, props, props.children as React.ReactNode);
mock.module("react-native", () => ({
	View: "view",
	Text: "text",
	ScrollView: "scroll",
	Pressable: "pressable",
	RefreshControl: "refresh",
	ActivityIndicator: "spinner",
	Alert: {},
	StyleSheet: { create: (styles: unknown) => styles },
	useWindowDimensions: () => ({ width: 390, height: 844 }),
}));
mock.module("react-native-safe-area-context", () => ({
	useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}));
mock.module("@apps-in-toss/framework", () => ({
	getTossShareLink: async () => "",
	share: async () => {},
}));
let visible = true;
const stack = [{ name: "/", params: {} as object }];
const nativeStack = {
	getState: () => ({ type: "stack", index: stack.length - 1, routes: stack }),
	push(name: string, params: object) {
		stack.push({ name, params });
		visible = false;
	},
};
mock.module("@granite-js/native/@react-navigation/native", () => ({
	useNavigation: () => ({
		getState: () => ({ index: 0, routes: [{ name: "live" }] }),
		getParent: () => nativeStack,
	}),
}));
mock.module("@granite-js/react-native", () => ({
	IOScrollView: "scroll",
	useVisibility: () => visible,
}));
mock.module("@toss/tds-react-native/private", () => ({
	HideAccessibilityProvider: host("accessible"),
	HideAccessibilityView: "hiddenView",
}));
mock.module("@toss/tds-react-native", () => ({
	Button: "button",
	IconButton: "iconButton",
	Switch: "switch",
	BottomSheet: { Root: host("sheet"), Header: "heading", CTA: "cta" },
	SegmentedControl: { Root: "segmented", Item: "item" },
	Tab: Object.assign(host("tabs"), { Item: "item" }),
}));
mock.module("../../apps/toss/src/api", () => ({
	LOCAL_PREVIEW: false,
	API_BASE: "https://navigation.invalid",
}));
mock.module("../../apps/toss/src/telemetry", () => ({ trackProduct() {} }));
mock.module("../../apps/toss/src/ad-telemetry", () => ({
	adPolicyLabel: () => "",
}));
mock.module("../../apps/toss/src/theme", () => ({
	useTheme: () => ({
		text: "black",
		muted: "gray",
		blue: "blue",
		line: "gray",
	}),
}));
let back: (() => void) | null = null;
const presentOverlay = (close: () => void) => {
	back = close;
	return () => {
		back = null;
	};
};
mock.module("../../apps/toss/src/TabShell", () => ({
	useTabShell: () => ({ tabBarHeight: 60, presentOverlay }),
}));
const model = {
	saved: [],
	recent: [],
	results: {},
	reports: {},
	feed: null,
	context: null,
	current: null,
	adConfig: null,
	attendance: null,
	busy: null,
	error: null,
	actionError: null,
	featureUsed() {},
};
mock.module("../../apps/toss/src/LottoProvider", () => ({
	useLottoContext: () => ({
		model,
		options: EMPTY_OPTIONS,
		setOptions() {},
		liveColumns: 5,
		setLiveColumns() {},
	}),
}));
for (const name of [
	"Balls",
	"Banner",
	"Celebration",
	"PrivacyNotice",
	"ReportHistory",
	"AttendancePanel",
	"LocalTestPanel",
	"LocalResultPreview",
	"FeatureAccessPrompt",
	"ActivityPanel",
	"GenerationInsightPreview",
	"AdCtaImpression",
]) {
	mock.module(`../../apps/toss/src/${name}`, () => ({ [name]: host(name) }));
}
mock.module("../../apps/toss/src/LiveFeed", () => ({
	LiveFeed: host("liveFeed"),
	relativeTime: () => "",
}));
const row = (round: number) => ({
	round,
	totalGenerations: 0,
	rankCounts: null,
	comparedGenerations: 0,
	closesAt: 1,
	updatedAt: 1,
	draw: null,
	status: round === 1244 ? "open" : "unavailable",
});
globalThis.fetch = (async (input: string | URL | Request) => {
	const requested = Number(new URL(String(input)).searchParams.get("round"));
	return Response.json({
		rounds: requested ? [row(requested)] : [row(1244), row(1243), row(1242)],
		currentRound: 1244,
		nextBeforeRound: null,
		serverTime: 1,
	});
}) as typeof fetch;
const { LottoScreen } = await import("../../apps/toss/src/LottoScreen");
let root!: ReturnType<typeof create>;
await act(async () => {
	root = create(<LottoScreen tab="live" />);
});
const live = () => root.root.findByType("liveFeed");
const sheet = () => root.root.findAllByType("sheet")[0];
const selected = () => {
	const label = root.root
		.findAllByType("button")
		.map((node) => node.props.children)
		.find((text) => typeof text === "string" && /^\d+회 선택/.test(text));
	return label ? Number(label.match(/^\d+/)[0]) : undefined;
};
await act(async () => {
	live().props.onResults();
});
expect(selected()).toBe(1243);
await act(async () => {
	root.root
		.findAllByType("button")
		.find((node) => String(node.props.children).includes("회 생성 통계 보기"))
		?.props.onPress();
});
expect(stack).toHaveLength(1);
expect(sheet().props.open).toBe(false);
await act(async () => {
	sheet().props.onExited();
	sheet().props.onExited();
	root.update(<LottoScreen tab="live" />);
});
expect(stack).toHaveLength(2);
expect(stack[1]).toEqual({
	name: "/insights",
	params: { round: 1243, number: undefined },
});
expect(back).toBeNull();
await act(async () => {
	stack.pop();
	visible = true;
	root.update(<LottoScreen tab="live" />);
});
expect(sheet().props.open).toBe(true);
expect(selected()).toBe(1243);
// Reopen before the exit animation has cleared the old result component.
await act(async () => {
	sheet().props.onClose();
	live().props.onResults();
});
expect(selected()).toBe(1243);
await act(async () => {
	root.root
		.findAllByType("button")
		.find((node) => String(node.props.children).includes("이전"))
		?.props.onPress();
});
expect(selected()).toBe(1242);
await act(async () => {
	root.root
		.findAllByType("button")
		.find((node) => String(node.props.children).includes("회 생성 통계 보기"))
		?.props.onPress();
});
expect(stack).toHaveLength(1);
await act(async () => {
	sheet().props.onExited();
	root.update(<LottoScreen tab="live" />);
});
expect(stack[1].params).toEqual({ round: 1242, number: undefined });
await act(async () => {
	stack.pop();
	visible = true;
	root.update(<LottoScreen tab="live" />);
});
expect(selected()).toBe(1242);
await act(async () => {
	sheet().props.onClose();
	live().props.onResults();
});
expect(selected()).toBe(1243);
// Native Back during dismissal cancels the queued push, rather than opening a stale screen.
await act(async () => {
	root.root
		.findAllByType("button")
		.find((node) => String(node.props.children).includes("회 생성 통계 보기"))
		?.props.onPress();
});
await act(async () => {
	back?.();
	sheet().props.onExited();
});
expect(stack).toHaveLength(1);
await act(async () => {
	live().props.onResults();
});
expect(selected()).toBe(1243);
// Reopening before onExited also invalidates the pending navigation.
await act(async () => {
	root.root
		.findAllByType("button")
		.find((node) => String(node.props.children).includes("회 생성 통계 보기"))
		?.props.onPress();
});
await act(async () => {
	live().props.onResults();
	sheet().props.onExited();
});
expect(stack).toHaveLength(1);
expect(sheet().props.open).toBe(true);
await act(async () => {
	sheet().props.onClose();
	sheet().props.onExited();
	live().props.onResults();
});
expect(selected()).toBe(1243);
await act(async () => {
	root.root
		.findAllByType("button")
		.find((node) => String(node.props.children).includes("회 생성 통계 보기"))
		?.props.onPress();
});
const lateExit = sheet().props.onExited;
await act(async () => {
	root.unmount();
});
await act(async () => {
	lateExit();
});
expect(stack).toHaveLength(1);
console.log(
	"analysis return and direct result reopen preserve the intended round",
);
