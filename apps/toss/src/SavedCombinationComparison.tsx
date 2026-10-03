import type { Generation, SavedCombination } from "@645/lotto-core";
import { Button } from "@toss/tds-react-native";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Balls } from "./Balls";
import { savedComparison } from "./saved-comparison";
import { trackProduct } from "./telemetry";
import { useTheme } from "./theme";

export function SavedCombinationComparison({
	generation,
	saved,
	onExplore,
}: {
	generation: Generation;
	saved: readonly SavedCombination[];
	onExplore: (action: () => void) => void;
}) {
	const theme = useTheme();
	const comparison = useMemo(
		() => savedComparison(generation, saved),
		[generation, saved],
	);
	const [expandedFor, setExpandedFor] = useState<number | null>(null);
	const expanded = expandedFor === generation.id;
	if (!comparison.total) return null;
	const description = comparison.identical
		? `같은 조합이 ${comparison.identical}개 보관되어 있어요.`
		: `보관한 다른 조합과 최대 ${comparison.maxOverlap}개 번호가 겹쳐요.`;
	return (
		<View style={s.root}>
			<Text style={[s.body, { color: theme.muted }]}>{description}</Text>
			<Button
				size="tiny"
				style="weak"
				onPress={() => {
					if (expanded) {
						setExpandedFor(null);
						return;
					}
					onExplore(() => {
						setExpandedFor(generation.id);
						trackProduct("saved_comparison_viewed", "generator");
					});
				}}
			>
				{expanded ? "보관한 조합 비교 접기" : "보관한 조합과 비교"}
			</Button>
			{expanded ? (
				<View style={[s.detail, { borderColor: theme.line }]}>
					<Text style={[s.caption, { color: theme.muted }]}>
						{generation.round}회 · 이 기기에 보관한 다른 {comparison.total}개
						조합 기준
					</Text>
					<Text style={[s.heading, { color: theme.text }]}>
						가장 비슷한 보관 조합
					</Text>
					{comparison.closest.map(({ item, overlap }) => (
						<View key={item.id} style={s.combination}>
							<Balls numbers={item.numbers} size={30} reducedMotion />
							<Text style={[s.caption, { color: theme.muted }]}>
								{overlap}개 번호가 겹쳐요.
							</Text>
						</View>
					))}
					<Text style={[s.heading, { color: theme.text }]}>
						내가 자주 보관한 번호
					</Text>
					<View style={s.numbers}>
						{comparison.frequent.map(({ number, count }) => (
							<View key={number} style={s.number}>
								<Balls numbers={[number]} size={32} reducedMotion />
								<Text style={[s.caption, { color: theme.muted }]}>
									{count}개 조합
								</Text>
							</View>
						))}
					</View>
					<Text style={[s.caption, { color: theme.muted }]}>
						서로 다른 조합 {comparison.unique}개 · 비교에 현재 번호는 포함하지
						않아요.
					</Text>
				</View>
			) : null}
		</View>
	);
}
const s = StyleSheet.create({
	root: { gap: 8, marginBottom: 16, alignItems: "flex-start" },
	body: { fontSize: 14, lineHeight: 22 },
	caption: { fontSize: 12, lineHeight: 19 },
	heading: { fontSize: 15, lineHeight: 23, fontWeight: "600" },
	detail: { width: "100%", borderTopWidth: 1, paddingTop: 16, gap: 14 },
	combination: { gap: 6 },
	numbers: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
	number: { alignItems: "center", gap: 6 },
});
