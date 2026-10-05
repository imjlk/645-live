import type { Feed, Generation } from "@645/lotto-core";
import { Badge } from "@toss/tds-react-native";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
	generationInsights,
	preferredGenerationInsight,
} from "./generation-insights";
import { useTheme } from "./theme";

export function GenerationInsightPreview({
	generation,
	feed,
	round: requestedRound,
	published = false,
	onInsights,
}: {
	generation: Generation | null;
	feed: Feed | null;
	round?: number;
	published?: boolean;
	onInsights: (round?: number) => void;
}) {
	const theme = useTheme();
	const round = generation?.round ?? requestedRound ?? feed?.round;
	const snapshot = feed?.round === round ? feed : null;
	const facts = generation ? generationInsights(generation, snapshot) : [];
	const preferred = generation
		? preferredGenerationInsight(facts, generation.id)
		: null;
	const [key, setKey] = useState(preferred?.key);
	const preferredKey = preferred?.key;
	useEffect(() => {
		// Upgrade a local fallback once community counts arrive, then keep the
		// chosen fact stable across SSE updates. There is no polling or carousel.
		if (
			key !== "frequency" &&
			key !== "top" &&
			(preferredKey === "frequency" || preferredKey === "top")
		)
			setKey(preferredKey);
	}, [key, preferredKey]);
	const fact = facts.find((item) => item.key === key) ?? preferred;
	const description =
		fact?.text ??
		(snapshot && snapshot.totalGenerations > 0
			? `이번 회차에 ${snapshot.totalGenerations.toLocaleString()}개 조합이 모였어요.`
			: "많이 생성된 번호와 조합 흐름을 살펴보세요.");
	return (
		<View style={s.root}>
			<View style={s.row}>
				{generation && published ? (
					<View
						accessible
						accessibilityLiveRegion="polite"
						accessibilityLabel="실시간 생성 내역에 등록했어요"
					>
						<Badge size="tiny" type="green" badgeStyle="weak">
							✓ 실시간 등록
						</Badge>
					</View>
				) : (
					<Text style={[s.caption, { color: theme.muted }]}>
						{round ? `${round}회 생성 통계` : "생성 통계"}
					</Text>
				)}
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="생성 통계 보기"
					onPress={() => onInsights(round)}
					style={({ pressed }) => [s.link, { opacity: pressed ? 0.65 : 1 }]}
				>
					<Text style={[s.linkText, { color: theme.blue }]}>
						생성 통계 보기 ›
					</Text>
				</Pressable>
			</View>
			<Text style={[s.fact, { color: theme.muted }]}>{description}</Text>
		</View>
	);
}
const s = StyleSheet.create({
	root: { marginBottom: 10 },
	row: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		flexWrap: "wrap",
		gap: 8,
	},
	link: { minHeight: 44, justifyContent: "center", paddingLeft: 8 },
	linkText: { fontSize: 13, lineHeight: 20, fontWeight: "500" },
	caption: { fontSize: 12, lineHeight: 18 },
	fact: { fontSize: 14, lineHeight: 22 },
});
