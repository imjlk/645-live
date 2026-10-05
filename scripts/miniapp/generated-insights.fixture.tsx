// Native mocks stay in this subprocess; exercise the real screen, controller and overlays.
import { expect, mock } from "bun:test";
import type { Feed, Generation } from "@645/lotto-core";
import * as React from "react";
import { act, create } from "react-test-renderer";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
mock.module(
	Bun.resolveSync("react", `${import.meta.dir}/../../apps/toss`),
	() => React,
);
const host = (name: string) => (props: Record<string, unknown>) =>
	React.createElement(name, props, props.children as React.ReactNode);
const io = React.createContext<{ manager: object | null }>({ manager: null });
let visible = true;
const back = new Set<() => void>();
const backEvent = {
	addEventListener: (fn: () => void) => back.add(fn),
	removeEventListener: (fn: () => void) => back.delete(fn),
};
let returns = 0;
mock.module("@granite-js/native/@react-navigation/native", () => ({
	useIsFocused: () => true,
}));
mock.module("@granite-js/react-native", () => ({
	IOContext: io,
	InView: ({
		onChange,
		children,
	}: {
		onChange: (visible: boolean, ratio: number) => void;
		children: React.ReactNode;
	}) => {
		React.useEffect(() => {
			onChange(true, 1);
		}, []);
		return children;
	},
	IOScrollView: (props: Record<string, unknown>) => (
		<io.Provider value={{ manager: {} }}>
			<scroll {...props}>{props.children as React.ReactNode}</scroll>
		</io.Provider>
	),
	useVisibility: () => visible,
	useBackEvent: () => backEvent,
	useNavigation: () => ({ canGoBack: () => true, goBack: () => returns++ }),
	useParams: () => ({ round: 1243, number: 7 }),
}));
const appState = new Set<(state: string) => void>();
mock.module("react-native", () => ({
	View: "view",
	Text: "text",
	ScrollView: "scroll",
	Pressable: "pressable",
	ActivityIndicator: "spinner",
	StyleSheet: { create: (s: unknown) => s, hairlineWidth: 0.5 },
	AppState: {
		currentState: "active",
		addEventListener: (_: string, fn: (state: string) => void) => {
			appState.add(fn);
			return { remove: () => appState.delete(fn) };
		},
	},
}));
mock.module("react-native-safe-area-context", () => ({
	useSafeAreaInsets: () => ({ top: 0, bottom: 24 }),
}));
mock.module("@toss/tds-react-native", () => ({
	TDSProvider: host("tds"),
	Button: "button",
	Badge: "badge",
	SegmentedControl: { Root: "segmented", Item: "item" },
	ConfirmDialog: Object.assign(host("dialog"), { Button: "dialogButton" }),
}));
mock.module("@toss/tds-react-native/private", () => ({
	HideAccessibilityProvider: host("accessible"),
	HideAccessibilityView: "hiddenView",
}));
mock.module("@apps-in-toss/framework", () => ({
	getOperationalEnvironment: () => "toss",
	isMinVersionSupported: () => true,
	InlineAd: (props: object) => {
		if (!React.useContext(io).manager)
			throw new Error("Ad outside Granite IO root");
		return React.createElement("nativeAd", props);
	},
}));
mock.module("@trailbase-apps-in-toss-kit/ait-rn/inline-ads", () => ({
	isAppsInTossInlineAdSupported: async () => true,
}));
mock.module("../../apps/toss/src/api", () => ({
	API_BASE: "https://insights.invalid",
	LOCAL_PREVIEW: false,
}));
const productEvents: string[] = [];
mock.module("../../apps/toss/src/telemetry", () => ({
	trackProduct: (event: string) => productEvents.push(event),
	adTelemetry: { track() {} },
}));
mock.module("../../apps/toss/src/theme", () => ({
	useTheme: () => ({
		text: "black",
		muted: "gray",
		blue: "blue",
		line: "gray",
		surface: "white",
	}),
}));
mock.module("../../apps/toss/src/Balls", () => ({ Balls: host("balls") }));
let uses = 0;
const model = {
	saved: [],
	user: {},
	busy: null,
	featureAdRequired: false,
	actionError: null,
	adConfig: {
		placements: [{ placement: "report", enabled: true }],
		bannerGroups: { card: "card", inline: "inline" },
		feedInlineGroupIds: ["feed-inline"],
	},
	featureUsed() {
		uses++;
	},
	continueFeature: async () => true,
};
mock.module("../../apps/toss/src/LottoProvider", () => ({
	useLottoContext: () => ({ model }),
}));
const intervals = new Map<number, () => void>();
let timerId = 0;
globalThis.setInterval = ((fn: () => void) => {
	intervals.set(++timerId, fn);
	return timerId;
}) as typeof setInterval;
globalThis.clearInterval = ((id: number) =>
	intervals.delete(id)) as typeof clearInterval;
