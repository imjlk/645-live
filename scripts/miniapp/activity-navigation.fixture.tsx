import { expect, mock } from "bun:test";
import {
	EMPTY_OPTIONS,
	resultFingerprint,
	type SavedCombination,
} from "@645/lotto-core";
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
let focused = true;
let currentTab = "live";
let savedTarget: { round?: number; entry?: "notification" | "home" } = {};
const jumps: unknown[] = [];
const stack = [{ name: "/", params: {} as object }];
const nativeStack = {
	getState: () => ({ type: "stack", index: stack.length - 1, routes: stack }),
	push(name: string, params: object) {
		stack.push({ name, params });
		visible = false;
	},
};
mock.module("@granite-js/native/@react-navigation/native", () => ({
	useIsFocused: () => focused,
	useNavigation: () => ({
		getState: () => ({ index: 0, routes: [{ name: currentTab }] }),
		jumpTo(name: string, params: typeof savedTarget) {
			currentTab = name;
			savedTarget = params;
			jumps.push([name, params]);
		},
		setParams(params: typeof savedTarget) {
			savedTarget = params;
		},
		getParent: () => nativeStack,
	}),
}));
mock.module("@granite-js/react-native", () => ({
	IOScrollView: "scroll",
	ImpressionArea: "impression",
	useVisibility: () => visible,
	useParams: () => stack.find((r) => r.name === "/results")?.params ?? {},
	useNavigation: () => ({
		navigate: (name: string, params: object) => nativeStack.push(name, params),
	}),
}));
mock.module("@toss/tds-react-native/private", () => ({
	HideAccessibilityProvider: host("accessible"),
	HideAccessibilityView: "hiddenView",
}));
mock.module("@toss/tds-react-native", () => ({
	TDSProvider: host("tds"),
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
const productEvents: string[] = [];
mock.module("../../apps/toss/src/telemetry", () => ({
	trackProduct: (event: string) => productEvents.push(event),
}));
const reviewSources: string[] = [];
mock.module("../../apps/toss/src/review-bridge", () => ({
	requestAppReview: async (options: {
		source: string;
		canShow: () => boolean;
	}) => {
		if (options.canShow()) reviewSources.push(options.source);
		return true;
	},
}));
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
	useTabShell: () => ({ tabBarHeight: 60, presentOverlay, savedTarget }),
}));
const model = {
	foreground: true,
	saved: [] as SavedCombination[],
	savedReady: true,
	markResultsViewed: async (_: number) => {},
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
	"ShoppingRecommendation",
]) {
	mock.module(`../../apps/toss/src/${name}`, () => ({ [name]: host(name) }));
}
mock.module("../../apps/toss/src/AdCtaImpression", () => ({
	AdCtaImpression: ({
		children,
	}: {
		children: (
			run: (action: (flow: undefined) => Promise<unknown>) => Promise<unknown>,
		) => React.ReactNode;
	}) => children((action) => action(undefined)),
}));
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
// Previous results now belong to the native stack. A hidden tab cannot push
// another detail, and returning from analysis retains the chosen round.
await act(async () => {
	live().props.onResults();
	live().props.onResults();
	root.update(<LottoScreen tab="live" />);
});
expect(stack).toHaveLength(2);
expect(stack[1]).toEqual({ name: "/results", params: {} });
expect(sheet().props.open).toBe(false);
expect(back).toBeNull();
// Include a deep-link initial round: it must not override a later manual choice.
stack[1].params = { round: 1243 };
visible = true;
const { GenerationResultsScreen } = await import(
	"../../apps/toss/src/GenerationResultsScreen"
);
let resultRoot!: ReturnType<typeof create>;
await act(async () => {
	resultRoot = create(<GenerationResultsScreen />);
});
const selected = () => {
	const label = resultRoot.root
		.findAllByType("button")
		.map((node) => node.props.children)
		.find((text) => typeof text === "string" && /^\d+회 선택/.test(text));
	return label ? Number(label.match(/^\d+/)[0]) : undefined;
};
const resultButton = (label: string) =>
	resultRoot.root
		.findAllByType("button")
		.find((node) => [node.props.children].flat().join("") === label);
