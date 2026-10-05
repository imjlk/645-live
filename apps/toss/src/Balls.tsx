import { ballColor } from "@645/lotto-core";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "./theme";

export function Balls({
	numbers,
	size = 42,
	animate = false,
	reducedMotion = false,
	matches,
	onNumberPress,
}: {
	numbers: number[];
	size?: number;
	animate?: boolean;
	reducedMotion?: boolean;
	matches?: number[];
	onNumberPress?: (number: number) => void;
}) {
	const theme = useTheme();
	const values = useRef(
		Array.from({ length: 6 }, () => new Animated.Value(1)),
	).current;
	const key = numbers.join(",");
	const interactive = !!onNumberPress && numbers.some((number) => number > 0);
	useEffect(() => {
		if (!key || !animate || reducedMotion) return;
		for (const value of values) value.setValue(0);
		const animation = Animated.stagger(
			45,
			values.map((value) =>
				Animated.spring(value, {
					toValue: 1,
					tension: 90,
					friction: 8,
					useNativeDriver: true,
				}),
			),
		);
		animation.start();
		return () => animation.stop();
	}, [key, animate, reducedMotion, values]);
	return (
		<View
			accessible={!interactive}
			accessibilityLabel={
				interactive ? undefined : `번호 ${numbers.join(", ")}`
			}
			style={[styles.row, interactive && { gap: 0 }]}
		>
			{numbers.map((number, i) => {
				const ball = (
					<Animated.View
						// biome-ignore lint/suspicious/noArrayIndexKey: Six fixed ball positions.
						key={`${i}-${number}`}
						style={[
							styles.ball,
							{
								width: size,
								height: size,
								borderRadius: size / 2,
								backgroundColor: number ? ballColor(number) : theme.surface,
								opacity: matches && !matches.includes(number) ? 0.3 : 1,
								transform:
									animate && !reducedMotion
										? [
												{ scale: values[i] ?? 1 },
												{
													translateY: (values[i] ?? values[0]).interpolate({
														inputRange: [0, 1],
														outputRange: [10, 0],
													}),
												},
											]
										: [],
							},
						]}
					>
						{number > 0 ? (
							<View
								pointerEvents="none"
								style={[
									styles.shine,
									{
										width: size * 0.55,
										height: size * 0.22,
										borderRadius: size * 0.14,
										left: size * 0.22,
										top: size * 0.08,
									},
								]}
							/>
						) : null}
						<Text
							allowFontScaling={false}
							style={{
								fontSize: size * 0.4,
								fontWeight: "800",
								color: number > 10 ? "#FFF" : number ? "#3D3000" : theme.muted,
								fontVariant: ["tabular-nums"],
							}}
						>
							{number || "?"}
						</Text>
					</Animated.View>
				);
				return onNumberPress && number > 0 ? (
					<Pressable
						// biome-ignore lint/suspicious/noArrayIndexKey: Six fixed ball positions.
						key={`${i}-${number}`}
						accessibilityRole="button"
						accessibilityLabel={`${number}번 번호 통계 보기`}
						onPress={() => onNumberPress(number)}
						style={({ pressed }) => [
							styles.target,
							{ opacity: pressed ? 0.6 : 1 },
						]}
					>
						{ball}
					</Pressable>
				) : (
					// biome-ignore lint/suspicious/noArrayIndexKey: Six fixed ball positions, including placeholders.
					<View key={`${i}-${number}`}>{ball}</View>
				);
			})}
		</View>
	);
}
const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		gap: 6,
		alignItems: "center",
		justifyContent: "space-between",
	},
	ball: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
	target: {
		minWidth: 44,
		minHeight: 44,
		alignItems: "center",
		justifyContent: "center",
	},
	shine: { position: "absolute", backgroundColor: "rgba(255,255,255,0.19)" },
});