const requests: URL[] = [];
const signals: AbortSignal[] = [];
const counts = Array.from({ length: 45 }, (_, index) =>
	[7, 10, 25, 29, 30, 43].includes(index + 1) ? 3 : 0,
);
const source = (kind: string) => ({
	source: kind,
	records: 3,
	numberCounts: kind === "generated" ? counts : Array(45).fill(100),
	previousCounts: Array(45).fill(0),
	rounds: [],
	patterns: {
		combinations: 3,
		oddCounts: [0, 0, 0, 0, 3, 0, 0],
		sumCounts: Array.from({ length: 14 }, (_, i) => (i === 7 ? 3 : 0)),
		withConsecutive: 3,
		since: 1,
	},
	pairs: [{ a: 7, b: 10, count: 3 }],
	hours: [],
});
let hold: (() => void) | null = null;
let empty = false;
globalThis.fetch = (async (
	input: string | URL | Request,
	init?: RequestInit,
) => {
	const url = new URL(String(input));
	requests.push(url);
	signals.push(init?.signal as AbortSignal);
	if (hold)
		await new Promise<void>((resolve) => {
			hold = resolve;
		});
	return Response.json({
		round: Number(url.searchParams.get("round") ?? 1244),
		currentRound: 1244,
		period: url.searchParams.get("period") ?? "round",
		updatedAt: 1,
		knownRounds: [1244, 1243],
		draw: null,
		sources: {
			generated: empty
				? {
						...source("generated"),
						records: 0,
						numberCounts: Array(45).fill(0),
						pairs: [],
						patterns: {
							combinations: 0,
							oddCounts: Array(7).fill(0),
							sumCounts: Array(14).fill(0),
							withConsecutive: 0,
							since: null,
						},
					}
				: source("generated"),
			scanned: source("scanned"),
		},
	});
}) as typeof fetch;
const { GeneratedInsightsScreen } = await import(
	"../../apps/toss/src/GeneratedInsightsScreen"
);
let root!: ReturnType<typeof create>;
await act(async () => {
	root = create(<GeneratedInsightsScreen />);
});
const text = () => JSON.stringify(root.toJSON());
const button = (label: string) =>
	root.root.findAllByType("button").find((n) => n.props.children === label);
