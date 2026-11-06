import {
	createContext,
	type PropsWithChildren,
	useEffect,
	useRef,
	useSyncExternalStore,
} from "react";
import { StyleSheet } from "./layout";
import { useIsFocused } from "./navigation";

export { openURL } from "@apps-in-toss/web-framework";
export type { FlatList as IOFlatListController } from "rn-layout-types";
export { FlatList as IOFlatList, ScrollView as IOScrollView } from "./layout";
export { useBackEvent, useNavigation, useParams } from "./navigation";
export const IOContext = createContext({
	manager: typeof IntersectionObserver === "function" ? {} : null,
});
const subscribe = (notify: () => void) => {
	document.addEventListener("visibilitychange", notify);
	return () => document.removeEventListener("visibilitychange", notify);
};
export function useVisibility() {
	const active = useSyncExternalStore(subscribe, () => !document.hidden);
	const focused = useIsFocused();
	return focused && active;
}
type ObserverProps = PropsWithChildren<{
	style?: object;
	accessibilityLabel?: string;
	enabled?: boolean;
	areaThreshold?: number;
	timeThreshold?: number;
	onChange?: (v: boolean, r: number) => void;
	onImpressionStart?: () => void;
}>;
export function InView({
	children,
	style,
	accessibilityLabel,
	enabled = true,
	areaThreshold = 0.5,
	timeThreshold = 0,
	onChange,
	onImpressionStart,
}: ObserverProps) {
	const host = useRef<HTMLElement>(null),
		latest = useRef({ onChange, onImpressionStart });
	latest.current = { onChange, onImpressionStart };
	useEffect(() => {
		if (
			!host.current ||
			!enabled ||
			typeof IntersectionObserver === "undefined"
		)
			return;
		let timer: ReturnType<typeof setTimeout> | undefined;
		const observer = new IntersectionObserver(
			([entry]) => {
				clearTimeout(timer);
				const visible =
					entry.isIntersecting && entry.intersectionRatio >= areaThreshold;
				latest.current.onChange?.(visible, entry.intersectionRatio);
				if (visible)
					timer = setTimeout(
						() => latest.current.onImpressionStart?.(),
						timeThreshold,
					);
			},
			{ threshold: [0, areaThreshold] },
		);
		observer.observe(host.current);
		return () => {
			clearTimeout(timer);
			observer.disconnect();
		};
	}, [enabled, areaThreshold, timeThreshold]);
	return (
		<section
			ref={host}
			aria-label={accessibilityLabel}
			style={StyleSheet.flatten(style)}
		>
			{children}
		</section>
	);
}
export const ImpressionArea = InView;
