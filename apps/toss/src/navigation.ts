import type {
	NavigationProp,
	NavigationState,
	TabActionHelpers,
} from "@granite-js/native/@react-navigation/native";
import type { NativeStackNavigationProp } from "@granite-js/native/@react-navigation/native-stack";
import type { InsightsParams, ResultsParams } from "./insights-route";
import type { SavedParams } from "./result-return";

export type LottoTab = "make" | "live" | "saved";
export type LottoTabParams = {
	make: undefined;
	live: undefined;
	saved: SavedParams | undefined;
};
export type LottoTabNavigation = NavigationProp<LottoTabParams> &
	TabActionHelpers<LottoTabParams>;
// Keep the visit sequence like a browser, while TabRouter retains only three
// screen instances. History entries contain route keys, not native controllers.
export const TAB_BACK_BEHAVIOR = "fullHistory" as const;

export function navigateToTab(
	navigation: {
		getState(): Pick<NavigationState, "index" | "routes">;
		jumpTo(tab: LottoTab): void;
	},
	current: LottoTab,
	next: string,
	visible: boolean,
) {
	if (
		!visible ||
		(next !== "make" && next !== "live" && next !== "saved") ||
		current === next
	)
		return false;
	const state = navigation.getState();
	if (state.routes[state.index]?.name !== current) return false;
	navigation.jumpTo(next);
	return true;
}

/** Detail pages belong to Granite's parent stack, never to the tab router. */
export function navigateToInsights(
	navigation: Pick<LottoTabNavigation, "getState" | "getParent">,
	tab: LottoTab,
	visible: boolean,
	params: InsightsParams = {},
) {
	return navigateToDetail(navigation, tab, visible, "/insights", params);
}

export function navigateToGenerationResults(
	navigation: Pick<LottoTabNavigation, "getState" | "getParent">,
	tab: LottoTab,
	visible: boolean,
	params: ResultsParams = {},
) {
	return navigateToDetail(navigation, tab, visible, "/results", params);
}

export function navigateToNumberStatistics(
	navigation: Pick<LottoTabNavigation, "getState" | "getParent">,
	tab: LottoTab,
	visible: boolean,
	params: import("./insights-route").NumberStatisticsParams,
) {
	return navigateToDetail(navigation, tab, visible, "/numbers", params);
}

function navigateToDetail(
	navigation: Pick<LottoTabNavigation, "getState" | "getParent">,
	tab: LottoTab,
	visible: boolean,
	route: "/insights" | "/results" | "/numbers",
	params: InsightsParams,
) {
	if (!visible) return false;
	const tabs = navigation.getState();
	if (tabs.routes[tabs.index]?.name !== tab) return false;
	const parent =
		navigation.getParent<
			NativeStackNavigationProp<{
				"/insights": InsightsParams;
				"/results": ResultsParams;
				"/numbers": import("./insights-route").NumberStatisticsParams;
			}>
		>();
	if (!parent) return false;
	const stack = parent.getState();
	// A stale tab callback cannot place another detail above the first push.
	if (
		stack.type !== "stack" ||
		!["/", "/live", "/saved"].includes(stack.routes[stack.index]?.name)
	)
		return false;
	if (route === "/numbers") {
		if (params.number === undefined) return false;
		parent.push(route, { ...params, number: params.number });
	} else parent.push(route, params);
	return true;
}

/** Target an existing tab; no duplicate native screen/controller is created. */
export function navigateToSavedRound(
	navigation: {
		getState(): Pick<NavigationState, "index" | "routes">;
		jumpTo(tab: LottoTab, params?: SavedParams): void;
	},
	current: LottoTab,
	round: number,
	visible: boolean,
) {
	if (!visible || !Number.isSafeInteger(round) || round < 1) return false;
	const state = navigation.getState();
	if (state.routes[state.index]?.name !== current) return false;
	navigation.jumpTo("saved", { round, entry: "home" });
	return true;
}