expect(productEvents.filter((e) => e === "insights_viewed")).toHaveLength(1);
expect(
	productEvents.filter((e) => e === "insights_detail_viewed"),
).toHaveLength(1);
await act(async () => {
	root.update(<GeneratedInsightsScreen />);
});
expect(productEvents.filter((e) => e === "insights_viewed")).toHaveLength(1);
expect(
	productEvents.filter((e) => e === "insights_detail_viewed"),
).toHaveLength(1);
expect(requests).toHaveLength(1);
expect(requests[0].searchParams.get("round")).toBe("1243");
expect(text()).toContain("7번 자세히 보기");
expect(text()).not.toContain("QR 스캔");
expect(text()).not.toContain("생성과 스캔");
expect(back.size).toBe(0);
expect(intervals.size).toBe(1);
expect(
	root.root
		.findAllByType("nativeAd")
		.map((n) => [n.props.adGroupId, n.props.variant]),
).toEqual([["card", "card"]]);
await act(async () => {
	button("조합 패턴 더 보기")?.props.onPress();
});
expect(uses).toBe(1);
expect(requests).toHaveLength(1);
expect(
	root.root
		.findAllByType("nativeAd")
		.map((n) => [n.props.adGroupId, n.props.variant]),
).toEqual([
	["card", "card"],
	["feed-inline", "expanded"],
]);
expect(text()).not.toContain("스캔");
// An expanded section remains collapsible when the selected round has no records.
empty = true;
await act(async () => {
	button("다음")?.props.onPress();
});
expect(text()).toContain("아직 모인 번호가 없어요");
expect(button("조합 패턴 접기")?.props.disabled).toBe(false);
await act(async () => {
	button("조합 패턴 접기")?.props.onPress();
});
expect(button("조합 패턴 더 보기")?.props.disabled).toBe(true);
empty = false;
await act(async () => {
	button("이전")?.props.onPress();
});
await act(async () => {
	for (const fn of appState) fn("background");
});
expect(intervals.size).toBe(0);
await act(async () => {
	for (const fn of appState) fn("active");
});
expect(intervals.size).toBe(1);
model.featureAdRequired = true;
await act(async () => {
	root.update(<GeneratedInsightsScreen />);
	button("조합 패턴 더 보기")?.props.onPress();
});
expect(back.size).toBe(1);
await act(async () => {
	for (const fn of back) fn();
});
expect(root.root.findByType("dialog").props.open).toBe(false);
await act(async () => {
	root.root.findByType("dialog").props.onExited();
});
expect(back.size).toBe(0);
expect(uses).toBe(1);
expect(
	productEvents.filter((e) => e === "insights_patterns_viewed"),
).toHaveLength(1);
// Native navigation owns Back; no competing in-content Back button is rendered.
expect(button("이전 화면으로 돌아가기")).toBeUndefined();
expect(returns).toBe(0);
// A transport that ignores cancellation cannot publish after the detail screen becomes hidden.
hold = () => {};
await act(async () => {
	for (const fn of intervals.values()) fn();
});
const lastSignal = signals.at(-1);
visible = false;
await act(async () => {
	root.update(<GeneratedInsightsScreen />);
});
expect(intervals.size).toBe(0);
expect(lastSignal?.aborted).toBe(true);
// Data work stops immediately; the requested SDK banner stays mounted during
// the short retention window and is released with the screen below.
expect(root.root.findAllByType("nativeAd")).toHaveLength(1);
await act(async () => {
	hold?.();
});
await act(async () => {
	root.unmount();
});
expect(back.size).toBe(0);
expect(appState.size).toBe(0);

// The compact preview upgrades cached hints without issuing requests or cycling
// the chosen number. Publication receipts do not depend on feed pagination.
const { GenerationInsightPreview } = await import(
	"../../apps/toss/src/GenerationInsightPreview"
);
const generation: Generation = {
	id: 6,
	round: 1244,
	numbers: [7, 10, 25, 29, 30, 43],
	displayName: "",
	createdAt: 1,
};
const feed: Feed = {
	round: 1244,
	generations: [],
	totalGenerations: 3,
	numberCounts: counts,
	activeUsers: 1,
	serverTime: 1,
};
const opened: unknown[] = [];
const preview = (snapshot: Feed | null) => (
	<GenerationInsightPreview
		generation={generation}
		feed={snapshot}
		published
		onInsights={(round) => opened.push([round])}
	/>
);
const requestCount = requests.length;
await act(async () => {
	root = create(preview(null));
});
expect(text()).toContain("홀수 4개, 짝수 2개");
expect(text()).toContain("✓ 실시간 등록");
expect(root.root.findAllByType("button")).toHaveLength(0);
await act(async () => {
	root.update(preview(feed));
});
expect(text()).toContain("7번은 이번 회차에 3회");
const previewLink = () =>
	root.root.findByProps({ accessibilityLabel: "생성 통계 보기" });
