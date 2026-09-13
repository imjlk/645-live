import {
	BALL_COLORS,
	ballColor,
	compareDraw,
	describeCombination,
	EMPTY_OPTIONS,
	type GenerationOptions,
	type SavedCombination,
} from "@645/lotto-core";
import { getTossShareLink, share } from "@apps-in-toss/framework";
import { openURL } from "@granite-js/react-native";
import { Button, Switch, Tab } from "@toss/tds-react-native";
import { useEffect, useRef, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Animated,
	Modal,
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Balls } from "./Balls";
import { Banner } from "./Banner";
import { Celebration } from "./Celebration";
import { ReportHistory } from "./ReportHistory";
import { useTheme } from "./theme";
import { useLotto } from "./use-lotto";

type Panel = "custom" | "report" | "attendance" | "settings" | null;
const NUMBERS = Array.from({ length: 45 }, (_, i) => i + 1);
function relativeTime(at: number, now: number) {
	const seconds = Math.max(0, Math.floor((now - at) / 1000));
	return seconds < 60
		? "방금"
		: seconds < 3600
			? `${Math.floor(seconds / 60)}분 전`
			: `${Math.floor(seconds / 3600)}시간 전`;
}
function dateLabel(at: number) {
	const d = new Date(at + 9 * 3600_000);
	return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
}

