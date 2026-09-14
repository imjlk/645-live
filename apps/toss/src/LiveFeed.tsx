import { ballColor, type Feed, type Generation } from "@645/lotto-core";
import {
	IOFlatList,
	type IOFlatListController,
} from "@granite-js/react-native";
import { Button } from "@toss/tds-react-native";
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
	refreshing,
	onRefresh,
}: {
	feed: Feed | null;
	history: FeedHistory;
	controller: ReturnType<typeof createFeedHistory>;
	adConfig: AdConfig | null;
	connection: ConnectionState;
	ballSize: number;
	refreshing: boolean;
	onRefresh: () => void;
}) {
	const theme = useTheme();
	const list = useRef<IOFlatListController>(null);
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
		controller.showLatest();
		return controller.cancel;
	}, [controller]);
	useEffect(() => {
		if (history.round !== null)
			list.current?.scrollToOffset({ offset: 0, animated: false });
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
					if (!history.error) void controller.loadMore();
				}}
				onScroll={({ nativeEvent }) =>
					controller.follow(nativeEvent.contentOffset.y <= 40)
				}
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
						<Text style={[s.total, text]}>
							{(feed?.totalGenerations ?? 0).toLocaleString()}
							<Text style={[s.body, muted]}> 조합 생성</Text>
						</Text>
						<Text style={[s.sectionTitle, text, { marginTop: 28 }]}>
							어떤 번호가 많이 나왔을까?
						</Text>
						<Text style={[s.caption, muted, { marginTop: 8 }]}>
							번호 아래 숫자는 이번 회차 생성 횟수예요.
						</Text>
						<View style={s.numberGrid}>
							{Array.from({ length: 45 }, (_, i) => i + 1).map((n) => (
								<View
									key={n}
									style={s.numberCell}
									accessible
									accessibilityLabel={`${n}번 ${feed?.numberCounts[n - 1] ?? 0}회 생성`}
								>
									<View
										style={[s.numberBall, { backgroundColor: ballColor(n) }]}
									>
										<Text
											style={{
												fontWeight: "700",
												color: n <= 10 ? "#3D3000" : "white",
												fontSize: 14,
											}}
										>
											{n}
										</Text>
									</View>
									<Text style={[s.numberCount, muted]}>
										{feed?.numberCounts[n - 1] ?? 0}
									</Text>
								</View>
							))}
						</View>
						<Text style={[s.caption, muted]}>
							많이 생성된 번호와 당첨 확률은 관계가 없어요.
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
	content: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 26 },
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
	total: {
		fontSize: 34,
		lineHeight: 44,
		fontWeight: "700",
		letterSpacing: -0.8,
		fontVariant: ["tabular-nums"],
	},
	generation: { paddingVertical: 18, borderTopWidth: 1 },
	numberGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		marginTop: 18,
		marginHorizontal: -2,
	},
	numberCell: {
		width: "11.111%",
		alignItems: "center",
		paddingVertical: 8,
		gap: 6,
	},
	numberBall: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	numberCount: { fontSize: 10, fontVariant: ["tabular-nums"] },
	footer: { paddingVertical: 26, alignItems: "center", gap: 12 },
	newActivity: { position: "absolute", top: 12, alignSelf: "center" },
});