expect(selected()).toBe(1243);
await act(async () => {
	resultButton("이전")?.props.onPress();
});
expect(selected()).toBe(1242);
await act(async () => {
	resultButton("1242회 생성 통계 보기")?.props.onPress();
	resultButton("1242회 생성 통계 보기")?.props.onPress();
	resultRoot.update(<GenerationResultsScreen />);
});
expect(stack).toHaveLength(3);
expect(stack[2]).toEqual({ name: "/insights", params: { round: 1242 } });
await act(async () => {
	stack.pop();
	visible = true;
	resultRoot.update(<GenerationResultsScreen />);
});
expect(selected()).toBe(1242);
// A second visit to statistics is allowed after returning, without extra sheets.
await act(async () => {
	resultButton("1242회 생성 통계 보기")?.props.onPress();
});
expect(stack).toHaveLength(3);
await act(async () => {
	stack.pop();
	stack.pop();
	resultRoot.unmount();
	visible = true;
	root.update(<LottoScreen tab="live" />);
});
expect(sheet().props.open).toBe(false);
await act(async () => {
	live().props.onResults();
});
visible = true;
await act(async () => {
	resultRoot = create(<GenerationResultsScreen />);
});
expect(selected()).toBe(1243);
await act(async () => {
	resultRoot.unmount();
	stack.pop();
});
const lateExit = sheet().props.onExited;
await act(async () => {
	root.unmount();
	lateExit();
});
expect(stack).toHaveLength(1);
const renderedText = () =>
	root.root
		.findAllByType("text")
		.map((node) =>
			node.children
				.filter(
					(child) => typeof child === "string" || typeof child === "number",
				)
				.join(""),
		)
		.join("\n");
// Home and notification returns reuse saved, consume the target once and keep manual selection.
const { createSavedStore } = await import("../../apps/toss/src/saved-store");
const draw = {
	round: 1243,
	numbers: [1, 2, 3, 4, 5, 6] as [
		number,
		number,
		number,
		number,
		number,
		number,
	],
	bonus: 7,
	drawDate: "2026-09-26",
};
const savedItem = (id: number, round: number): SavedCombination => ({
	version: 1,
	id: String(id),
	generationId: id,
	round,
	numbers: [1, 2, 3, 4, 5, 6],
	savedAt: id,
});
let raw = JSON.stringify([
	savedItem(1, 1243),
	savedItem(2, 1243),
	savedItem(3, 1244),
]);
const savedStore = createSavedStore(
	{
		getItem: () => raw,
		setItem: (_: string, value: string) => {
			raw = value;
		},
	},
	"saved",
);
model.saved = await savedStore.read();
Object.assign(model, {
	results: { 1243: draw },
	context: { targetRound: 1244, latestDraw: draw, drawsAt: 1 },
	markResultsViewed: async (round: number) => {
		if (round === draw.round)
			model.saved = await savedStore.viewResults(
				model.saved.filter((i) => i.round === round).map((i) => i.id),
				resultFingerprint(draw),
			);
	},
});
currentTab = "make";
await act(async () => {
	root = create(<LottoScreen tab="make" />);
});
expect(renderedText()).toContain("보관한 ");
await act(async () => {
	root.root
		.findAllByType("button")
		.find((n) => n.props.children === "보관한 번호 결과 보기")
		?.props.onPress();
});
expect(jumps.at(-1)).toEqual(["saved", { round: 1243, entry: "home" }]);
expect(stack).toHaveLength(1);
await act(async () => {
	root.update(<LottoScreen tab="saved" />);
});
await act(async () => {
	root.update(<LottoScreen tab="saved" />);
});
expect(renderedText()).toContain("개 결과");
// The summary can be below the banner. Rendering the saved screen is not reading its result.
expect(
	model.saved.filter((i) => i.round === 1243).every((i) => !i.viewedResult),
).toBe(true);
expect(productEvents).not.toContain("saved_results_viewed");
await act(async () => {
	model.foreground = false;
	root.update(<LottoScreen tab="saved" />);
});
expect(root.root.findByType("impression").props.enabled).toBe(false);
await act(async () => {
	root.root.findByType("impression").props.onImpressionStart();
	model.foreground = true;
	visible = false;
	root.update(<LottoScreen tab="saved" />);
});
expect(root.root.findByType("impression").props.enabled).toBe(false);
await act(async () => {
	root.root.findByType("impression").props.onImpressionStart();
});
expect(
	model.saved.filter((i) => i.round === 1243).every((i) => !i.viewedResult),
).toBe(true);
expect(productEvents).not.toContain("saved_results_viewed");
await act(async () => {
	visible = true;
	focused = false;
	root.update(<LottoScreen tab="saved" />);
});
expect(root.root.findByType("impression").props.enabled).toBe(false);
await act(async () => {
	root.root.findByType("impression").props.onImpressionStart();
});
expect(productEvents).not.toContain("saved_results_viewed");
expect(
	model.saved.filter((i) => i.round === 1243).every((i) => !i.viewedResult),
).toBe(true);
await act(async () => {
	focused = true;
	root.update(<LottoScreen tab="saved" />);
});
await act(async () => {
	root.root.findByType("impression").props.onImpressionStart();
	root.root.findByType("impression").props.onImpressionStart();
});
expect(productEvents.filter((e) => e === "saved_results_viewed")).toHaveLength(
	1,
);
expect(
	model.saved
		.filter((i) => i.round === 1243)
		.every((i) => i.viewedResult === resultFingerprint(draw)),
).toBe(true);
expect(savedTarget.round).toBeUndefined();
expect(productEvents.filter((e) => e === "results_return_opened")).toHaveLength(
	1,
);
await act(async () => {
	root.root
		.findAllByType("button")
		.find((n) => [n.props.children].flat().join("") === "1244회")
		?.props.onPress();
});
await act(async () => {
	root.update(<LottoScreen tab="make" />);
});
await act(async () => {
	root.update(<LottoScreen tab="saved" />);
});
expect(renderedText()).toContain("추첨 결과를 기다리고 있어요.");
savedTarget = { round: 1241, entry: "notification" };
await act(async () => {
	root.update(<LottoScreen tab="saved" />);
});
expect(renderedText()).toContain(
	"1241회 번호가 이 기기에 보관되어 있지 않아요.",
);
expect(
	productEvents.filter((e) => e === "notification_result_opened"),
).toHaveLength(1);
await act(async () => {
	root.unmount();
});
// A cold notification entry must not mark the default round before applying its target.
raw = JSON.stringify([savedItem(5, 1243), savedItem(6, 1242)]);
model.saved = await savedStore.read();
const olderDraw = { ...draw, round: 1242 };
Object.assign(model, {
	results: { 1243: draw, 1242: olderDraw },
	markResultsViewed: async (round: number) => {
		const target = round === 1242 ? olderDraw : draw;
		model.saved = await savedStore.viewResults(
			model.saved.filter((i) => i.round === round).map((i) => i.id),
			resultFingerprint(target),
		);
	},
});
savedTarget = { round: 1242, entry: "notification" };
await act(async () => {
	root = create(<LottoScreen tab="saved" />);
});
expect(model.saved.find((i) => i.round === 1242)?.viewedResult).toBeUndefined();
await act(async () => {
	root.root.findByType("impression").props.onImpressionStart();
});
expect(model.saved.find((i) => i.round === 1242)?.viewedResult).toBe(
	resultFingerprint(olderDraw),
);
expect(model.saved.find((i) => i.round === 1243)?.viewedResult).toBeUndefined();
await act(async () => {
	root.unmount();
});
// A freshly generated record renders adjacent keyed insight/comparison components.
// React must not reuse one component's identity for the other, even if the comparison is empty.
Object.assign(model, {
	current: {
		id: 6795,
		round: 1244,
		numbers: [14, 17, 20, 25, 35, 44],
		createdAt: 1,
		displayName: "local",
	},
});
currentTab = "make";
savedTarget = {};
const renderWarnings: string[] = [];
const originalError = console.error;
console.error = (...args: unknown[]) =>
	renderWarnings.push(args.map(String).join(" "));