export function LottoScreen() {
	const model = useLotto();
	const theme = useTheme();
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();
	const [tab, setTab] = useState("make");
	const [panel, setPanel] = useState<Panel>(null);
	const [options, setOptions] = useState<GenerationOptions>(EMPTY_OPTIONS);
	const [draft, setDraft] = useState<GenerationOptions>(EMPTY_OPTIONS);
	const [pickMode, setPickMode] = useState<"fixed" | "excluded">("fixed");
	const [report, setReport] = useState<SavedCombination | null>(null);
	const ballSize = Math.min(
		52,
		Math.floor((Math.min(width, 640) - 40 - 30) / 6),
	);
	const stamps = model.attendance?.streak
		? ((model.attendance.streak - 1) % 3) + 1
		: 0;
	const now = model.feed?.serverTime ?? model.context?.serverTime ?? Date.now();
	const customOpen = (model.adConfig?.passes.custom ?? 0) > now;
	const reportOpen = (model.adConfig?.passes.report ?? 0) > now;
	const hasOptions =
		options.fixed.length > 0 ||
		options.excluded.length > 0 ||
		options.oddCount !== null;
	const isSaved =
		!!model.current &&
		model.saved.some((item) => item.generationId === model.current?.id);
	const scroll = useRef<ScrollView>(null);
	const enter = useRef(new Animated.Value(1)).current;
	// biome-ignore lint/correctness/useExhaustiveDependencies: Each selected tab resets scroll and enters once.
	useEffect(() => {
		scroll.current?.scrollTo({ y: 0, animated: false });
		if (model.reducedMotion) {
			enter.setValue(1);
			return;
		}
		enter.setValue(0);
		const a = Animated.timing(enter, {
			toValue: 1,
			duration: 180,
			useNativeDriver: true,
		});
		a.start();
		return () => a.stop();
	}, [tab, enter, model.reducedMotion]);
	useEffect(() => {
		if (!model.notice) return;
		const timer = setTimeout(model.clearNotice, 5500);
		return () => clearTimeout(timer);
	}, [model.notice, model.clearNotice]);

	useEffect(() => {
		if (
			panel === "report" &&
			report &&
			reportOpen &&
			!model.busy &&
			!model.reports[report.id]
		)
			void model.loadReport(report);
	}, [panel, report, reportOpen, model.busy, model.reports, model.loadReport]);

	const text = { color: theme.text };
	const muted = { color: theme.muted };
	const headline = (title: string, subtitle?: string) => (
		<View style={s.heading}>
			<Text style={[s.title, text]}>{title}</Text>
			{subtitle ? <Text style={[s.description, muted]}>{subtitle}</Text> : null}
		</View>
	);
	const live = (
		<View style={s.live}>
			<View
				style={[
					s.dot,
					{
						backgroundColor:
							model.connection === "live" ? theme.positive : theme.muted,
					},
				]}
			/>
			<Text style={[s.caption, muted]}>
				{model.connection === "live" ? "실시간" : "다시 연결 중"}
			</Text>
		</View>
	);
	const openSettings = () => setPanel("settings");
	const askRemove = (item: SavedCombination) =>
		Alert.alert(
			"번호를 삭제할까요?",
			"보관함에서 삭제해도 공개 생성 내역은 유지돼요.",
			[
				{ text: "취소", style: "cancel" },
				{
					text: "보관함에서 삭제",
					style: "destructive",
					onPress: () => void model.remove(item),
				},
				{
					text: "공개 내역도 삭제",
					onPress: () => void model.removePublic(item),
				},
			],
		);
	const shareApp = async () => {
		try {
			const link = await getTossShareLink("intoss://645-live");
			await share({ message: `함께 만드는 이번 주 로또 번호\n${link}` });
		} catch {
			Alert.alert("공유를 열지 못했어요", "잠시 후 다시 시도해 주세요.");
		}
	};
	const external = (path: string) =>
		void openURL(`https://645.live${path}`).catch(() =>
			Alert.alert("페이지를 열지 못했어요", "다시 시도해 주세요."),
		);
	const feedRows = (limit: number) => (
		<View>
			{model.feed?.generations.length ? (
				model.feed.generations.slice(0, limit).map((item, i) => (
					<View key={item.id} style={[s.feedRow, { borderColor: theme.line }]}>
						<View style={[s.row, { marginBottom: 12 }]}>
							<Text style={[s.body, text]}>{item.displayName}</Text>
							<Text style={[s.caption, muted]}>
								{relativeTime(item.createdAt, now)}
							</Text>
						</View>
						<Balls
							numbers={item.numbers}
							size={Math.min(36, ballSize)}
							animate={i === 0}
							reducedMotion={model.reducedMotion}
						/>
					</View>
				))
			) : (
				<View style={s.empty}>
					<Text style={[s.body, text]}>
						이번 회차의 첫 번호를 만들어 보세요
					</Text>
					<Text style={[s.description, muted]}>
						번호를 만들면 여기에 바로 나타나요.
					</Text>
				</View>
			)}
		</View>
	);
	const featurePass = (feature: "custom" | "report") => {
		const enabled = model.adConfig?.placements.find(
			(p) => p.placement === feature,
		)?.enabled;
		return (
			<View style={{ gap: 20 }}>
				<Text style={[s.description, muted]}>
					{feature === "custom"
						? "고정·제외 번호와 홀짝 비율을 내 취향에 맞춰 골라보세요."
						: "내 조합의 구간 분포와 번호 겹침을 살펴보세요."}
				</Text>
				<Text style={[s.body, text]}>
					광고 한 번으로 24시간 이용할 수 있어요.
				</Text>
				<Button
					display="full"
					loading={model.busy === `unlock-${feature}`}
					disabled={!!model.busy || !enabled}
					onPress={() => void model.unlock(feature)}
				>
					{enabled ? "광고 보고 이용권 열기" : "광고 이용권 준비 중"}
				</Button>
				<Button
					display="full"
					type="dark"
					style="weak"
					onPress={() => setPanel("attendance")}
				>
					3일 출석으로도 열 수 있어요
				</Button>
				<Text style={[s.caption, muted]}>
					기본 번호 생성·보관·결과 확인은 언제나 무료예요.
				</Text>
			</View>
		);
	};

	return (
		<View
			style={[
				s.screen,
				{ backgroundColor: theme.background, paddingBottom: insets.bottom },
			]}
		>
			<View style={s.content}>
				<View style={[s.topbar, { borderColor: theme.line }]}>
					<Text style={[s.brand, text]}>
						645<Text style={{ color: theme.blue }}>LIVE</Text>
					</Text>
					<View style={{ flexDirection: "row", gap: 12 }}>
						<Button
							size="tiny"
							type="dark"
							style="weak"
							onPress={() => setPanel("attendance")}
						>
							{model.attendance?.checkedIn ? "출석 완료" : "오늘 출석"}
						</Button>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="설정"
							onPress={openSettings}
							style={s.settings}
						>
							<Text style={[s.settingsText, muted]}>•••</Text>
						</Pressable>
					</View>
				</View>
				{model.error ? (
					<View
						accessibilityRole="alert"
						style={[s.message, { backgroundColor: theme.surface }]}
					>
						<Text style={[s.description, text]}>{model.error}</Text>
						<Button size="tiny" style="weak" onPress={model.retry}>
							다시 연결
						</Button>
					</View>
				) : null}
				<ScrollView
					ref={scroll}
					style={{ flex: 1 }}
					contentContainerStyle={{ paddingBottom: 24 }}
					refreshControl={
						<RefreshControl
							refreshing={model.refreshing}
							onRefresh={model.retry}
							tintColor={theme.blue}
						/>
					}
				>
					<Animated.View
						style={{
							opacity: enter,
							transform: [
								{
									translateY: enter.interpolate({
										inputRange: [0, 1],
										outputRange: [6, 0],
									}),
								},
							],
						}}
					>
						{tab === "make" ? (
							<>
								<View style={s.section}>
									<View style={s.row}>
										<Text style={[s.eyebrow, { color: theme.blue }]}>
											{model.context
												? `${model.context.targetRound}회 번호 만들기`
												: "이번 주 번호 만들기"}
										</Text>
										<Text style={[s.caption, muted]}>
											{model.context
												? `${dateLabel(model.context.drawsAt)} 추첨`
												: "회차 확인 중"}
										</Text>
									</View>
									{headline(
										"이번 주, 내 번호는?",
										"번호를 만들고 마음에 드는 조합을 보관하세요.",
									)}
									<View style={{ paddingVertical: 26 }}>
										<Balls
											numbers={model.current?.numbers ?? [0, 0, 0, 0, 0, 0]}
											size={ballSize}
											animate
											reducedMotion={model.reducedMotion}
										/>
									</View>
									<View style={[s.row, { minHeight: 44, marginBottom: 14 }]}>
										<Pressable
											accessibilityRole="button"
											onPress={() => {
												setDraft(options);
												setPanel("custom");
											}}
											style={{ paddingVertical: 10 }}
										>
											<Text style={[s.body, { color: theme.blue }]}>
												{hasOptions
													? "맞춤 조건 적용 중"
													: "내 취향대로 만들기"}{" "}
												›
											</Text>
										</Pressable>
										{hasOptions ? (
											<Pressable
												accessibilityRole="button"
												onPress={() => setOptions(EMPTY_OPTIONS)}
											>
												<Text style={[s.caption, muted]}>초기화</Text>
											</Pressable>
										) : null}
									</View>
									<Button
										display="full"
										loading={model.busy === "generate"}
										disabled={!!model.busy || !model.user || !model.context}
										onPress={() =>
											void model.generate(hasOptions ? options : EMPTY_OPTIONS)
										}
									>
										{model.current ? "새 번호 만들기" : "번호 만들기"}
									</Button>
									{model.current ? (
										<View style={{ marginTop: 10 }}>
											<Button
												display="full"
												style="weak"
												loading={model.busy === "save"}
												disabled={!!model.busy || isSaved || !model.savedReady}
												onPress={() => {
													if (model.current) void model.save(model.current);
												}}
											>
												{isSaved ? "보관함에 저장했어요" : "이 번호 보관하기"}
											</Button>
										</View>
									) : null}
									<Text style={[s.finePrint, muted]}>
										생성한 번호는 실시간 활동에 함께 표시돼요.
									</Text>
									<Banner groupId={model.adConfig?.bannerGroupId} />
								</View>
								<View style={[s.divider, { backgroundColor: theme.surface }]} />
								<View style={s.section}>
									<View style={s.row}>
										<Text style={[s.sectionTitle, text]}>
											지금 함께 만드는 번호
										</Text>
										{live}
									</View>
									<View style={{ paddingVertical: 20 }}>
										<Text style={[s.total, text]}>
											{(model.feed?.totalGenerations ?? 0).toLocaleString()}
											<Text style={[s.body, muted]}> 조합</Text>
										</Text>
										<Text style={[s.caption, muted]}>
											이번 회차에 쌓인 번호예요.
										</Text>
									</View>
									{feedRows(3)}
									<Button
										display="full"
										type="dark"
										style="weak"
										onPress={() => setTab("live")}
									>
										실시간 번호 흐름 보기
									</Button>
								</View>
								{model.context?.latestDraw ? (
									<View
										style={[
											s.section,
											{ borderTopWidth: 8, borderTopColor: theme.surface },
										]}
									>
										<View style={s.row}>
											<Text style={[s.sectionTitle, text]}>최근 당첨 번호</Text>
											<Text style={[s.caption, muted]}>
												{model.context.latestDraw.round}회
											</Text>
										</View>
										<View style={{ paddingTop: 20 }}>
											<Balls
												numbers={model.context.latestDraw.numbers}
												size={Math.min(40, ballSize)}
											/>
										</View>
										<Text style={[s.caption, muted, { marginTop: 12 }]}>
											보너스 {model.context.latestDraw.bonus}
										</Text>
									</View>
								) : null}
							</>
						) : tab === "live" ? (
							<View style={s.section}>
								<View style={s.row}>
									<Text style={[s.eyebrow, { color: theme.blue }]}>
										{model.context?.targetRound}회 실시간 활동
									</Text>
									{live}
								</View>
								{headline(
									"번호가 모이고 있어요",
									"내가 만든 조합도 모두의 흐름에 더해져요.",
								)}
								<Text style={[s.total, text]}>
									{(model.feed?.totalGenerations ?? 0).toLocaleString()}
									<Text style={[s.body, muted]}> 조합 생성</Text>
								</Text>
								<View style={{ marginTop: 28 }}>
									<Text style={[s.sectionTitle, text]}>
										어떤 번호가 많이 나왔을까?
									</Text>
									<Text style={[s.caption, muted, { marginTop: 8 }]}>
										번호 아래 숫자는 이번 회차 생성 횟수예요.
									</Text>
									<View style={s.numberGrid}>
										{NUMBERS.map((n) => (
											<View key={n} style={s.numberCell}>
												<View
													style={[
														s.numberSmall,
														{ backgroundColor: ballColor(n) },
													]}
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
													{model.feed?.numberCounts[n - 1] ?? 0}
												</Text>
											</View>
										))}
									</View>
								</View>
								<Text style={[s.caption, muted]}>
									많이 생성된 번호와 당첨 확률은 관계가 없어요.
								</Text>
								<Banner groupId={model.adConfig?.bannerGroupId} />
								<View style={[s.row, { marginTop: 12 }]}>
									<Text style={[s.sectionTitle, text]}>최근 생성 내역</Text>
									<Text style={[s.caption, muted]}>최신 30개</Text>
								</View>
								{feedRows(30)}
							</View>
						) : (
							<View style={s.section}>
								<View style={s.row}>
									<Text style={[s.eyebrow, { color: theme.blue }]}>
										이 기기의 번호 보관함
									</Text>
									<Text style={[s.caption, muted]}>
										{model.saved.length} / 200
									</Text>
								</View>
								{headline(
									"내가 고른 여섯 개",
									"추첨 후 다시 열면 결과를 바로 확인할 수 있어요.",
								)}
								{model.attendance?.notificationTemplateCode ? (
									<View style={[s.row, { paddingVertical: 16 }]}>
										<View style={{ flex: 1, paddingRight: 12 }}>
											<Text style={[s.body, text]}>결과가 나오면 알려주기</Text>
											<Text style={[s.caption, muted]}>
												보관한 회차의 결과 알림
											</Text>
										</View>
										<Switch
											checked={model.attendance.notificationsEnabled}
											onCheckedChange={(checked) =>
												void model.notifications(checked)
											}
										/>
									</View>
								) : null}
								<Banner groupId={model.adConfig?.bannerGroupId} />
								{!model.savedReady ? (
									<View style={s.empty}>
										<ActivityIndicator color={theme.blue} />
										<Text style={[s.description, muted]}>
											보관함 연결을 확인하고 있어요.
										</Text>
									</View>
								) : !model.saved.length ? (
									<View style={s.empty}>
										<Balls
											numbers={[0, 0, 0, 0, 0, 0]}
											size={Math.min(38, ballSize)}
										/>
										<Text style={[s.sectionTitle, text, { marginTop: 24 }]}>
											아직 보관한 번호가 없어요
										</Text>
										<Text
											style={[
												s.description,
												muted,
												{ marginTop: 8, marginBottom: 24 },
											]}
										>
											번호를 만든 뒤 ‘이 번호 보관하기’를 눌러 주세요.
										</Text>
										<Button display="full" onPress={() => setTab("make")}>
											첫 번호 만들러 가기
										</Button>
									</View>
								) : (
									model.saved.map((item) => {
										const draw = model.results[item.round];
										const result = draw
											? compareDraw(item.numbers, draw)
											: null;
										return (
											<View
												key={item.id}
												style={[s.savedRow, { borderColor: theme.line }]}
											>
												<View style={[s.row, { marginBottom: 16 }]}>
													<Text style={[s.body, text]}>{item.round}회</Text>
													<Text
														style={[
															s.caption,
															{
																color: result?.rank
																	? theme.positive
																	: theme.muted,
															},
														]}
													>
														{result
															? result.rank
																? `${result.rank}등 번호 일치`
																: `${result.matches.length}개 일치`
															: item.round <=
																	(model.context?.latestDraw?.round ?? 0)
																? "결과 확인 필요"
																: "추첨 결과 기다리는 중"}
													</Text>
												</View>
												<Balls
													numbers={item.numbers}
													size={Math.min(42, ballSize)}
													matches={result?.matches}
												/>
												<View style={[s.row, { marginTop: 14 }]}>
													<Pressable
														accessibilityRole="button"
														onPress={() => {
															setReport(item);
															setPanel("report");
														}}
														style={{ paddingVertical: 10 }}
													>
														<Text style={[s.body, { color: theme.blue }]}>
															조합 살펴보기 ›
														</Text>
													</Pressable>
													<Pressable
														accessibilityRole="button"
														accessibilityLabel={`${item.round}회 보관 번호 삭제`}
														onPress={() => askRemove(item)}
														style={{ padding: 10 }}
													>
														<Text style={[s.caption, muted]}>삭제</Text>
													</Pressable>
												</View>
											</View>
										);
									})
								)}
								<Text style={[s.finePrint, muted]}>
									보관 번호는 실제 구매 내역이 아니에요. 기기 보관함은 토스 앱을
									삭제하면 함께 지워질 수 있어요.
								</Text>
							</View>
						)}
					</Animated.View>
				</ScrollView>
				{model.notice ? (
					<View
						accessibilityLiveRegion="polite"
						style={[
							s.toast,
							{ backgroundColor: theme.dark ? "#E5E8EB" : "#333D4B" },
						]}
					>
						<Text
							style={{
								color: theme.dark ? "#191F28" : "white",
								fontSize: 14,
								lineHeight: 21,
							}}
						>
							{model.notice}
						</Text>
					</View>
				) : null}
				<View style={{ borderTopWidth: 1, borderColor: theme.line }}>
					<Tab value={tab} onChange={setTab} size="large">
						<Tab.Item value="make">번호 만들기</Tab.Item>
						<Tab.Item value="live">실시간</Tab.Item>
						<Tab.Item value="saved" redBean={!!model.celebration}>
							보관함
						</Tab.Item>
					</Tab>
				</View>
			</View>
			{model.celebration && !model.reducedMotion ? (
				<View
					pointerEvents="none"
					style={[
						{
							position: "absolute",
							top: 0,
							right: 0,
							bottom: 0,
							left: 0,
						} as const,
						{ top: 120 },
					]}
				>
					<Celebration
						key={model.celebration}
						onDone={model.finishCelebration}
					/>
				</View>
			) : null}

			<Modal
				visible={panel !== null}
				transparent
				animationType={model.reducedMotion ? "none" : "slide"}
				onRequestClose={() => setPanel(null)}
			>
				<View style={s.modalBackdrop}>
					<Pressable
						style={
							{
								position: "absolute",
								top: 0,
								right: 0,
								bottom: 0,
								left: 0,
							} as const
						}
						accessibilityLabel="닫기"
						onPress={() => setPanel(null)}
					/>
					<View
						style={[
							s.sheet,
							{
								backgroundColor: theme.background,
								paddingBottom: Math.max(insets.bottom, 24),
								maxHeight: "90%",
							},
						]}
					>
						<View style={[s.row, { paddingBottom: 20 }]}>
							<Text style={[s.sectionTitle, text]}>
								{panel === "custom"
									? "내 취향대로 만들기"
									: panel === "report"
										? "내 조합 살펴보기"
										: panel === "attendance"
											? "매일 한 번, 출석"
											: "설정"}
							</Text>
							<Button
								size="tiny"
								type="dark"
								style="weak"
								onPress={() => setPanel(null)}
							>
								닫기
							</Button>
						</View>
						{model.error ? (
							<Text
								accessibilityRole="alert"
								style={{ color: "#F04452", marginBottom: 14, lineHeight: 22 }}
							>
								{model.error}
							</Text>
						) : null}
						<ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
							{panel === "custom" ? (
								customOpen ? (
									<View style={{ gap: 20 }}>
										<Text style={[s.description, muted]}>
											넣고 싶은 번호와 빼고 싶은 번호를 골라 주세요.
										</Text>
										<Tab
											value={pickMode}
											onChange={(v) => setPickMode(v as "fixed" | "excluded")}
											size="small"
										>
											<Tab.Item value="fixed">
												고정 {draft.fixed.length}/6
											</Tab.Item>
											<Tab.Item value="excluded">
												제외 {draft.excluded.length}/39
											</Tab.Item>
										</Tab>
										<View style={s.pickerGrid}>
											{NUMBERS.map((n) => {
												const fixed = draft.fixed.includes(n),
													excluded = draft.excluded.includes(n);
												return (
													<Pressable
														key={n}
														accessibilityRole="button"
														accessibilityLabel={`${n}번 ${fixed ? "고정" : excluded ? "제외" : "선택"}`}
														accessibilityState={{ selected: fixed || excluded }}
														onPress={() =>
															setDraft((prev) => {
																const list = prev[pickMode],
																	other =
																		pickMode === "fixed" ? "excluded" : "fixed";
																if (
																	!list.includes(n) &&
																	list.length >= (pickMode === "fixed" ? 6 : 39)
																)
																	return prev;
																return {
																	...prev,
																	[pickMode]: list.includes(n)
																		? list.filter((v) => v !== n)
																		: [...list, n].sort((a, b) => a - b),
																	[other]: prev[other].filter((v) => v !== n),
																};
															})
														}
														style={[
															s.picker,
															{
																backgroundColor: fixed
																	? theme.blue
																	: excluded
																		? theme.surface
																		: theme.background,
																borderColor: excluded
																	? theme.muted
																	: fixed
																		? theme.blue
																		: theme.line,
															},
														]}
													>
														<Text
															style={{
																color: fixed
																	? "white"
																	: excluded
																		? theme.muted
																		: theme.text,
																fontSize: 16,
																fontWeight: "600",
																textDecorationLine: excluded
																	? "line-through"
																	: "none",
															}}
														>
															{n}
														</Text>
													</Pressable>
												);
											})}
										</View>
										<Text style={[s.body, text]}>홀수 개수</Text>
										<ScrollView
											horizontal
											showsHorizontalScrollIndicator={false}
										>
											<View style={{ flexDirection: "row", gap: 8 }}>
												{[null, 0, 1, 2, 3, 4, 5, 6].map((n) => (
													<Button
														key={String(n)}
														size="tiny"
														type={draft.oddCount === n ? "primary" : "dark"}
														style="weak"
														onPress={() =>
															setDraft((prev) => ({ ...prev, oddCount: n }))
														}
													>
														{n === null ? "상관없음" : `${n}개`}
													</Button>
												))}
											</View>
										</ScrollView>
										<Text style={[s.caption, muted]}>
											조건은 취향을 반영해요. 모든 조합의 당첨 확률은 같아요.
										</Text>
										<Button
											display="full"
											onPress={() => {
												setOptions(draft);
												setPanel(null);
											}}
										>
											이 조건으로 만들기
										</Button>
									</View>
								) : (
									featurePass("custom")
								)
							) : null}
							{panel === "report"
								? reportOpen && report
									? (() => {
											const info = describeCombination(
												report.numbers,
												model.saved
													.filter((i) => i.id !== report.id)
													.map((i) => i.numbers),
											);
											return (
												<View style={{ gap: 22 }}>
													<Balls
														numbers={report.numbers}
														size={Math.min(42, ballSize)}
													/>
													<View style={s.row}>
														<Text style={[s.body, muted]}>홀수 : 짝수</Text>
														<Text style={[s.body, text]}>
															{info.odd} : {6 - info.odd}
														</Text>
													</View>
													<View style={s.row}>
														<Text style={[s.body, muted]}>번호 합계</Text>
														<Text style={[s.body, text]}>{info.sum}</Text>
													</View>
													<View style={s.row}>
														<Text style={[s.body, muted]}>연속 번호 쌍</Text>
														<Text style={[s.body, text]}>
															{info.consecutive}쌍
														</Text>
													</View>
													<View style={s.row}>
														<Text style={[s.body, muted]}>
															다른 보관 조합과 최대 겹침
														</Text>
														<Text style={[s.body, text]}>
															{info.maxOverlap}개
														</Text>
													</View>
													<View>
														<Text style={[s.body, text, { marginBottom: 16 }]}>
															번호 구간 분포
														</Text>
														{info.sections.map((count, i) => (
															<View
																key={BALL_COLORS[i]}
																style={[s.row, { marginBottom: 12 }]}
															>
																<Text style={[s.caption, muted, { width: 64 }]}>
																	{i * 10 + 1}~{Math.min(45, (i + 1) * 10)}
																</Text>
																<View
																	style={{
																		flex: 1,
																		height: 8,
																		borderRadius: 4,
																		backgroundColor: theme.surface,
																	}}
																>
																	<View
																		style={{
																			height: 8,
																			width: `${(count / 6) * 100}%`,
																			backgroundColor: BALL_COLORS[i],
																			borderRadius: 4,
																		}}
																	/>
																</View>
																<Text
																	style={[
																		s.caption,
																		muted,
																		{ width: 32, textAlign: "right" },
																	]}
																>
																	{count}
																</Text>
															</View>
														))}
													</View>
													<ReportHistory
														state={model.reports[report.id]}
														retry={() => void model.loadReport(report)}
														busy={!!model.busy}
														ballSize={ballSize}
													/>
													<Text style={[s.caption, muted]}>
														내 조합을 이해하는 정보예요. 다음 당첨 결과를
														예측하지 않아요.
													</Text>
												</View>
											);
										})()
									: featurePass("report")
								: null}
							{panel === "attendance" ? (
								<View style={{ gap: 24 }}>
									<Text style={[s.title, text]}>
										{model.attendance?.streak ?? 0}일째 함께해요
									</Text>
									<Text style={[s.description, muted]}>
										3일 연속 출석하면 맞춤 생성과 분석을 하루 동안 자유롭게
										이용할 수 있어요.
									</Text>
									<View style={s.row}>
										{[1, 2, 3].map((day) => (
											<View
												key={day}
												style={[
													s.stamp,
													{
														backgroundColor:
															stamps >= day ? theme.blue : theme.surface,
													},
												]}
											>
												<Text
													style={{
														fontSize: 22,
														fontWeight: "700",
														color: stamps >= day ? "white" : theme.muted,
													}}
												>
													{day}
												</Text>
												<Text
													style={[
														s.caption,
														{
															color: stamps >= day ? "white" : theme.muted,
														},
													]}
												>
													{day === 3 ? "이용권" : "출석"}
												</Text>
											</View>
										))}
									</View>
									<Button
										display="full"
										loading={model.busy === "checkIn"}
										disabled={
											!!model.busy || !model.user || model.attendance?.checkedIn
										}
										onPress={() => void model.checkIn()}
									>
										{model.attendance?.checkedIn
											? "오늘 출석 완료"
											: "오늘 출석하기"}
									</Button>
									{model.attendance?.promotion ? (
										<View style={{ gap: 12 }}>
											<Text style={[s.sectionTitle, text]}>
												5일 출석 프로모션
											</Text>
											<Text style={[s.description, muted]}>
												5일 연속 출석 후 {model.attendance.promotion.amount}원을
												받을 수 있어요.
											</Text>
											<Button
												style="weak"
												display="full"
												loading={model.busy === "promotion"}
												disabled={
													(!model.attendance.promotion.eligible &&
														!model.attendance.promotion.status) ||
													!!model.busy ||
													["success", "already_claimed"].includes(
														model.attendance.promotion.status ?? "",
													)
												}
												onPress={() => void model.promotion()}
											>
												{model.attendance.promotion.status === "success"
													? "지급 완료"
													: model.attendance.promotion.status ===
															"already_claimed"
														? "이전에 신청한 프로모션"
														: model.attendance.promotion.status
															? "지급 상태 확인"
															: "출석 혜택 받기"}
											</Button>
										</View>
									) : null}
								</View>
							) : null}
							{panel === "settings" ? (
								<View style={{ gap: 20 }}>
									<Text style={[s.body, text]}>
										{model.user?.displayName ?? "연결을 확인하고 있어요"}
									</Text>
									<Text style={[s.description, muted]}>
										645.live 계정 가입 없이 이용할 수 있어요.
									</Text>
									<Button
										display="full"
										type="dark"
										style="weak"
										onPress={() => external("/qr-scan")}
									>
										실제 구매 번호는 645.live에서 QR 스캔
									</Button>
									<Button
										display="full"
										type="dark"
										style="weak"
										onPress={() => void shareApp()}
									>
										친구에게 공유하기
									</Button>
									<Button
										display="full"
										type="dark"
										style="weak"
										onPress={() => external("/privacy")}
									>
										개인정보 처리방침
									</Button>
									<Button
										display="full"
										type="dark"
										style="weak"
										onPress={() =>
											void openURL("mailto:support@645.live").catch(() =>
												Alert.alert(
													"문의 이메일",
													"support@645.live로 연락해 주세요.",
												),
											)
										}
									>
										문의하기
									</Button>
									<Text style={[s.caption, muted]}>
										공개 생성 내역은 90일 동안 보관돼요. 기기에 보관한 번호는
										직접 삭제할 때까지 유지돼요.
									</Text>
									<Button
										display="full"
										type="danger"
										style="weak"
										disabled={!!model.busy || !model.user}
										onPress={() =>
											Alert.alert(
												"미니앱 데이터를 삭제할까요?",
												"공개 생성 내역, 출석 및 알림 설정, 이 기기의 보관 번호를 삭제해요.",
												[
													{ text: "취소", style: "cancel" },
													{
														text: "삭제",
														style: "destructive",
														onPress: () => {
															void model.withdraw();
															setPanel(null);
														},
													},
												],
											)
										}
									>
										내 미니앱 데이터 삭제
									</Button>
								</View>
							) : null}
						</ScrollView>
					</View>
				</View>
			</Modal>
		</View>
	);
}

