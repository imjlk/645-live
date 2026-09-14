import { LIVE_COUNT_MOTION_MS } from "@645/lotto-core";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
	Animated,
	Easing,
	type StyleProp,
	StyleSheet,
	Text,
	type TextStyle,
	View,
} from "react-native";
import { useTheme } from "./theme";

export function useLiveCount(count: number, reducedMotion: boolean) {
	const progress = useRef(new Animated.Value(1)).current;
	const latest = useRef(count);
	const [previous, setPrevious] = useState(count);
	useLayoutEffect(() => {
		const before = latest.current;
		latest.current = count;
		progress.setValue(1);
		// First snapshots, corrections and accessibility changes establish a baseline.
		if (reducedMotion || count <= before) return;
		setPrevious(before);
		progress.setValue(0);
		const animation = Animated.timing(progress, {
			toValue: 1,
			duration: LIVE_COUNT_MOTION_MS,
			easing: Easing.linear,
			useNativeDriver: true,
			isInteraction: false,
		});
		animation.start();
		return () => animation.stop();
	}, [count, reducedMotion, progress]);
	// Keep the native animation graph connected while text and live rows update.
	const motion = useMemo(
		() => ({
			previous: {
				opacity: progress.interpolate({
					inputRange: [0, 0.3, 1],
					outputRange: [1, 0, 0],
				}),
				transform: [
					{
						translateY: progress.interpolate({
							inputRange: [0, 0.5, 1],
							outputRange: [0, -18, -18],
						}),
					},
				],
			},
			current: {
				opacity: progress.interpolate({
					inputRange: [0, 0.5, 1],
					outputRange: [0, 1, 1],
				}),
				transform: [
					{
						translateY: progress.interpolate({
							inputRange: [0, 0.5, 1],
							outputRange: [18, 0, 0],
						}),
					},
				],
			},
			delta: {
				opacity: progress.interpolate({
					inputRange: [0, 0.12, 0.75, 1],
					outputRange: [0, 1, 1, 0],
				}),
			},
		}),
		[progress],
	);
	return {
		count,
		previous,
		delta: Math.max(0, count - previous),
		progress,
		motion,
	};
}

export function LiveCount({
	change,
	style,
}: {
	change: ReturnType<typeof useLiveCount>;
	style: StyleProp<TextStyle>;
}) {
	return (
		<View
			style={s.counter}
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
		>
			<Text numberOfLines={1} style={[style, s.measure]}>
				{change.count.toLocaleString()}
			</Text>
			<Animated.Text
				numberOfLines={1}
				style={[style, s.digit, change.motion.previous]}
			>
				{change.previous.toLocaleString()}
			</Animated.Text>
			<Animated.Text
				numberOfLines={1}
				style={[style, s.digit, change.motion.current]}
			>
				{change.count.toLocaleString()}
			</Animated.Text>
		</View>
	);
}

export function LiveTotal({
	count,
	reducedMotion,
}: {
	count: number;
	reducedMotion: boolean;
}) {
	const theme = useTheme();
	const change = useLiveCount(count, reducedMotion);
	return (
		<View
			style={s.totalRow}
			accessible
			accessibilityLabel={`${count.toLocaleString()}개 조합 생성`}
		>
			<LiveCount change={change} style={[s.total, { color: theme.text }]} />
			<Text style={[s.label, { color: theme.muted }]}>조합 생성</Text>
			<Animated.Text
				style={[s.delta, { color: theme.blue }, change.motion.delta]}
				accessibilityElementsHidden
			>
				+{change.delta}
			</Animated.Text>
		</View>
	);
}

const s = StyleSheet.create({
	counter: { overflow: "hidden" },
	measure: { opacity: 0 },
	digit: { position: "absolute", top: 0, left: 0, right: 0 },
	totalRow: {
		flexDirection: "row",
		alignItems: "baseline",
		gap: 6,
		flexWrap: "wrap",
	},
	total: {
		fontSize: 34,
		lineHeight: 44,
		fontWeight: "700",
		letterSpacing: -0.8,
		fontVariant: ["tabular-nums"],
	},
	label: { fontSize: 15, lineHeight: 23, fontWeight: "500" },
	delta: { fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"] },
});
