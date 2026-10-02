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
mock.module("../../apps/toss/src/telemetry", () => ({
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
await act(async () => {
	button("이전 화면으로 돌아가기")?.props.onPress();
});
expect(returns).toBe(1);
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
expect(root.root.findAllByType("nativeAd")).toHaveLength(0);
await act(async () => {
	hold?.();
});
await act(async () => {
	root.unmount();
});
expect(back.size).toBe(0);
expect(appState.size).toBe(0);

// Cycling the local preview and receiving counters does not issue requests or change the chosen fact.
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
		onInsights={(round, number) => opened.push([round, number])}
	/>
);
const requestCount = requests.length;
await act(async () => {
	root = create(preview(null));
});
await act(async () => {
	button("다른 내용 보기")?.props.onPress();
});
expect(text()).toContain("번호 합계는 144");
await act(async () => {
	root.update(preview(feed));
});
expect(text()).toContain("번호 합계는 144");
await act(async () => {
	button("생성 통계 보기")?.props.onPress();
});
expect(opened).toEqual([[1244, undefined]]);
// New combinations start with different facts, including a number-specific entry.
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
expect(text()).toContain("연속된 번호가 1쌍");
await act(async () => {
	root.update(
		<GenerationInsightPreview
			key={8}
			generation={{ ...generation, id: 8 }}
			feed={feed}
			onInsights={(round, number) => opened.push([round, number])}
		/>,
	);
});
expect(text()).toContain("25번은 이번 회차에 3회");
await act(async () => {
	button("생성 통계 보기")?.props.onPress();
});
expect(opened.at(-1)).toEqual([1244, 25]);
expect(requests).toHaveLength(requestCount);
await act(async () => {
	root.unmount();
});
console.log("generated insight screen lifecycle and cached preview passed");
