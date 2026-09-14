import { ballColor, type Feed } from "@645/lotto-core";
import { memo, useLayoutEffect, useRef, useState } from "react";
import {
	Animated,
	Easing,
	StyleSheet,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import { useTheme } from "./theme";

const NUMBERS = Array.from({ length: 45 }, (_, i) => i + 1);

const NumberCell = memo(function NumberCell({
	number,
	count,
	reducedMotion,
	columns,
	size,
}: {
	number: number;
	count: number;
	reducedMotion: boolean;
	columns: 5 | 9;
	size: number;
}) {
	const theme = useTheme();
	const progress = useRef(new Animated.Value(1)).current;
	const latest = useRef(count);
	const [previousCount, setPreviousCount] = useState(count);
	const color = ballColor(number);
	const ballStyle = { width: size, height: size, borderRadius: size / 2 };

	useLayoutEffect(() => {
		const previous = latest.current;
		latest.current = count;
		progress.setValue(1);
		// Initial snapshots, deletions and motion preference changes stay still.
		if (reducedMotion || count <= previous) return;
		setPreviousCount(previous);
		progress.setValue(0);
		const animation = Animated.timing(progress, {
			toValue: 1,
			duration: 560,
			easing: Easing.linear,
			useNativeDriver: true,
			// Live events must not delay FlatList rendering or pagination.
			isInteraction: false,
		});
		animation.start();
		return () => animation.stop();
	}, [count, reducedMotion, progress]);

	const countStyle = [
		s.count,
		{
			color: theme.muted,
			fontSize: columns === 5 ? 14 : 11,
			lineHeight: columns === 5 ? 20 : 16,
			fontWeight: columns === 5 ? ("600" as const) : ("400" as const),
		},
	];
	return (
		<View
			style={[
				s.cell,
				{
					width: columns === 5 ? "20%" : "11.111%",
					paddingVertical: columns === 5 ? 12 : 8,
				},
			]}
			accessible
			accessibilityLabel={`${number}번 ${count}회 생성`}
		>
			<View style={ballStyle}>
				<Animated.View
					pointerEvents="none"
					style={[
						s.ring,
						ballStyle,
						{
							borderColor: color,
							opacity: progress.interpolate({
								inputRange: [0, 0.15, 0.7, 1],
								outputRange: [0, 0.5, 0.15, 0],
							}),
							transform: [
								{
									scale: progress.interpolate({
										inputRange: [0, 1],
										outputRange: [1, 1.4],
									}),
								},
							],
						},
					]}
				/>
				<Animated.View
					style={[
						s.ball,
						ballStyle,
						{
							backgroundColor: color,
							transform: [
								{
									scale: progress.interpolate({
										inputRange: [0, 0.2, 0.55, 1],
										outputRange: [1, 1.18, 1, 1],
									}),
								},
								{
									translateY: progress.interpolate({
										inputRange: [0, 0.2, 0.55, 1],
										outputRange: [0, -4, 0, 0],
									}),
								},
							],
						},
					]}
				>
					<Text
						style={[
							s.number,
							{
								color: number <= 10 ? "#3D3000" : "#FFF",
								fontSize: columns === 5 ? Math.round(size * 0.4) : 14,
							},
						]}
					>
						{number}
					</Text>
				</Animated.View>
			</View>
			<View
				style={s.counter}
				accessibilityElementsHidden
				importantForAccessibility="no-hide-descendants"
			>
				{/* Reserve the real text height, including the device's font scale. */}
				<Text numberOfLines={1} style={[countStyle, s.measure]}>
					{count}
				</Text>
				<Animated.Text
					numberOfLines={1}
					style={[
						countStyle,
						s.digit,
						{
							opacity: progress.interpolate({
								inputRange: [0, 0.5, 1],
								outputRange: [1, 0, 0],
							}),
							transform: [
								{
									translateY: progress.interpolate({
										inputRange: [0, 0.6, 1],
										outputRange: [0, -12, -12],
									}),
								},
							],
						},
					]}
				>
					{previousCount}
				</Animated.Text>
				<Animated.Text
					numberOfLines={1}
					style={[
						countStyle,
						s.digit,
						{
							opacity: progress.interpolate({
								inputRange: [0, 0.6, 1],
								outputRange: [0, 1, 1],
							}),
							transform: [
								{
									translateY: progress.interpolate({
										inputRange: [0, 0.6, 1],
										outputRange: [12, 0, 0],
									}),
								},
							],
						},
					]}
				>
					{count}
				</Animated.Text>
			</View>
		</View>
	);
});

export function LiveNumberGrid({
	feed,
	reducedMotion,
	columns,
}: {
	feed: Pick<Feed, "round" | "numberCounts"> | null;
	reducedMotion: boolean;
	columns: 5 | 9;
}) {
	const { width } = useWindowDimensions();
	const [gridWidth, setGridWidth] = useState(Math.min(width, 640) - 36);
	const size =
		columns === 5 ? Math.min(56, Math.floor(gridWidth / 5 - 16)) : 28;
	return (
		<View
			style={s.grid}
			onLayout={({ nativeEvent }) => {
				if (nativeEvent.layout.width > 0)
					setGridWidth(nativeEvent.layout.width);
			}}
		>
			{NUMBERS.map((number) => (
				<NumberCell
					// A newly loaded round establishes a baseline, not 45 increases.
					key={`${feed?.round ?? "loading"}:${number}`}
					number={number}
					count={feed?.numberCounts[number - 1] ?? 0}
					reducedMotion={reducedMotion}
					columns={columns}
					size={size}
				/>
			))}
		</View>
	);
}

const s = StyleSheet.create({
	grid: {
		flexDirection: "row",
		flexWrap: "wrap",
		marginTop: 18,
		marginHorizontal: -2,
	},
	cell: {
		alignItems: "center",
		gap: 6,
	},
	ball: {
		alignItems: "center",
		justifyContent: "center",
	},
	ring: {
		position: "absolute",
		borderWidth: 1.5,
	},
	number: { fontWeight: "700" },
	counter: { width: "100%", overflow: "hidden" },
	count: {
		textAlign: "center",
		fontVariant: ["tabular-nums"],
	},
	measure: { opacity: 0 },
	digit: { position: "absolute", top: 0, left: 0, right: 0 },
});