await act(async () => {
	previewLink().props.onPress();
});
expect(opened).toEqual([[1244]]);
await act(async () => {
	root.update(
		preview({
			...feed,
			numberCounts: feed.numberCounts.map((count) => count + 1),
		}),
	);
});
expect(text()).toContain("7번은 이번 회차에 4회");
// New combinations start with different number hints; the one CTA always opens
// basic statistics without silently spending a number-detail ad action.
await act(async () => {
	root.update(
		<GenerationInsightPreview
			key={7}
			generation={{ ...generation, id: 7 }}
			feed={feed}
			onInsights={() => {}}
		/>,
	);
});
expect(text()).toContain("10번은 이번 회차에 3회");
expect(text()).not.toContain("✓ 실시간 등록");
await act(async () => {
	root.update(
		<GenerationInsightPreview
			key={8}
			generation={{ ...generation, id: 8 }}
			feed={feed}
			onInsights={(round) => opened.push([round])}
		/>,
	);
});
expect(text()).toContain("25번은 이번 회차에 3회");
await act(async () => {
	previewLink().props.onPress();
});
expect(opened.at(-1)).toEqual([1244]);
// Overview statistics are available before generating; an old snapshot is not
// labelled as the new round's activity.
await act(async () => {
	root.update(
		<GenerationInsightPreview
			key="overview"
			generation={null}
			round={1244}
			feed={feed}
			onInsights={(round) => opened.push([round])}
		/>,
	);
});
expect(text()).toContain("이번 회차에 3개 조합이 모였어요.");
await act(async () => {
	previewLink().props.onPress();
});
expect(opened.at(-1)).toEqual([1244]);
await act(async () => {
	root.update(
		<GenerationInsightPreview
			key="next-round"
			generation={null}
			round={1245}
			feed={feed}
			onInsights={() => {}}
		/>,
	);
});
expect(text()).not.toContain("3개 조합");
expect(requests).toHaveLength(requestCount);
await act(async () => {
	root.unmount();
});
// Personal comparisons use local data only and honor the shared feature continuation.
const { SavedCombinationComparison } = await import(
	"../../apps/toss/src/SavedCombinationComparison"
);
let pendingExplore: (() => void) | null = null;
const savedItem = (
	id: number,
	round: number,
	numbers: Generation["numbers"],
) => ({
	version: 1 as const,
	id: String(id),
	generationId: id,
	round,
	numbers,
	savedAt: id,
});
const compared = [
	savedItem(6, 1244, generation.numbers),
	savedItem(7, 1244, [7, 10, 25, 29, 31, 42]),
	savedItem(8, 1243, generation.numbers),
];
await act(async () => {
	root = create(
		<SavedCombinationComparison
			generation={generation}
			saved={compared}
			onExplore={(action) => {
				pendingExplore = action;
			}}
		/>,
	);
});
expect(text()).toContain("최대 4개 번호");
await act(async () => {
	button("보관한 조합과 비교")?.props.onPress();
});
expect(text()).not.toContain("가장 비슷한 보관 조합");
expect(
	productEvents.filter((e) => e === "saved_comparison_viewed"),
).toHaveLength(0);
// A canceled prompt leaves the section collapsed; only a successful continuation invokes it.
pendingExplore = null;
await act(async () => {
	button("보관한 조합과 비교")?.props.onPress();
	pendingExplore?.();
});
expect(text()).toContain("가장 비슷한 보관 조합");
expect(text()).toContain("다른 ");
expect(
	productEvents.filter((e) => e === "saved_comparison_viewed"),
).toHaveLength(1);
expect(requests).toHaveLength(requestCount);
await act(async () => {
	button("보관한 조합 비교 접기")?.props.onPress();
});
expect(text()).not.toContain("가장 비슷한 보관 조합");
await act(async () => {
	root.unmount();
});
console.log("generated insight screen lifecycle and cached preview passed");
