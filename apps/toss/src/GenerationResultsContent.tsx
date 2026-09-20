import {
	createGenerationResultHistory,
	fetchGenerationResults,
	GENERATION_RANKS,
	GENERATION_RESULTS_COUNTING,
	GENERATION_RESULTS_SCOPE,
	generationResultDate,
	generationResultStatus,
	winningGenerations,
} from "@645/lotto-core";
import { BottomSheet, Button } from "@toss/tds-react-native";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
	ActivityIndicator,
	StyleSheet,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import { API_BASE } from "./api";
import { Balls } from "./Balls";
import { Banner } from "./Banner";
import { previousGenerationResults } from "./generation-result-view";
import { useTheme } from "./theme";

export function GenerationResultsContent({
	active,
	cardGroupId,
}: {
	active: boolean;
	cardGroupId?: string | null;
}) {
	const theme = useTheme();
	const { width } = useWindowDimensions();
	const controller = useMemo(
		() =>
			createGenerationResultHistory((query, signal) =>
				fetchGenerationResults(API_BASE, query, signal).then(
					previousGenerationResults,
				),
			),
		[],
	);
	const history = useSyncExternalStore(
		controller.subscribe,
		controller.getSnapshot,
	);
	const selected = history.rounds.find(
		(r) => r.round === history.selectedRound,
	);
	const index = history.rounds.findIndex(
		(r) => r.round === history.selectedRound,
	);
	const winning = selected ? winningGenerations(selected) : null;
	const status = selected ? generationResultStatus(selected) : null;
	const maxCount = Math.max(1, ...(selected?.rankCounts?.slice(1) ?? []));
	const ballSize = Math.max(
		22,
		Math.min(36, Math.floor((Math.min(width, 640) - 120) / 7)),
	);
	const [picker, setPicker] = useState(false);
	useEffect(() => {
		if (!active) return;
		void controller.refresh();
		const timer = setInterval(() => void controller.refresh(), 60000);
		return () => {
			clearInterval(timer);
			controller.stop();
		};
	}, [controller, active]);
	async function previous() {
		if (!selected) return;
		const round = selected.round;
		if (index + 1 === history.rounds.length) await controller.more();
		const state = controller.getSnapshot();
		const older = state.rounds.find((r) => r.round < round);
		if (older && state.selectedRound === round) controller.select(older.round);
	}
	return (
		<View style={s.content}>
			<Text style={[s.eyebrow, { color: theme.blue }]}>모두가 만든 번호</Text>
			<Text style={[s.body, { color: theme.muted }]}>
				{GENERATION_RESULTS_SCOPE}
			</Text>
			{history.rounds.length ? (
				<View style={s.controls}>
					<Button
						size="tiny"
						style="weak"
						disabled={
							history.loadingMore ||
							!selected ||
							(index + 1 >= history.rounds.length &&
								history.nextBeforeRound === null)
						}
						onPress={() => void previous()}
					>
						이전
					</Button>
					<View style={s.select}>
						<Button
							size="medium"
							style="weak"
							disabled={!history.rounds.length}
							onPress={() => setPicker((open) => !open)}
						>
							{picker
								? "회차 선택 닫기 ⌃"
								: selected
									? `${selected.round}회 선택 ⌄`
									: "회차 선택"}
						</Button>
					</View>
					<Button
						size="tiny"
						style="weak"
						disabled={index <= 0}
						onPress={() => controller.select(history.rounds[index - 1].round)}
					>
						다음
					</Button>
				</View>
			) : null}
			{history.error ? (
				<View accessibilityRole="alert" style={s.notice}>
					<Text style={[s.body, { color: theme.muted }]}>{history.error}</Text>
					<Button
						size="tiny"
						style="weak"
						onPress={() => void controller.refresh()}
					>
						다시 불러오기
					</Button>
				</View>
			) : null}
			{!selected && history.loading ? (
				<ActivityIndicator
					color={theme.blue}
					accessibilityLabel="결과 통계 불러오는 중"
				/>
			) : null}
			{!picker && selected && status ? (
				<View style={s.detail}>
					<View style={s.row}>
						<Text style={[s.caption, { color: theme.muted }]}>
							{generationResultDate(selected)} 추첨
						</Text>
						<Text style={[s.caption, { color: theme.blue }]}>
							{status.label}
						</Text>
					</View>
					{selected.draw ? (
						<View style={s.draw}>
							<Balls
								numbers={selected.draw.numbers}
								size={ballSize}
								reducedMotion
							/>
							<Text style={{ color: theme.muted }}>+</Text>
							<Balls
								numbers={[selected.draw.bonus]}
								size={ballSize}
								reducedMotion
							/>
						</View>
					) : null}
					{selected.totalGenerations === 0 ? (
						<View style={[s.notice, { backgroundColor: theme.surface }]}>
							<Text style={[s.label, { color: theme.text }]}>
								이 회차에는 생성 기록이 없어요
							</Text>
							<Text style={[s.body, { color: theme.muted }]}>
								조합이 모인 회차의 추첨이 끝나면 등수별 번호 일치 결과를 볼 수
								있어요.
							</Text>
						</View>
					) : (
						<>
							<View style={[s.summary, { borderColor: theme.line }]}>
								<View style={s.metric}>
									<Text style={[s.caption, { color: theme.muted }]}>
										공개 생성 조합
									</Text>
									<Text
										numberOfLines={1}
										adjustsFontSizeToFit
										style={[s.number, { color: theme.text }]}
									>
										{selected.totalGenerations.toLocaleString()}
										<Text style={s.unit}>개</Text>
									</Text>
								</View>
								<View style={s.metric}>
									<Text style={[s.caption, { color: theme.muted }]}>
										1~5등 번호 일치
									</Text>
									<Text
										numberOfLines={1}
										adjustsFontSizeToFit
										style={[s.number, { color: theme.blue }]}
									>
										{winning === null ? "—" : winning.toLocaleString()}
										{winning !== null ? <Text style={s.unit}>개</Text> : null}
									</Text>
								</View>
							</View>
							{selected.status !== "ready" ? (
								<View style={[s.notice, { backgroundColor: theme.surface }]}>
									<Text style={[s.body, { color: theme.text }]}>
										{status.description}
									</Text>
									{selected.status === "processing" &&
									selected.comparedGenerations > 0 ? (
										<Text style={[s.caption, { color: theme.muted }]}>
											{selected.comparedGenerations.toLocaleString()}개 비교
											완료
										</Text>
									) : null}
								</View>
							) : null}
							<Text
								accessibilityRole="header"
								style={[s.section, { color: theme.text }]}
							>
								등수별 번호 일치
							</Text>
							{GENERATION_RANKS.map(({ rank, label, condition }) => {
								const count = selected.rankCounts?.[rank];
								return (
									<View
										key={rank}
										style={[s.rank, { borderColor: theme.line }]}
									>
										<View style={s.row}>
											<View style={s.rankText}>
												<Text style={[s.label, { color: theme.text }]}>
													{label}
												</Text>
												<Text style={[s.caption, { color: theme.muted }]}>
													{condition}
												</Text>
											</View>
											<Text style={[s.count, { color: theme.text }]}>
												{count === undefined
													? "—"
													: `${count.toLocaleString()}개`}
											</Text>
										</View>
										<View style={[s.track, { backgroundColor: theme.surface }]}>
											<View
												style={[
													s.bar,
													{
														backgroundColor: theme.blue,
														width: `${((count ?? 0) / maxCount) * 100}%`,
													},
												]}
											/>
										</View>
									</View>
								);
							})}
							{selected.rankCounts ? (
								<View style={s.row}>
									<Text style={[s.caption, { color: theme.muted }]}>
										3개 미만 일치
									</Text>
									<Text style={[s.caption, { color: theme.muted }]}>
										{selected.rankCounts[0].toLocaleString()}개
									</Text>
								</View>
							) : null}
							<Text style={[s.caption, { color: theme.muted }]}>
								{GENERATION_RESULTS_COUNTING}
							</Text>
							{/* The sheet stays mounted while closing; never load its ad unseen. */}
							{active ? <Banner format="card" groupId={cardGroupId} /> : null}
						</>
					)}
					<Text style={[s.caption, { color: theme.muted }]}>
						생성·추첨 정보 제공: 645.live
					</Text>
				</View>
			) : !picker && !history.loading && !history.error ? (
				<View style={[s.notice, { backgroundColor: theme.surface }]}>
					<Text
						accessibilityRole="header"
						style={[s.label, { color: theme.text }]}
					>
						아직 이전 회차 기록이 없어요
					</Text>
					<Text style={[s.body, { color: theme.muted }]}>
						이번 회차부터 생성 기록을 모으고 있어요. 추첨이 끝나면 번호 일치
						결과를 여기서 확인할 수 있어요.
					</Text>
				</View>
			) : null}
			{picker ? (
				<View style={s.detail}>
					<BottomSheet.Select
						value={String(history.selectedRound ?? "")}
						options={history.rounds.map((r) => ({
							name: `${r.round}회 · ${generationResultDate(r)} · ${generationResultStatus(r).label}`,
							value: String(r.round),
						}))}
						onChange={(value) => {
							controller.select(Number(value));
							setPicker(false);
						}}
					/>
					{history.nextBeforeRound !== null ? (
						<Button
							size="medium"
							style="weak"
							loading={history.loadingMore}
							onPress={() => void controller.more()}
						>
							이전 회차 더 보기
						</Button>
					) : null}
					{history.error ? (
						<Text style={[s.caption, { color: theme.muted }]}>
							{history.error}
						</Text>
					) : null}
				</View>
			) : null}
		</View>
	);
}

