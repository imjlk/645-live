import type { Feed, Generation } from "@645/lotto-core";
import {
	IOFlatList,
	type IOFlatListController,
	useVisibility,
} from "@granite-js/react-native";
import { Button, SegmentedControl } from "@toss/tds-react-native";
import { memo, useEffect, useMemo, useRef } from "react";
import {
	ActivityIndicator,
	RefreshControl,
	StyleSheet,
	Text,
	View,
} from "react-native";
import type { AdConfig } from "./api";
import { Balls } from "./Balls";
import { Banner } from "./Banner";
import { shuffleAdGroups, withFeedAds } from "./feed-ad-slots";
import type { createFeedHistory, FeedHistory } from "./feed-history";
import { GenerationResultsLink } from "./GenerationResultsLink";
import { LiveTotal } from "./LiveCount";
import { LiveNumberGrid } from "./LiveNumberGrid";
import type { ConnectionState } from "./realtime";
import { useTheme } from "./theme";

export function relativeTime(at: number, now: number) {
	const seconds = Math.max(0, Math.floor((now - at) / 1000));
	if (seconds < 60) return "방금";
	if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`;
	return `${Math.floor(seconds / 3600)}시간 전`;
}

const GenerationRow = memo(function GenerationRow({
	item,
	now,
	ballSize,
}: {
	item: Generation;
	now: number;
	ballSize: number;
}) {
	const theme = useTheme();
	return (
		<View style={[s.generation, { borderColor: theme.line }]}>
			<View style={[s.row, { marginBottom: 12 }]}>
				<Text style={[s.body, { color: theme.text }]}>{item.displayName}</Text>
				<Text style={[s.caption, { color: theme.muted }]}>
					{relativeTime(item.createdAt, now)}
				</Text>
			</View>
			<Balls
				numbers={item.numbers}
				size={Math.min(36, ballSize)}
				reducedMotion
			/>
		</View>
	);
});

export function LiveFeed({
	feed,
	history,
	controller,
	adConfig,
	connection,
	ballSize,
	reducedMotion,
	columns,
	onColumnsChange,
	refreshing,
	onRefresh,
	onResults,
}: {
	feed: Feed | null;
	history: FeedHistory;
	controller: ReturnType<typeof createFeedHistory>;
	adConfig: AdConfig | null;
	connection: ConnectionState;
	ballSize: number;
	reducedMotion: boolean;
	columns: 5 | 9;
	onColumnsChange: (columns: 5 | 9) => void;
	refreshing: boolean;
	onRefresh: () => void;
	onResults: () => void;
}) {
	const theme = useTheme();
	const list = useRef<IOFlatListController>(null);
	const visible = useVisibility();
	const scrollOffset = useRef(0);
	const gridChangeOffset = useRef<number | null>(null);
	const lastRound = useRef(history.round);
	const text = { color: theme.text };
	const muted = { color: theme.muted };
	const now = feed?.serverTime ?? Date.now();
	const groupKey = JSON.stringify(
		adConfig?.feedInlineGroupIds ??
			[adConfig?.bannerGroups?.inline ?? adConfig?.bannerGroupId].filter(
				Boolean,
			),
	);
	// Only a configuration change creates a new rotation. SSE and appended pages
	// reuse the same groups, including when FlatList virtualizes an older slot.
	const groups = useMemo(
		() => shuffleAdGroups(JSON.parse(groupKey) as string[]),
		[groupKey],
	);
	const rows = useMemo(
		() => withFeedAds(history.items, groups),
		[history.items, groups],
	);
	useEffect(() => {
		if (!visible) controller.cancel();
		return controller.cancel;
	}, [controller, visible]);
	useEffect(() => {
		if (history.round !== null && lastRound.current !== history.round) {
			scrollOffset.current = 0;
			list.current?.scrollToOffset({ offset: 0, animated: false });
		}
		lastRound.current = history.round;
	}, [history.round]);
	const showLatest = () => {
		controller.showLatest();
		list.current?.scrollToOffset({ offset: 0, animated: false });
	};
	return (
		<View style={s.screen}>
			<IOFlatList
				ref={list}
				style={s.screen}
				contentContainerStyle={s.content}
				data={rows}
				keyExtractor={(row) => row.key}
				renderItem={({ item }) =>
					item.kind === "ad" ? (
						<Banner groupId={item.groupId} format="inline" />
					) : (
						<GenerationRow
							item={item.generation}
							now={now}
							ballSize={ballSize}
						/>
					)
				}
				initialNumToRender={12}
				maxToRenderPerBatch={10}
				windowSize={7}
				onEndReachedThreshold={0.6}
				onEndReached={() => {
					if (visible && !history.error) void controller.loadMore();
				}}
				onScroll={({ nativeEvent }) => {
					scrollOffset.current = Math.max(0, nativeEvent.contentOffset.y);
					controller.follow(nativeEvent.contentOffset.y <= 40);
				}}
				onContentSizeChange={() => {
					// Keep the selector in place when the header changes height.
					// Native visible-row anchoring is still used for live inserts.
					if (gridChangeOffset.current === null) return;
					list.current?.scrollToOffset({
						offset: gridChangeOffset.current,
						animated: false,
					});
					gridChangeOffset.current = null;
				}}
				scrollEventThrottle={100}
				maintainVisibleContentPosition={{
					minIndexForVisible: 0,
					autoscrollToTopThreshold: 40,
				}}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						tintColor={theme.blue}
						onRefresh={() => {
							showLatest();
							onRefresh();
						}}
					/>
				}
				ListHeaderComponent={
					<View>
						<View style={s.row}>
							<Text style={[s.eyebrow, { color: theme.blue }]}>
								{feed?.round ?? "이번"}회 실시간 활동
							</Text>
							<View style={s.live}>
								<View
									style={[
										s.dot,
										{
											backgroundColor:
												connection === "live" ? theme.positive : theme.muted,
										},
									]}
								/>
								<Text style={[s.caption, muted]}>
									{connection === "live" ? "실시간" : "다시 연결 중"}
								</Text>
							</View>
						</View>
						<View style={s.heading}>
							<Text style={[s.title, text]}>번호가 모이고 있어요</Text>
							<Text style={[s.body, muted]}>
								내가 만든 조합도 모두의 흐름에 더해져요.
							</Text>
						</View>
						<LiveTotal
							key={feed?.round ?? "loading"}
							count={feed?.totalGenerations ?? 0}
							reducedMotion={reducedMotion || !visible}
						/>
						<GenerationResultsLink onPress={onResults} />
						<View style={[s.row, s.gridToolbar]}>
							<Text style={[s.sectionTitle, text]}>번호별 생성 횟수</Text>
							<SegmentedControl.Root
								name="live-number-columns"
								size="small"
								alignment="fixed"
								style={s.gridControl}
								value={String(columns)}
								onChange={(value) => {
									if (value !== "5" && value !== "9") return;
									const next = value === "5" ? 5 : 9;
									if (next === columns) return;
									gridChangeOffset.current = scrollOffset.current;
									onColumnsChange(next);
								}}
							>
								<SegmentedControl.Item value="5">5열</SegmentedControl.Item>
								<SegmentedControl.Item value="9">9열</SegmentedControl.Item>
							</SegmentedControl.Root>
						</View>
						<Text style={[s.caption, muted, { marginTop: 8 }]}>
							늘어난 번호가 반짝이고, 추가된 횟수가 함께 보여요.
						</Text>
						<LiveNumberGrid
							feed={feed}
							reducedMotion={reducedMotion || !visible}
							columns={columns}
						/>
						<Text style={[s.caption, muted]}>
							많이 생성된 번호와 당첨 확률은 관계가 없어요.
						</Text>
						<Text style={[s.caption, muted, { marginTop: 6 }]}>
							생성 통계 제공: 645.live
						</Text>
						<View style={[s.row, { marginTop: 20, marginBottom: 12 }]}>
							<Text style={[s.sectionTitle, text]}>최근 생성 내역</Text>
							<Text style={[s.caption, muted]}>
								{history.items.length.toLocaleString()}개 불러옴
							</Text>
						</View>
					</View>
				}
				ListEmptyComponent={
					history.round !== null ? (
						<View style={s.footer}>
							<Text style={[s.body, muted]}>
								이번 회차의 첫 번호를 만들어 보세요.
							</Text>
						</View>
					) : null
				}
				ListFooterComponent={
					<View style={s.footer} accessibilityLiveRegion="polite">
						{history.loading || history.round === null ? (
							<ActivityIndicator
								color={theme.blue}
								accessibilityLabel="이전 생성 내역 불러오는 중"
							/>
						) : null}
						{history.error ? (
							<>
								<Text style={[s.caption, muted]}>{history.error}</Text>
								<Button
									size="tiny"
									style="weak"
									onPress={() => void controller.loadMore()}
								>
									다시 불러오기
								</Button>
							</>
						) : null}
						{!history.loading && !history.error && history.items.length > 0 ? (
							<Text style={[s.caption, muted]}>
								{history.nextCursor
									? "아래로 내리면 이전 내역을 불러와요."
									: "여기까지 확인했어요."}
							</Text>
						) : null}
					</View>
				}
			/>
			{history.hasNewer ? (
				<View style={s.newActivity}>
					<Button size="tiny" onPress={showLatest}>
						새 생성 내역 보기 ↑
					</Button>
				</View>
			) : null}
		</View>
	);
}

const s = StyleSheet.create({
	screen: { flex: 1 },
	content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 26 },
	heading: { marginTop: 16, gap: 10 },
	title: {
		fontSize: 29,
		lineHeight: 39,
		fontWeight: "700",
		letterSpacing: -0.7,
	},
	eyebrow: { fontSize: 14, fontWeight: "600" },
	caption: { fontSize: 12, lineHeight: 18 },
	body: { fontSize: 15, lineHeight: 23, fontWeight: "500" },
	sectionTitle: {
		fontSize: 19,
		lineHeight: 28,
		fontWeight: "700",
		letterSpacing: -0.3,
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 10,
	},
	live: { flexDirection: "row", alignItems: "center", gap: 6 },
	dot: { width: 6, height: 6, borderRadius: 3 },
	generation: { paddingVertical: 18, borderTopWidth: 1 },
	gridToolbar: { marginTop: 28, flexWrap: "wrap" },
	gridControl: { width: 132, paddingHorizontal: 0 },
	footer: { paddingVertical: 26, alignItems: "center", gap: 12 },
	newActivity: { position: "absolute", top: 12, alignSelf: "center" },
});
