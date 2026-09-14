import { compareDraw, type Draw, parseNumbers } from "@645/lotto-core";
import { Button } from "@toss/tds-react-native";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { LOCAL_PREVIEW } from "./api";
import { Balls } from "./Balls";
import { Celebration } from "./Celebration";
import { useTheme } from "./theme";

export function LocalResultPreview({
	draw,
	ballSize,
	reducedMotion,
}: {
	draw: Draw;
	ballSize: number;
	reducedMotion: boolean;
}) {
	const theme = useTheme();
	const [rank, setRank] = useState<number | null>(5);
	const [playing, setPlaying] = useState<number | null>(null);
	useEffect(() => {
		if (reducedMotion) setPlaying(null);
	}, [reducedMotion]);
	if (!LOCAL_PREVIEW) return null;
	const matchCount =
		rank === 1
			? 6
			: rank === 2 || rank === 3
				? 5
				: rank === 4
					? 4
					: rank === 5
						? 3
						: 2;
	const matches = draw.numbers.slice(0, matchCount);
	if (rank === 2) matches.push(draw.bonus);
	const others = Array.from({ length: 45 }, (_, i) => i + 1).filter(
		(n) => !draw.numbers.includes(n) && n !== draw.bonus,
	);
	const numbers = parseNumbers([
		...matches,
		...others.slice(0, 6 - matches.length),
	]);
	if (!numbers) return null;
	const result = compareDraw(numbers, draw);
	const caption = { color: theme.muted, fontSize: 13, lineHeight: 21 };
	return (
		<View style={{ gap: 22 }}>
			<Text style={caption}>
				{draw.round}회 실제 결과와 테스트 조합을 비교해요. 보관함과 공개 생성
				내역에는 저장되지 않아요.
			</Text>
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
				{[1, 2, 3, 4, 5, null].map((value) => (
					<Button
						key={String(value)}
						size="tiny"
						style="weak"
						type={rank === value ? "primary" : "dark"}
						onPress={() => {
							setRank(value);
							setPlaying(null);
						}}
					>
						{value === null ? "등수 없음" : `${value}등`}
					</Button>
				))}
			</View>
			<View style={{ gap: 14 }}>
				<Text style={caption}>테스트 조합</Text>
				<Balls
					numbers={numbers}
					size={Math.min(40, ballSize)}
					matches={result.matches}
					reducedMotion={reducedMotion}
				/>
				<Text
					accessibilityLiveRegion="polite"
					style={{
						color: result.rank ? theme.positive : theme.text,
						fontSize: 22,
						fontWeight: "700",
					}}
				>
					{result.rank
						? `${result.rank}등 번호 일치`
						: `${result.matches.length}개 일치`}
				</Text>
				<Text style={caption}>
					보너스 {draw.bonus}번
					{result.bonus ? "도 일치해요." : "은 포함되지 않았어요."}
				</Text>
			</View>
			<View style={{ gap: 12 }}>
				<Text style={caption}>{draw.round}회 당첨 번호</Text>
				<Balls
					numbers={draw.numbers}
					size={Math.min(36, ballSize)}
					reducedMotion
				/>
			</View>
			<Button
				display="full"
				disabled={!result.rank || reducedMotion}
				onPress={() => setPlaying(Date.now())}
			>
				축하 연출 다시 보기
			</Button>
			{reducedMotion ? (
				<Text style={caption}>
					기기의 동작 줄이기 설정에 따라 축하 애니메이션을 생략해요.
				</Text>
			) : null}
			{playing !== null ? (
				<View
					pointerEvents="none"
					style={{
						position: "absolute",
						top: 150,
						left: -24,
						right: -24,
						bottom: 0,
					}}
				>
					<Celebration key={playing} onDone={() => setPlaying(null)} />
				</View>
			) : null}
		</View>
	);
}
