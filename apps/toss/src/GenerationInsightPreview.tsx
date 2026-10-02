import type { Feed, Generation } from "@645/lotto-core";
import { Button } from "@toss/tds-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { generationInsights } from "./generation-insights";
import { useTheme } from "./theme";

export function GenerationInsightPreview({
	generation,
	feed,
	onInsights,
}: {
	generation: Generation;
	feed: Feed | null;
	onInsights: (round: number, number?: number) => void;
}) {
	const theme = useTheme();
	const [key, setKey] = useState(() => {
		const initial = generationInsights(generation, feed);
		return initial[generation.id % initial.length].key;
	});
	const facts = generationInsights(generation, feed);
	const fact = facts.find((item) => item.key === key) ?? facts[0];
	return (
		<View style={[s.root, { borderColor: theme.line }]}>
			<Text style={[s.caption, { color: theme.muted }]}>
				내 조합과 생성 통계 · {generation.round}회
			</Text>
			<Text style={[s.fact, { color: theme.text }]}>{fact.text}</Text>
			<View style={s.row}>
				<Button
					size="tiny"
					style="weak"
					onPress={() => onInsights(generation.round, fact.number)}
				>
					생성 통계 보기
				</Button>
				<Button
					size="tiny"
					style="weak"
					type="dark"
					onPress={() =>
						setKey(facts[(facts.indexOf(fact) + 1) % facts.length].key)
					}
				>
					다른 내용 보기
				</Button>
			</View>
		</View>
	);
}
const s = StyleSheet.create({
	root: {
		gap: 10,
		paddingVertical: 16,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		flexWrap: "wrap",
		gap: 8,
	},
	caption: { fontSize: 12, lineHeight: 18 },
	fact: { fontSize: 15, lineHeight: 23, minHeight: 46 },
});