const s = StyleSheet.create({
	content: {
		width: "100%",
		maxWidth: 640,
		alignSelf: "center",
		gap: 16,
	},
	eyebrow: { fontSize: 14, fontWeight: "600", lineHeight: 21 },
	body: { fontSize: 15, lineHeight: 24 },
	caption: { fontSize: 13, lineHeight: 21 },
	controls: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		marginVertical: 8,
	},
	select: { flex: 1 },
	detail: { gap: 20 },
	row: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
		flexWrap: "wrap",
	},
	draw: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		flexWrap: "wrap",
	},
	summary: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 20,
		paddingVertical: 24,
		borderTopWidth: 1,
		borderBottomWidth: 1,
	},
	metric: { flex: 1, minWidth: 120, gap: 10 },
	number: {
		fontSize: 32,
		lineHeight: 42,
		fontWeight: "700",
		fontVariant: ["tabular-nums"],
	},
	unit: { fontSize: 16 },
	section: { fontSize: 20, lineHeight: 28, fontWeight: "700", marginTop: 4 },
	notice: { padding: 16, borderRadius: 12, gap: 12 },
	rank: { gap: 14, paddingBottom: 18, borderBottomWidth: 1 },
	rankText: { gap: 4 },
	label: { fontSize: 16, lineHeight: 24, fontWeight: "600" },
	count: {
		fontSize: 20,
		lineHeight: 28,
		fontWeight: "600",
		fontVariant: ["tabular-nums"],
	},
	track: { height: 4, borderRadius: 2, overflow: "hidden" },
	bar: { height: 4, borderRadius: 2 },
});