try {
	await act(async () => {
		root = create(<LottoScreen tab="make" />);
	});
	await act(async () => {
		root.unmount();
	});
} finally {
	console.error = originalError;
}
expect(renderWarnings.filter((line) => line.includes("same key"))).toEqual([]);
// Successful saves/results expose an optional review only after their UI settles.
Object.assign(model, {
	saved: [savedItem(20, 1244), savedItem(21, 1244)],
	foreground: true,
	busy: null,
	save: async (generation: { id: number; round: number }) => {
		model.saved = [...model.saved, savedItem(generation.id, generation.round)];
		return true;
	},
});
await act(async () => {
	root = create(<LottoScreen tab="make" />);
});
await act(async () => {
	root.root
		.findAllByType("button")
		.find((node) => node.props.children === "이 번호 보관하기")
		?.props.onPress();
});
expect(reviewSources).toEqual([]);
await act(async () => {
	await Bun.sleep(1600);
});
expect(reviewSources).toEqual(["save"]);
await act(async () => root.unmount());
model.saved = [savedItem(22, 1243)];
await act(async () => {
	root = create(<LottoScreen tab="saved" />);
});
await act(async () => {
	root.root.findByType("impression").props.onImpressionStart();
});
focused = false;
await act(async () => root.update(<LottoScreen tab="saved" />));
await act(async () => {
	await Bun.sleep(1600);
});
expect(reviewSources).toEqual(["save"]);
await act(async () => root.unmount());
focused = true;
await act(async () => {
	root = create(<LottoScreen tab="saved" />);
});
await act(async () => {
	root.root.findByType("impression").props.onImpressionStart();
});
await act(async () => {
	await Bun.sleep(1600);
});
expect(reviewSources).toEqual(["save", "results"]);
await act(async () => root.unmount());
console.log("native result pages preserve selection and tab returns");
