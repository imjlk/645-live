import {
	ACTIVITY_PERIODS,
	type ActivityPeriod,
	activityAllowsDay,
	activityNumbers,
	combinationActivity,
	createActivityController,
	fetchActivityInsights,
	numberActivity,
	sum,
} from "@645/lotto-core";
import { Button, SegmentedControl } from "@toss/tds-react-native";
import {
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import {
	ActivityIndicator,
	AppState,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { type AdConfig, API_BASE } from "./api";
import { Balls } from "./Balls";
import { Banner } from "./Banner";
import { createPerformanceTracker } from "./performance";
import { trackProduct } from "./telemetry";
import { useTheme } from "./theme";

const percent = (n: number) => `${(n * 100).toFixed(1)}%`;
export function ActivityPanel({
	active,
	initialRound,
	initialNumber,
	adConfig,
	savedNumbers = [],
	onExplore = (action) => action(),
	onOverview,
	onNumberPress,
}: {
	active: boolean;
	initialRound?: number;
	initialNumber?: number;
	adConfig?: AdConfig | null;
	savedNumbers?: readonly {
		id: string;
		round: number;
		numbers: readonly number[];
	}[];
	onExplore?: (action: () => void) => void;
	onOverview?: (round: number) => void;
	onNumberPress?: (
		round: number,
		number: number,
		source?: "draw" | "generated",
	) => void;
}) {
	const theme = useTheme();
	const numberOnly = initialNumber !== undefined;
	const controller = useMemo(() => {
		const measured = new Set<string>();
		const performance = createPerformanceTracker(trackProduct);
		return createActivityController(async (query, signal) => {
			const key = JSON.stringify(query);
			if (measured.has(key))
				return fetchActivityInsights(API_BASE, query, signal);
			const timing = performance.start(
				"insights_first_load",
				query.period ?? "round",
			);
			try {
				const snapshot = await fetchActivityInsights(API_BASE, query, signal);
				timing.end(signal?.aborted ? "canceled" : "ready");
				if (!signal?.aborted) {
					if (measured.size >= 32) measured.clear();
					measured.add(key);
				}
				return snapshot;
			} catch (error) {
				timing.end(signal?.aborted ? "canceled" : "failed");
				throw error;
			}
		});
	}, []);
	const state = useSyncExternalStore(
		controller.subscribe,
		controller.getSnapshot,
	);
	const [detailOrder, setDetailOrder] = useState<number[]>([]);
	const [period, setPeriod] = useState<ActivityPeriod>("round"),
		[pickedRound, setPickedRound] = useState<number | undefined>(initialRound),
		[order, setOrder] = useState<"most" | "least" | "number">("most"),
		[all, setAll] = useState(false),
		[selected, setSelected] = useState<number | null>(initialNumber ?? null),
		[more, setMore] = useState(false);
	const [entryDetail, setEntryDetail] = useState(initialNumber !== undefined);
	const [foreground, setForeground] = useState(
		AppState.currentState !== "background" &&
			AppState.currentState !== "inactive",
	);
	useEffect(() => {
		const listener = AppState.addEventListener("change", (state) =>
			setForeground(state === "active"),
		);
		return () => listener.remove();
	}, []);
	const target = pickedRound;
	useEffect(() => {
		if (!active || !foreground) return;
		void controller.select({ round: target, period });
		const timer = setInterval(() => void controller.refresh(), 15000);
		return () => {
			clearInterval(timer);
			controller.stop();
		};
	}, [active, foreground, controller, target, period]);
	const snapshot = state.data,
		data = snapshot?.sources.generated,
		ranked = data ? activityNumbers(data, order) : [],
		numbers =
			selected && detailOrder.length
				? detailOrder.flatMap((number) =>
						ranked.filter((n) => n.number === number),
					)
				: ranked,
		selectedData = data && selected ? numberActivity(data, selected) : null;
	useEffect(() => {
		if (selected && data && !detailOrder.length)
			setDetailOrder(activityNumbers(data, order).map((item) => item.number));
	}, [selected, data, order, detailOrder.length]);
	const detailVisit = useRef("");
	useEffect(() => {
		if (
			!active ||
			!foreground ||
			!selectedData ||
			!data ||
			sum(data.numberCounts) === 0
		) {
			detailVisit.current = "";
			return;
		}
		const key = `${snapshot?.round}:${period}:${selected}`;
		if (detailVisit.current !== key) {
			detailVisit.current = key;
			trackProduct(
				"insights_detail_viewed",
				entryDetail ? "number_preview" : "ranking",
			);
		}
	}, [
		active,
		foreground,
		selectedData,
		data,
		snapshot?.round,
		period,
		selected,
		entryDetail,
	]);
	const personal = savedNumbers.filter(
		(item) => item.round === snapshot?.round,
	);
	const total = data ? sum(data.numberCounts) : 0,
		max = Math.max(1, ...numbers.map((n) => n.count));
	const text = { color: theme.text },
		muted = { color: theme.muted };
	const title = (label: string) => (
		<Text accessibilityRole="header" style={[s.heading, text]}>
			{label}
		</Text>
	);
	function changeRound(next: number) {
		setPickedRound(next);
		if (period === "day") setPeriod("round");
		if (!numberOnly) setSelected(null);
	}
	const detailView = selectedData ? (
		<View style={[s.inspector, { backgroundColor: theme.surface }]}>
			<View style={s.row}>
				{title(`${selected}번 ${numberOnly ? "생성 통계" : "자세히 보기"}`)}
				{!numberOnly ? (
					<Button size="tiny" style="weak" onPress={() => setSelected(null)}>
						닫기
					</Button>
				) : (
					<Balls numbers={[selected as number]} size={40} reducedMotion />
				)}
			</View>
			<Text style={[s.total, text]}>
				{selectedData.number.count.toLocaleString()}
				<Text style={s.unit}>회 생성</Text>
			</Text>
			<Text style={[s.body, text]}>
				{selectedData.number.rank
					? `${selectedData.number.rank}위`
					: "아직 순위 없음"}{" "}
				· 등장 비중 {percent(selectedData.number.share)}
			</Text>
			<Text style={[s.caption, muted]}>
				비중은 선택 기간의 전체 번호 등장 횟수 기준이에요.
			</Text>
			<Text style={[s.caption, muted]}>최근 회차별 비중</Text>
			{!selectedData.trend.length ? (
				<Text style={muted}>회차별 집계가 모이면 표시돼요.</Text>
			) : null}
			{selectedData.trend.map((t) => (
				<View key={t.round} style={s.row}>
					<Text style={muted}>{t.round}회</Text>
					<Text style={text}>
						{t.available
							? `${t.count.toLocaleString()}회 · ${percent(t.share)}`
							: "수집 기록 없음"}
					</Text>
				</View>
			))}
			<Text style={[s.caption, muted]}>
				함께 등장한 번호 · 새 패턴 집계 기준
			</Text>
			{selectedData.pairs.length ? (
				selectedData.pairs.map((p) => (
					<View key={`${p.a}:${p.b}`} style={s.row}>
						<Balls
							numbers={[p.a === selected ? p.b : p.a]}
							size={30}
							reducedMotion
							onNumberPress={
								onNumberPress && snapshot
									? (number) => onNumberPress(snapshot.round, number)
									: numberOnly
										? (number) => onExplore(() => setSelected(number))
										: undefined
							}
						/>
						<Text style={text}>{p.count.toLocaleString()}개 조합</Text>
					</View>
				))
			) : (
				<Text style={muted}>함께 등장한 번호 집계가 아직 없어요.</Text>
			)}
		</View>
	) : null;
	return (
		<View style={s.root}>
			{snapshot ? (
				<View style={s.row}>
					<Button
						size="tiny"
						style="weak"
						disabled={snapshot.round <= 1 || state.loading}
						onPress={() => changeRound(snapshot.round - 1)}
					>
						이전
					</Button>
					<Text style={[s.heading, text]}>{snapshot.round}회</Text>
					<Button
						size="tiny"
						style="weak"
						disabled={snapshot.round >= snapshot.currentRound || state.loading}
						onPress={() => changeRound(snapshot.round + 1)}
					>
						다음
					</Button>
				</View>
			) : null}
			{snapshot ? (
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={s.filters}
				>
					{snapshot.knownRounds.slice(0, 8).map((r) => (
						<Button
							key={r}
							size="tiny"
							style="weak"
							type={snapshot.round === r ? "primary" : "dark"}
							onPress={() => changeRound(r)}
						>
							{r}회
						</Button>
					))}
				</ScrollView>
			) : null}
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={s.filters}
			>
				{ACTIVITY_PERIODS.filter(
					(p) => p.value !== "day" || activityAllowsDay(snapshot, target),
				).map((p) => (
					<Button
						key={p.value}
						size="tiny"
						style="weak"
						type={period === p.value ? "primary" : "dark"}
						onPress={() => {
							setPeriod(p.value);
							if (!numberOnly) setSelected(null);
						}}
					>
						{p.label}
					</Button>
				))}
			</ScrollView>
			{state.error ? (
				<View accessibilityRole="alert" style={s.notice}>
					<Text style={muted}>{state.error}</Text>
					<Button
						size="tiny"
						style="weak"
						onPress={() => void controller.refresh()}
					>
						다시 불러오기
					</Button>
				</View>
			) : null}
			{!data && state.loading ? (
				<ActivityIndicator
					color={theme.blue}
					accessibilityLabel="생성 통계 불러오는 중"
				/>
			) : null}
			{data && snapshot ? (
				<>
					{!numberOnly ? (
						<View style={[s.summary, { borderColor: theme.line }]}>
							<Text style={[s.caption, muted]}>
								{snapshot.round}회 기준 · 생성된 번호
							</Text>
							<Text style={[s.total, text]}>
								{data.records.toLocaleString()}
								<Text style={s.unit}>조합</Text>
							</Text>
							<Text style={[s.caption, muted]}>
								번호 등장 {total.toLocaleString()}회 · 비중은 전체 번호 등장
								횟수 기준
							</Text>
						</View>
					) : null}
					{numberOnly ? (
						detailView
					) : total === 0 ? (
						<View style={s.notice}>
							<Text style={[s.heading, text]}>아직 모인 번호가 없어요</Text>
							<Text style={[s.body, muted]}>
								이 회차에 기록이 모이면 순위와 분포를 볼 수 있어요.
							</Text>
						</View>
					) : (
						<>
							{entryDetail ? detailView : null}
							<View style={s.row}>
								{title(
									order === "least"
										? "적게 생성된 번호"
										: order === "number"
											? "번호별 생성 횟수"
											: all
												? "많이 생성된 번호"
												: "많이 생성된 번호 Top 10",
								)}
								<Button
									size="tiny"
									style="weak"
									onPress={() => {
										setAll(!all);
										setSelected(null);
									}}
								>
									{all ? "Top 10" : "전체 45개"}
								</Button>
							</View>
							<SegmentedControl.Root
								name="activity-order"
								size="small"
								value={order}
								onChange={(v) => {
									if (v === "most" || v === "least" || v === "number")
										setOrder(v);
									setSelected(null);
								}}
							>
								<SegmentedControl.Item value="most">
									많은 순
								</SegmentedControl.Item>
								<SegmentedControl.Item value="least">
									적은 순
								</SegmentedControl.Item>
								<SegmentedControl.Item value="number">
									번호순
								</SegmentedControl.Item>
							</SegmentedControl.Root>
							{(all
								? numbers
								: numbers
										.filter((n) => order !== "most" || n.count > 0)
										.slice(0, 10)
							).map((n) => (
								<View key={n.number}>
									<Pressable
										key={n.number}
										accessibilityRole="button"
										accessibilityLabel={`${n.number}번 ${n.count}회, 상세 분석`}
										onPress={() =>
											onNumberPress
												? onNumberPress(snapshot.round, n.number)
												: selected === n.number
													? setSelected(null)
													: onExplore(() => {
															setEntryDetail(false);
															setDetailOrder(
																numbers.map((item) => item.number),
															);
															setSelected(n.number);
														})
										}
										style={[s.rankRow, { borderColor: theme.line }]}
									>
										<Text style={[s.rank, muted]}>{n.rank ?? "—"}</Text>
										<Balls numbers={[n.number]} size={34} reducedMotion />
										<View style={s.barColumn}>
											<View style={[s.bar, { backgroundColor: theme.surface }]}>
												<View
													style={[
														s.fill,
														{
															backgroundColor: theme.blue,
															width: `${(n.count / max) * 100}%`,
														},
													]}
												/>
											</View>
											<Text style={[s.caption, muted]}>
												{percent(n.share)}
												{n.rankChange !== null &&
												period !== "all" &&
												period !== "day"
													? ` · ${n.rankChange > 0 ? "↑" : n.rankChange < 0 ? "↓" : "—"}${n.rankChange ? Math.abs(n.rankChange) : ""}`
													: ""}
											</Text>
										</View>
										<Text style={[s.count, text]}>
											{n.count.toLocaleString()}회
										</Text>
									</Pressable>
									{selected === n.number && !entryDetail ? detailView : null}
								</View>
							))}

							{snapshot.draw && period === "round" ? (
								<View style={s.block}>
									{title("추첨 후 돌아보기")}
									<Balls
										numbers={snapshot.draw.numbers}
										size={32}
										reducedMotion
										onNumberPress={
											onNumberPress
												? (number) =>
														onNumberPress(snapshot.round, number, "draw")
												: undefined
										}
									/>
									<Text style={[s.body, text]}>
										많이 등장한 Top 10에 추첨 번호{" "}
										{
											combinationActivity(data, snapshot.draw.numbers)
												.topMatches.length
										}
										개가 포함됐어요.
									</Text>
									<Text style={[s.caption, muted]}>
										이번 회차의 기록과 발표 번호를 비교한 결과예요.
									</Text>
								</View>
							) : null}
							{personal.length ? (
								<View style={s.block}>
									{title("내 번호는 어떤 편일까?")}
									{personal.slice(0, 3).map((item) => (
										<View key={item.id} style={s.saved}>
											<Balls
												numbers={[...item.numbers]}
												size={30}
												reducedMotion
												onNumberPress={
													onNumberPress
														? (number) => onNumberPress(item.round, number)
														: undefined
												}
											/>
											<Text style={[s.caption, muted]}>
												Top 10 번호{" "}
												{
													combinationActivity(data, item.numbers).topMatches
														.length
												}
												개 포함
											</Text>
										</View>
									))}
								</View>
							) : null}
						</>
					)}
					{total > 0 ? (
						<Banner
							placement="insights_summary"
							groupId={adConfig?.bannerGroups?.card ?? adConfig?.bannerGroupId}
						/>
					) : null}
					{numberOnly && onOverview ? (
						<Button
							display="full"
							size="medium"
							style="weak"
							onPress={() => onOverview(snapshot.round)}
						>
							전체 생성 통계 보기
						</Button>
					) : null}
					{!numberOnly ? (
						<>
							<Button
								display="full"
								style="weak"
								disabled={!more && total === 0}
								onPress={() =>
									more
										? setMore(false)
										: onExplore(() => {
												trackProduct("insights_patterns_viewed", period);
												setMore(true);
											})
								}
							>
								{more ? "조합 패턴 접기" : "조합 패턴 더 보기"}
							</Button>
							{more ? (
								<>
									<View style={s.block}>
										{title("함께 등장한 번호 Top 10")}
										{data.pairs.length ? (
											data.pairs.slice(0, 10).map((p) => (
												<View key={`${p.a}:${p.b}`} style={s.row}>
													<Balls
														numbers={[p.a, p.b]}
														size={30}
														reducedMotion
														onNumberPress={
															onNumberPress
																? (number) =>
																		onNumberPress(snapshot.round, number)
																: undefined
														}
													/>
													<Text style={text}>
														{p.count.toLocaleString()}개 조합
													</Text>
												</View>
											))
										) : (
											<Text style={[s.body, muted]}>
												이 기간의 번호 쌍 집계가 아직 없어요.
											</Text>
										)}
									</View>
									<View style={s.block}>
										{title("조합 패턴")}
										<Text style={[s.caption, muted]}>
											패턴 집계 대상{" "}
											{data.patterns.combinations.toLocaleString()}
											조합 · 과거 번호별 합계와 집계 범위가 다를 수 있어요.
										</Text>
										{data.patterns.combinations ? (
											<>
												{data.patterns.oddCounts
													.map((count, odd) => ({ count, odd }))
													.map(({ count, odd }) => (
														<View key={odd} style={s.row}>
															<Text style={text}>
																홀 {odd} : 짝 {6 - odd}
															</Text>
															<Text style={text}>
																{percent(count / data.patterns.combinations)}
															</Text>
														</View>
													))}
												<View style={s.row}>
													<Text style={text}>연속번호 포함</Text>
													<Text style={text}>
														{percent(
															data.patterns.withConsecutive /
																data.patterns.combinations,
														)}
													</Text>
												</View>
												{title("번호 합계 분포")}
												{data.patterns.sumCounts
													.map((count, bin) => ({ count, from: bin * 20 }))
													.map(({ count, from }) =>
														count ? (
															<View key={from} style={s.row}>
																<Text style={muted}>
																	{from}~{from + 19}
																</Text>
																<Text style={text}>
																	{percent(count / data.patterns.combinations)}
																</Text>
															</View>
														) : null,
													)}
											</>
										) : (
											<Text style={[s.body, muted]}>
												{period === "day"
													? "24시간 보기에서는 번호별 집계를 제공해요. 회차를 선택하면 패턴을 볼 수 있어요."
													: "새 패턴 집계가 모이면 표시돼요."}
											</Text>
										)}
									</View>
									<View style={s.block}>
										{title("번호 구간별 분포")}
										{[
											[1, 10],
											[11, 20],
											[21, 30],
											[31, 40],
											[41, 45],
										].map(([a, b]) => (
											<View key={a} style={s.row}>
												<Text style={text}>
													{a}~{b}번
												</Text>
												<Text style={text}>
													{percent(
														total
															? sum(data.numberCounts.slice(a - 1, b)) / total
															: 0,
													)}
												</Text>
											</View>
										))}
									</View>
									{total > 0 ? (
										<Banner
											placement="insights_patterns"
											groupId={
												adConfig?.feedInlineGroupIds?.[0] ??
												adConfig?.bannerGroups?.inline ??
												adConfig?.bannerGroupId
											}
										/>
									) : null}
									<View style={s.block}>
										{title("시간별 생성 활동")}
										<Text style={[s.caption, muted]}>
											최근 24시간 · 시간 단위로 새로 집계된 조합
										</Text>
										{data.hours.length ? (
											data.hours.map((h) => (
												<View key={h.hour} style={s.row}>
													<Text style={muted}>
														{new Date(h.hour + 9 * 3600000)
															.toISOString()
															.slice(5, 13)
															.replace("T", " ")}
														시
													</Text>
													<Text style={text}>
														{h.combinations.toLocaleString()}조합
													</Text>
												</View>
											))
										) : (
											<Text style={[s.body, muted]}>
												최근 24시간에 집계된 조합이 없어요.
											</Text>
										)}
									</View>
								</>
							) : null}
						</>
					) : null}
					<Text style={[s.caption, muted]}>
						통계 출처: 645.live · 중복 기록 포함 · 참여 기록의 분포예요.
					</Text>
				</>
			) : null}
		</View>
	);
}
const s = StyleSheet.create({
	root: { gap: 16, paddingVertical: 12 },
	filters: { gap: 8 },
	row: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 8,
	},
	heading: { fontSize: 18, fontWeight: "700", flexShrink: 1 },
	body: { fontSize: 15, lineHeight: 23 },
	caption: { fontSize: 12, lineHeight: 19 },
	summary: { paddingVertical: 18, borderBottomWidth: 1, gap: 8 },
	total: { fontSize: 32, fontWeight: "700", fontVariant: ["tabular-nums"] },
	unit: { fontSize: 14, fontWeight: "500" },
	rankRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		paddingVertical: 12,
		borderBottomWidth: 0.5,
		minHeight: 60,
	},
	rank: { width: 22, fontSize: 12, textAlign: "center" },
	barColumn: { flex: 1, gap: 4 },
	bar: { height: 6, borderRadius: 4, overflow: "hidden" },
	fill: { height: 6, borderRadius: 4 },
	count: { fontSize: 14, fontWeight: "600", fontVariant: ["tabular-nums"] },
	notice: { paddingVertical: 20, gap: 12 },
	block: { gap: 14, paddingVertical: 16 },
	inspector: { padding: 16, borderRadius: 16, gap: 12 },
	saved: { gap: 10, paddingVertical: 10 },
});
