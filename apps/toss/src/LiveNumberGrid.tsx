import { ballColor, type Feed } from "@645/lotto-core";
import { memo, useMemo, useState } from "react";
import {
	Animated,
	Pressable,
	StyleSheet,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import { LiveCount, useLiveCount } from "./LiveCount";
import { useTheme } from "./theme";

const NUMBERS = Array.from({ length: 45 }, (_, i) => i + 1);

const NumberCell = memo(function NumberCell({
	number,
	count,
	reducedMotion,
	columns,
	size,
	onNumberPress,
}: {
	number: number;
	count: number;
	reducedMotion: boolean;
	columns: 5 | 9;
	size: number;
	onNumberPress?: (number: number) => void;
}) {
	const theme = useTheme();
	const change = useLiveCount(count, reducedMotion);
	const { progress, delta } = change;
	const color = ballColor(number);
	const ballStyle = { width: size, height: size, borderRadius: size / 2 };

	const motion = useMemo(
		() => ({
			ring: {
				opacity: progress.interpolate({
					inputRange: [0, 0.12, 0.65, 1],
					outputRange: [0, 0.65, 0.25, 0],
				}),
				transform: [
					{
						scale: progress.interpolate({
							inputRange: [0, 1],
							outputRange: [1, 1.45],
						}),
					},
				],
			},
			ball: {
				transform: [
					{
						scale: progress.interpolate({
							inputRange: [0, 0.14, 0.4, 1],
							outputRange: [1, 1.18, 1, 1],
						}),
					},
					{
						translateY: progress.interpolate({
							inputRange: [0, 0.14, 0.4, 1],
							outputRange: [0, -4, 0, 0],
						}),
					},
				],
			},
			badge: {
				opacity: progress.interpolate({
					inputRange: [0, 0.1, 0.75, 1],
					outputRange: [0, 1, 1, 0],
				}),
				transform: [
					{
						translateY: progress.interpolate({
							inputRange: [0, 0.2, 0.75, 1],
							outputRange: [6, 0, 0, -6],
						}),
					},
				],
			},
		}),
		[progress],
	);

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
		<Pressable
			style={[
				s.cell,
				{
					width: columns === 5 ? "20%" : "11.111%",
					paddingVertical: columns === 5 ? 12 : 8,
				},
			]}
			accessible
			accessibilityRole={onNumberPress ? "button" : "text"}
			accessibilityLabel={`${number}번 ${count}회 생성${onNumberPress ? ", 번호 통계 보기" : ""}`}
			disabled={!onNumberPress}
			onPress={() => onNumberPress?.(number)}
		>
			<View style={ballStyle}>
				<Animated.View
					pointerEvents="none"
					style={[s.ring, ballStyle, { borderColor: color }, motion.ring]}
				/>
				<Animated.View
					style={[s.ball, ballStyle, { backgroundColor: color }, motion.ball]}
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
				<Animated.View
					pointerEvents="none"
					accessibilityElementsHidden
					importantForAccessibility="no-hide-descendants"
					style={[
						s.badge,
						{ backgroundColor: theme.background, borderColor: color },
						motion.badge,
					]}
				>
					<Text
						style={[
							s.badgeText,
							{ color: theme.text, fontSize: columns === 5 ? 12 : 10 },
						]}
					>
						+{delta}
					</Text>
				</Animated.View>
			</View>
			<LiveCount change={change} style={countStyle} />
		</Pressable>
	);
});

export function LiveNumberGrid({
	feed,
	reducedMotion,
	columns,
	onNumberPress,
}: {
	feed: Pick<Feed, "round" | "numberCounts"> | null;
	reducedMotion: boolean;
	columns: 5 | 9;
	onNumberPress?: (round: number, number: number) => void;
}) {
	const { width } = useWindowDimensions();
	const [gridWidth, setGridWidth] = useState(
		Math.max(280, Math.min(width, 640) - 36),
	);
	const size =
		columns === 5
			? Math.max(28, Math.min(56, Math.floor(gridWidth / 5 - 16)))
			: 28;
	return (
		<View
			style={s.grid}
			onLayout={({ nativeEvent }) => {
				// Ignore transient zero/narrow native-stack measurements on first entry.
				if (nativeEvent.layout.width >= 252)
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
					onNumberPress={
						feed && onNumberPress
							? (number) => onNumberPress(feed.round, number)
							: undefined
					}
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
	count: {
		textAlign: "center",
		fontVariant: ["tabular-nums"],
	},
	badge: {
		position: "absolute",
		right: -9,
		top: -9,
		borderWidth: 1,
		borderRadius: 12,
		paddingHorizontal: 4,
		paddingVertical: 1,
	},
	badgeText: { fontWeight: "700", fontVariant: ["tabular-nums"] },
});
