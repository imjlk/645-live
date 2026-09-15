import type {
	NavigationProp,
	NavigationState,
	TabActionHelpers,
} from "@granite-js/native/@react-navigation/native";

export type LottoTab = "make" | "live" | "saved";
export type LottoTabParams = Record<LottoTab, undefined>;
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
