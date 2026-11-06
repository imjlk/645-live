import {
	type PropsWithChildren,
	startTransition,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useLottoContext } from "./LottoProvider";
import { LottoScreen } from "./LottoScreen";
import { type LottoTab, navigateToTab } from "./navigation";
import { createPerformanceTracker } from "./performance";
import { ResultNotificationPrompt } from "./ResultNotificationPrompt";
import { savedParams, unreadSavedRounds } from "./result-return";
import { TabShellContext, useOverlayStack } from "./TabShell";
import { trackProduct } from "./telemetry";
import { useTheme } from "./theme";
import { Tab } from "./web/controls";
import { Focus, navigation, useRouteState } from "./web/navigation";
import { StyleSheet, useWindowDimensions, View } from "./web/primitives";
import { useSafeAreaInsets } from "./web/safe-area";
import { useBackEvent, useVisibility } from "./web/viewport";

const idleScheduler = globalThis as typeof globalThis & {
	requestIdleCallback?: (
		callback: () => void,
		options: { timeout: number },
	) => number;
	cancelIdleCallback?: (handle: number) => void;
};
export function LottoTabs() {
	const { tab, saved } = useRouteState();
	const state = {
		index: ["make", "live", "saved"].indexOf(tab),
		routes: (["make", "live", "saved"] as const).map((name) => ({
			name,
			key: name,
			params: name === "saved" ? saved : undefined,
		})),
	};
	const [loaded, setLoaded] = useState<string[]>([
		state.routes[state.index].key,
	]);
	const performance = useMemo(() => createPerformanceTracker(trackProduct), []);
	const pendingTab = useRef<{
		tab: LottoTab;
		timing: ReturnType<typeof performance.start>;
	} | null>(null);
	useEffect(
		() => () => {
			pendingTab.current?.timing.end("canceled");
			pendingTab.current = null;
		},
		[],
	);
	useEffect(() => {
		if (pendingTab.current && pendingTab.current.tab !== tab) {
			pendingTab.current.timing.end("canceled");
			pendingTab.current = null;
		}
	}, [tab]);
	const currentKey = state.routes[state.index].key;
	useLayoutEffect(() => {
		setLoaded((current) =>
			current.includes(currentKey) ? current : [...current, currentKey],
		);
	}, [currentKey]);
	const routeKeys = state.routes
		.filter((route) => route.name === "live")
		.map((route) => route.key)
		.join(",");
	useEffect(() => {
		// Warm the expensive feed during idle time. Keep the saved screen's native
		// image controls lazy; visited scenes retain their layout and local state.
		const queue = routeKeys.split(",");
		let cancelled = false;
		let timer: ReturnType<typeof setTimeout> | undefined;
		let idle: number | undefined;
		const prepare = () => {
			if (cancelled) return;
			const key = queue.shift();
			if (!key) return;
			startTransition(() => {
				setLoaded((current) =>
					current.includes(key) ? current : [...current, key],
				);
			});
			schedule();
		};
		const schedule = () => {
			if (!queue.length || cancelled) return;
			if (typeof idleScheduler.requestIdleCallback === "function")
				idle = idleScheduler.requestIdleCallback(prepare, { timeout: 500 });
			else timer = setTimeout(prepare, 40);
		};
		schedule();
		return () => {
			cancelled = true;
			if (idle !== undefined) idleScheduler.cancelIdleCallback?.(idle);
			clearTimeout(timer);
		};
	}, [routeKeys]);
	const { model } = useLottoContext();
	const hasUnreadResults = useMemo(
		() => unreadSavedRounds(model.saved, model.results).length > 0,
		[model.saved, model.results],
	);
	const theme = useTheme();
	const insets = useSafeAreaInsets();
	const { fontScale } = useWindowDimensions();
	const visible = useVisibility();
	useEffect(() => {
		if (!visible || model.foreground === false) {
			pendingTab.current?.timing.end("canceled");
			pendingTab.current = null;
		}
	}, [visible, model.foreground]);
	const [tabBarHeight, setTabBarHeight] = useState(72);
	const { overlay, presentOverlay } = useOverlayStack();
	const backEvent = useBackEvent();
	useLayoutEffect(() => {
		if (!visible || !overlay) return;
		const back = () => overlay.onBack();
		backEvent.addEventListener(back);
		return () => backEvent.removeEventListener(back);
	}, [visible, overlay, backEvent]);
	return (
		<>
			<TabShellContext.Provider
				value={{
					tabBarHeight,
					presentOverlay,
					savedTarget: savedParams(
						state.routes.find((route) => route.name === "saved")?.params,
					),
				}}
			>
				<View style={[s.root, { backgroundColor: theme.background }]}>
					{state.routes.map((route, index) =>
						loaded.includes(route.key) || index === state.index ? (
							<TabScene
								key={route.key}
								focused={index === state.index}
								onReady={() => {
									if (pendingTab.current?.tab === route.name) {
										pendingTab.current.timing.end(
											visible && model.foreground !== false
												? "ready"
												: "canceled",
										);
										pendingTab.current = null;
									}
								}}
							>
								<Focus.Provider value={visible && index === state.index}>
									<LottoScreen tab={route.name} />
								</Focus.Provider>
							</TabScene>
						) : null,
					)}
					<View
						testID="lotto-fixed-tabs"
						pointerEvents={overlay ? "none" : "box-none"}
						accessibilityElementsHidden={!!overlay}
						importantForAccessibility={overlay ? "no-hide-descendants" : "auto"}
						style={[
							s.fixed,
							{ bottom: insets.bottom, opacity: overlay ? 0 : 1 },
						]}
					>
						<View
							onLayout={({ nativeEvent }) =>
								setTabBarHeight(nativeEvent.layout.height)
							}
							style={s.spacing}
						>
							<View
								style={[
									s.dock,
									{
										backgroundColor: theme.background,
										borderColor: theme.line,
									},
								]}
							>
								<View style={s.clip}>
									<Tab
										value={tab}
										onChange={(next) => {
											if (
												!visible ||
												overlay ||
												next === tab ||
												(next !== "make" && next !== "live" && next !== "saved")
											)
												return;
											pendingTab.current?.timing.end("canceled");
											const timing = performance.start("tab_navigation", next);
											pendingTab.current = { tab: next, timing };
											if (!navigateToTab(navigation, tab, next, true)) {
												timing.end("canceled");
												pendingTab.current = null;
											}
										}}
										size="large"
										fluid={fontScale > 1.25}
									>
										<Tab.Item value="make">번호 만들기</Tab.Item>
										<Tab.Item value="live">실시간</Tab.Item>
										<Tab.Item
											value="saved"
											redBean={!!model.celebration || hasUnreadResults}
										>
											보관함
										</Tab.Item>
									</Tab>
								</View>
							</View>
						</View>
					</View>
				</View>
				<ResultNotificationPrompt />
			</TabShellContext.Provider>
		</>
	);
}

function TabScene({
	focused,
	children,
	onReady,
}: PropsWithChildren<{ focused: boolean; onReady: () => void }>) {
	const callback = useRef(onReady);
	callback.current = onReady;
	useLayoutEffect(() => {
		if (!focused) return;
		const frame = requestAnimationFrame(() => callback.current());
		return () => cancelAnimationFrame(frame);
	}, [focused]);
	return (
		<div
			aria-hidden={!focused}
			style={{
				position: "absolute",
				inset: 0,
				display: focused ? "flex" : "none",
				flexDirection: "column",
			}}
		>
			{children}
		</div>
	);
}

const s = StyleSheet.create({
	root: { flex: 1 },
	fixed: { position: "absolute", left: 0, right: 0 },
	spacing: {
		width: "100%",
		maxWidth: 640,
		alignSelf: "center",
		paddingHorizontal: 16,
		paddingVertical: 8,
	},
	dock: {
		borderRadius: 24,
		borderWidth: StyleSheet.hairlineWidth,
		shadowColor: "#000000",
		shadowOffset: { width: 0, height: 4 },
		shadowRadius: 12,
		shadowOpacity: 0.1,
		elevation: 6,
	},
	clip: { borderRadius: 24, overflow: "hidden" },
});
