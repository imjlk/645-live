import { ballColor } from "@645/lotto-core";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useTheme } from "./theme";

export function Balls({
	numbers,
	size = 42,
	animate = false,
	reducedMotion = false,
	matches,
}: {
	numbers: number[];
	size?: number;
	animate?: boolean;
	reducedMotion?: boolean;
	matches?: number[];
}) {
	const theme = useTheme();
	const values = useRef(
		Array.from({ length: 6 }, () => new Animated.Value(1)),
	).current;
	const key = numbers.join(",");
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
			accessible
			accessibilityLabel={`번호 ${numbers.join(", ")}`}
			style={styles.row}
		>
			{numbers.map((number, i) => (
				<Animated.View
					// biome-ignore lint/suspicious/noArrayIndexKey: Six fixed ball positions, including the empty placeholders.
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
			))}
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
	shine: { position: "absolute", backgroundColor: "rgba(255,255,255,0.19)" },
});
