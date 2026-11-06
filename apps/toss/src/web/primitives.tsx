// The existing layouts render as DOM elements through react-native-web.

export type { StyleProp, TextStyle } from "rn-layout-types";
export {
	AccessibilityInfo,
	ActivityIndicator,
	Animated,
	AppState,
	Easing,
	FlatList,
	Image,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	useWindowDimensions,
	View,
} from "./layout";

import { useRef } from "react";
export function RefreshControl({
	refreshing,
	onRefresh,
	children,
}: React.PropsWithChildren<{
	refreshing: boolean;
	onRefresh: () => void;
	tintColor?: string;
}>) {
	// ScrollView supplies its scrollable DOM subtree as children. Swipe from its top to refresh.
	const start = useRef<number | null>(null);
	return (
		<div
			style={{
				display: "flex",
				flex: 1,
				minHeight: 0,
				flexDirection: "column",
			}}
			onTouchStart={(e) => {
				const target =
					(e.target as Element).closest("[data-scroll-root]") ??
					e.currentTarget.firstElementChild;
				start.current =
					target && target.scrollTop === 0 ? e.touches[0].clientY : null;
			}}
			onTouchEnd={(e) => {
				if (
					start.current !== null &&
					!refreshing &&
					e.changedTouches[0].clientY - start.current > 72
				)
					onRefresh();
				start.current = null;
			}}
			onTouchCancel={() => {
				start.current = null;
			}}
		>
			{children}
		</div>
	);
}
export const Alert = {
	alert(
		title: string,
		message: string,
		buttons?: { text: string; style?: string; onPress?: () => void }[],
	) {
		const action = buttons?.find((button) => button.onPress);
		if (action) {
			if (window.confirm([title, message, action.text].join("\n")))
				action.onPress?.();
		} else window.alert([title, message].join("\n"));
	},
};
