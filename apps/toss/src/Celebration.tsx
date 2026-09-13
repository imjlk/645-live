import { useCallback, useEffect, useMemo, useRef } from "react";
import {
	Animated,
	Easing,
	StyleSheet,
	useWindowDimensions,
	View,
} from "react-native";

const CONFETTI_COLORS = ["#D9A300", "#3182F6", "#F04452", "#6B7684", "#209966"];
const CONFETTI_COUNT = 48;
const CONFETTI_EXPLOSION_MS = 260;
const CONFETTI_FALL_MS = 1_900;
const CONFETTI_FALLBACK_END_MS = 4_000;

export function Celebration({ onDone }: { onDone: () => void }) {
	const { width } = useWindowDimensions();
	const animation = useRef(new Animated.Value(0)).current;
	const completedRef = useRef(false);
	const onDoneRef = useRef(onDone);
	const particles = useMemo(() => createParticles(width), [width]);

	useEffect(() => {
		onDoneRef.current = onDone;
	}, [onDone]);

	const finish = useCallback(() => {
		if (completedRef.current) {
			return;
		}
		completedRef.current = true;
		onDoneRef.current();
	}, []);

	useEffect(() => {
		completedRef.current = false;
		animation.setValue(0);
		const timeout = setTimeout(finish, CONFETTI_FALLBACK_END_MS);
		const sequence = Animated.sequence([
			Animated.timing(animation, {
				duration: CONFETTI_EXPLOSION_MS,
				easing: Easing.out(Easing.quad),
				toValue: 1,
				useNativeDriver: true,
			}),
			Animated.timing(animation, {
				duration: CONFETTI_FALL_MS,
				easing: Easing.quad,
				toValue: 2,
				useNativeDriver: true,
			}),
		]);
		sequence.start(({ finished }) => {
			if (finished) {
				finish();
			}
		});
		return () => {
			clearTimeout(timeout);
			sequence.stop();
		};
	}, [animation, finish]);

	return (
		<View pointerEvents="none" style={styles.overlay}>
			{particles.map((particle) => (
				<Animated.View
					key={particle.id}
					pointerEvents="none"
					style={[
						styles.particle,
						{
							backgroundColor: particle.color,
							borderRadius: particle.rounded ? 999 : 2,
							height: particle.height,
							left: width / 2,
							opacity: animation.interpolate({
								inputRange: [0, 0.08, 1, 1.8, 2],
								outputRange: [0, 1, 1, 1, 0],
							}),
							top: 0,
							transform: [
								{
									translateX: animation.interpolate({
										inputRange: [0, 1, 2],
										outputRange: [
											0,
											particle.targetX - width / 2,
											particle.targetX - width / 2 + particle.swingX,
										],
									}),
								},
								{
									translateY: animation.interpolate({
										inputRange: [0, 1, 2],
										outputRange: [0, -particle.liftY, particle.fallY],
									}),
								},
								{
									rotate: animation.interpolate({
										inputRange: [0, 2],
										outputRange: ["0deg", `${particle.rotateDeg}deg`],
									}),
								},
							],
							width: particle.width,
						},
					]}
					testID="mission-celebration-confetti"
				/>
			))}
		</View>
	);
}

function createParticles(width: number) {
	return Array.from({ length: CONFETTI_COUNT }, (_, index) => ({
		id: index,
		color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
		fallY: randomBetween(130, 320),
		height: randomBetween(3, 7),
		liftY: randomBetween(36, 92),
		rotateDeg: randomBetween(-720, 720),
		rounded: Math.random() > 0.55,
		swingX: randomBetween(-20, 20),
		targetX: randomBetween(16, Math.max(32, width - 16)),
		width: randomBetween(3, 8),
	}));
}

function randomBetween(min: number, max: number) {
	return min + Math.random() * (max - min);
}

const styles = StyleSheet.create({
	overlay: {
		...({
			position: "absolute",
			top: 0,
			right: 0,
			bottom: 0,
			left: 0,
		} as const),
		zIndex: 10,
	},
	particle: {
		position: "absolute",
	},
});
