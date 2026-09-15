import {
	CommonActions,
	createNavigatorFactory,
	type DefaultNavigatorOptions,
	type ParamListBase,
	type TabActionHelpers,
	type TabNavigationState,
	TabRouter,
	type TabRouterOptions,
	useNavigationBuilder,
} from "@granite-js/native/@react-navigation/native";
import { useBackEvent, useVisibility } from "@granite-js/react-native";
import { Tab, TDSProvider } from "@toss/tds-react-native";
import {
	type PropsWithChildren,
	startTransition,
	useCallback,
	useEffect,
	useLayoutEffect,
	useState,
} from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLottoContext } from "./LottoProvider";
import { LottoScreen } from "./LottoScreen";
import { type LottoTab, navigateToTab, TAB_BACK_BEHAVIOR } from "./navigation";
import { TabShellContext } from "./TabShell";
import { useTheme } from "./theme";

type Options = Record<string, never>;
const idleScheduler = globalThis as typeof globalThis & {
	requestIdleCallback?: (
		callback: () => void,
		options: { timeout: number },
	) => number;
	cancelIdleCallback?: (handle: number) => void;
};
type NavigatorProps = DefaultNavigatorOptions<
	ParamListBase,
	undefined,
	TabNavigationState<ParamListBase>,
	Options,
	Options,
	unknown
> &
	TabRouterOptions;

function TabNavigator(props: NavigatorProps) {
	const { state, navigation, descriptors, NavigationContent } =
		useNavigationBuilder<
			TabNavigationState<ParamListBase>,
			TabRouterOptions,
			TabActionHelpers<ParamListBase>,
			Options,
			Options
		>(TabRouter, props);
	const tab = state.routes[state.index].name as LottoTab;
	const [loaded, setLoaded] = useState([state.routes[state.index].key]);
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
	const theme = useTheme();
	const insets = useSafeAreaInsets();
	const { fontScale } = useWindowDimensions();
	const visible = useVisibility();
	const [tabBarHeight, setTabBarHeight] = useState(72);
	const [overlay, setOverlay] = useState<{ onBack: () => void } | null>(null);
	const presentOverlay = useCallback((onBack: () => void) => {
		const owner = { onBack };
		setOverlay(owner);
		return () => setOverlay((current) => (current === owner ? null : current));
	}, []);
	const backEvent = useBackEvent();
	useLayoutEffect(() => {
		if (!visible || (!overlay && state.history.length < 2)) return;
		const back = () => {
			if (overlay) overlay.onBack();
			else
				navigation.dispatch({ ...CommonActions.goBack(), target: state.key });
		};
		// Granite's header is outside this navigator. One handler forwards header
		// and hardware Back to the sheet or to the standard tab history.
		backEvent.addEventListener(back);
		return () => backEvent.removeEventListener(back);
	}, [
		backEvent,
		navigation,
		overlay,
		state.history.length,
		state.key,
		visible,
	]);

	return (
		<NavigationContent>
			<TabShellContext.Provider value={{ tabBarHeight, presentOverlay }}>
				<View style={[s.root, { backgroundColor: theme.background }]}>
					{state.routes.map((route, index) =>
						loaded.includes(route.key) || index === state.index ? (
							<TabScene key={route.key} focused={index === state.index}>
								{descriptors[route.key].render()}
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
										onChange={(next) =>
											navigateToTab(navigation, tab, next, visible && !overlay)
										}
										size="large"
										fluid={fontScale > 1.25}
									>
										<Tab.Item value="make">번호 만들기</Tab.Item>
										<Tab.Item value="live">실시간</Tab.Item>
										<Tab.Item value="saved" redBean={!!model.celebration}>
											보관함
										</Tab.Item>
									</Tab>
								</View>
							</View>
						</View>
					</View>
				</View>
			</TabShellContext.Provider>
		</NavigationContent>
	);
}

function TabScene({
	focused,
	children,
}: PropsWithChildren<{ focused: boolean }>) {
	const [measured, setMeasured] = useState(false);
	const [ready, setReady] = useState(false);
	useLayoutEffect(() => {
		if (!measured) return;
		const frame = requestAnimationFrame(() => setReady(true));
		return () => cancelAnimationFrame(frame);
	}, [measured]);
	return (
		<View
			style={[StyleSheet.absoluteFill, { opacity: focused && ready ? 1 : 0 }]}
			pointerEvents={focused ? "auto" : "none"}
			accessibilityElementsHidden={!focused}
			importantForAccessibility={focused ? "auto" : "no-hide-descendants"}
			onLayout={({ nativeEvent }) => {
				if (nativeEvent.layout.width > 0 && nativeEvent.layout.height > 0)
					setMeasured(true);
			}}
		>
			{children}
		</View>
	);
}

const Tabs = createNavigatorFactory(TabNavigator)();
function MakeScreen() {
	return <LottoScreen tab="make" />;
}
function LiveScreen() {
	return <LottoScreen tab="live" />;
}
function SavedScreen() {
	return <LottoScreen tab="saved" />;
}

export function LottoTabs({ initialTab = "make" }: { initialTab?: LottoTab }) {
	return (
		<TDSProvider colorPreference="light" fontScaleAvailable>
			<Tabs.Navigator
				initialRouteName={initialTab}
				backBehavior={TAB_BACK_BEHAVIOR}
			>
				<Tabs.Screen name="make" component={MakeScreen} />
				<Tabs.Screen name="live" component={LiveScreen} />
				<Tabs.Screen name="saved" component={SavedScreen} />
			</Tabs.Navigator>
		</TDSProvider>
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