const s = StyleSheet.create({
	screen: { flex: 1 },
	content: { flex: 1, width: "100%", maxWidth: 640, alignSelf: "center" },
	topbar: {
		paddingHorizontal: 20,
		paddingVertical: 12,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		borderBottomWidth: 1,
	},
	brand: { fontWeight: "900", fontSize: 22, letterSpacing: -1 },
	settings: { minWidth: 32, alignItems: "center", justifyContent: "center" },
	settingsText: { fontSize: 20, letterSpacing: 1 },
	section: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 26 },
	heading: { marginTop: 16, gap: 10 },
	title: {
		fontSize: 29,
		lineHeight: 39,
		fontWeight: "700",
		letterSpacing: -0.7,
	},
	description: { fontSize: 15, lineHeight: 23 },
	eyebrow: { fontSize: 14, fontWeight: "600" },
	caption: { fontSize: 12, lineHeight: 18 },
	body: { fontSize: 15, lineHeight: 23, fontWeight: "500" },
	finePrint: {
		fontSize: 12,
		lineHeight: 19,
		textAlign: "center",
		marginTop: 16,
	},
	sectionTitle: {
		fontSize: 19,
		lineHeight: 28,
		fontWeight: "700",
		letterSpacing: -0.3,
	},
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		gap: 10,
	},
	live: { flexDirection: "row", alignItems: "center", gap: 6 },
	dot: { width: 6, height: 6, borderRadius: 3 },
	divider: { height: 8 },
	total: {
		fontSize: 34,
		lineHeight: 44,
		fontWeight: "700",
		letterSpacing: -0.8,
		fontVariant: ["tabular-nums"],
	},
	feedRow: { paddingVertical: 18, borderTopWidth: 1 },
	empty: { paddingVertical: 40, gap: 8 },
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
	numberSmall: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	numberCount: { fontSize: 10, fontVariant: ["tabular-nums"] },
	savedRow: { borderTopWidth: 1, paddingVertical: 22 },
	message: { paddingHorizontal: 20, paddingVertical: 12, gap: 10 },
	toast: {
		position: "absolute",
		left: 20,
		right: 20,
		bottom: 68,
		paddingHorizontal: 18,
		paddingVertical: 14,
		borderRadius: 14,
		zIndex: 20,
	},
	modalBackdrop: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.45)",
		justifyContent: "flex-end",
	},
	sheet: {
		padding: 24,
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		width: "100%",
		maxWidth: 640,
		alignSelf: "center",
	},
	pickerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
	picker: {
		width: 38,
		height: 40,
		borderRadius: 12,
		borderWidth: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	stamp: {
		width: "30%",
		height: 92,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
		gap: 6,
	},
});
