import {
	BALL_COLORS,
	compareDraw,
	describeCombination,
	EMPTY_OPTIONS,
	type GenerationOptions,
	type SavedCombination,
} from "@645/lotto-core";
import { getTossShareLink, share } from "@apps-in-toss/framework";
import { IOScrollView, useBackEvent } from "@granite-js/react-native";
import {
	BottomSheet,
	Button,
	IconButton,
	Switch,
	Tab,
} from "@toss/tds-react-native";
import {
	HideAccessibilityProvider,
	HideAccessibilityView,
} from "@toss/tds-react-native/private";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import {
	ActivityIndicator,
	Alert,
	Animated,
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AttendancePanel } from "./AttendancePanel";
import { LOCAL_PREVIEW } from "./api";
import { Balls } from "./Balls";
import { Banner } from "./Banner";
import { Celebration } from "./Celebration";
import { generationOptionsError } from "./generation-options";
import { LiveFeed, relativeTime } from "./LiveFeed";
import { LocalResultPreview } from "./LocalResultPreview";
import { LocalTestPanel } from "./LocalTestPanel";
import { PrivacyNotice } from "./PrivacyNotice";
import { ReportHistory } from "./ReportHistory";
import { SAVED_LIMIT } from "./saved-store";
import { useTheme } from "./theme";
import { useLotto } from "./use-lotto";

type Panel =
	| "custom"
	| "report"
	| "attendance"
	| "settings"
	| "privacy"
	| "support"
	| "localTest"
	| "resultPreview"
	| null;
const PANEL_TITLES = {
	custom: "내 취향대로 만들기",
	report: "내 조합 살펴보기",
	attendance: "매일 한 번, 출석",
	settings: "설정",
	privacy: "개인정보 처리방침",
	support: "문의하기",
	localTest: "로컬 테스트 도구",
	resultPreview: "당첨 결과 미리보기",
} as const;
const PANEL_PARENTS: Partial<Record<NonNullable<Panel>, NonNullable<Panel>>> = {
	privacy: "settings",
	support: "settings",
	localTest: "settings",
	resultPreview: "localTest",
};
const NUMBERS = Array.from({ length: 45 }, (_, i) => i + 1);
function dateLabel(at: number) {
	const d = new Date(at + 9 * 3600_000);
	return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
}

export function LottoScreen() {
	return (
		<HideAccessibilityProvider>
			<LottoContent />
		</HideAccessibilityProvider>
	);
}

function LottoContent() {
	const model = useLotto();
	const generationLabel = model.current ? "새 번호 만들기" : "번호 만들기";
	const theme = useTheme();
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();
	const [tab, setTab] = useState("make");
	const [liveColumns, setLiveColumns] = useState<5 | 9>(5);
	const [savedPage, setSavedPage] = useState(0);
	const savedPages = Math.max(1, Math.ceil(model.saved.length / 20));
	const currentSavedPage = Math.min(savedPage, savedPages - 1);
	const [{ panel, open: sheetOpen }, setSheet] = useState<{
		panel: Panel;
		open: boolean;
	}>({ panel: null, open: false });
	const setPanel = useCallback((next: Panel) => {
		setSheet((current) =>
			next ? { panel: next, open: true } : { ...current, open: false },
		);
	}, []);
	const backEvent = useBackEvent();
	const sheetScroll = useRef<ScrollView>(null);
	useEffect(() => {
		if (!sheetOpen) return;
		const close = () => setPanel(panel ? (PANEL_PARENTS[panel] ?? null) : null);
		backEvent.addEventListener(close);
		return () => backEvent.removeEventListener(close);
	}, [backEvent, panel, sheetOpen, setPanel]);
	useEffect(() => {
		if (panel && sheetOpen)
			sheetScroll.current?.scrollTo({ y: 0, animated: false });
	}, [panel, sheetOpen]);
	const [options, setOptions] = useState<GenerationOptions>(EMPTY_OPTIONS);
	const [draft, setDraft] = useState<GenerationOptions>(EMPTY_OPTIONS);
	const [pickMode, setPickMode] = useState<"fixed" | "excluded">("fixed");
	const draftError = generationOptionsError(draft);
	const [report, setReport] = useState<SavedCombination | null>(null);
	const ballSize = Math.min(
		52,
		Math.floor((Math.min(width, 640) - 40 - 30) / 6),
	);
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
		setSavedPage(0);
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
			sheetOpen &&
			panel === "report" &&
			report &&
			reportOpen &&
			!model.busy &&
			!model.reports[report.id]
		)
			void model.loadReport(report);
	}, [
		sheetOpen,
		panel,
		report,
		reportOpen,
		model.busy,
		model.reports,
		model.loadReport,
	]);

	const text = { color: theme.text };
	const muted = { color: theme.muted };
	const headline = (title: string, subtitle?: string, action?: ReactNode) => (
		<View style={s.heading}>
			<View style={s.headingRow}>
				<Text style={[s.title, s.headingTitle, text]}>{title}</Text>
				{action}
			</View>
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
	const generateDraft = async () => {
		if (draftError) return;
		const requested = draft;
		if (!(await model.generate(requested))) return;
		setOptions(requested);
		setSheet((current) =>
			current.panel === "custom" ? { ...current, open: false } : current,
		);
	};
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
	const feedRows = (limit: number, start = 0) => (
		<View>
			{model.feed?.generations.length ? (
				model.feed.generations.slice(start, limit).map((item, i) => (
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
				{LOCAL_PREVIEW ? (
					<Button
						display="full"
						type="dark"
						style="weak"
						loading={model.busy === "test-pass"}
						disabled={!!model.busy || !model.user}
						onPress={() => void model.testPass(feature)}
					>
						테스트 · 광고 없이 이용권 열기
					</Button>
				) : null}
				<Button
					display="full"
					loading={model.busy === `unlock-${feature}`}
					disabled={!!model.busy || !enabled || !!model.adUnavailableReason}
					onPress={() => void model.unlock(feature)}
				>
					{model.adUnavailableReason
						? "현재 환경에서 광고 이용 불가"
						: enabled
							? LOCAL_PREVIEW
								? "테스트 광고 보고 이용권 열기"
								: "광고 보고 이용권 열기"
							: "광고 이용권 준비 중"}
				</Button>
				{model.adUnavailableReason ? (
					<Text style={[s.caption, muted]}>{model.adUnavailableReason}</Text>
				) : null}

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
			<HideAccessibilityView style={s.content}>
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
				{tab === "live" ? (
					<LiveFeed
						feed={model.feed}
						history={model.history}
						controller={model.feedHistory}
						adConfig={model.adConfig}
						connection={model.connection}
						ballSize={ballSize}
						reducedMotion={model.reducedMotion}
						columns={liveColumns}
						onColumnsChange={setLiveColumns}
						refreshing={model.refreshing}
						onRefresh={model.retry}
					/>
				) : (
					<IOScrollView
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
									<View style={[s.section, s.firstSection]}>
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
													model.clearError();
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
										{LOCAL_PREVIEW ? (
											<View style={{ marginBottom: 8 }}>
												<Button
													size="tiny"
													style="weak"
													disabled={!!model.busy || !model.user}
													onPress={() => void model.prepareGenerationAd()}
												>
													테스트: 광고 시점 만들기
												</Button>
											</View>
										) : null}
										<Button
											display="full"
											loading={model.busy === "generate"}
											disabled={!!model.busy || !model.user || !model.context}
											onPress={() =>
												void model.generate(
													hasOptions ? options : EMPTY_OPTIONS,
													model.generationAdRequired,
												)
											}
										>
											{model.generationAdRequired
												? "광고 보고 계속 만들기"
												: generationLabel}
										</Button>
										{model.current ? (
											<View style={{ marginTop: 10 }}>
												<Button
													display="full"
													style="weak"
													loading={model.busy === "save"}
													disabled={
														!!model.busy || isSaved || !model.savedReady
													}
													onPress={() => {
														if (model.current) void model.save(model.current);
													}}
												>
													{isSaved ? "보관함에 저장했어요" : "이 번호 보관하기"}
												</Button>
											</View>
										) : null}
										<Pressable
											accessibilityRole="button"
											accessibilityLabel="오늘의 출석과 혜택 보기"
											onPress={() => setPanel("attendance")}
											style={({ pressed }) => [
												s.attendanceEntry,
												{
													borderColor: theme.line,
													opacity: pressed ? 0.65 : 1,
												},
											]}
										>
											<View style={s.attendanceCopy}>
												<Text style={[s.body, text]}>
													{model.attendance?.checkedIn
														? `오늘 출석 완료 · ${model.attendance.streak}/7일`
														: "오늘의 출석"}
												</Text>
												<Text style={[s.caption, muted]}>
													{model.attendance?.generatedToday
														? "출석을 이어가고 혜택을 확인해 보세요."
														: "번호를 한 번 만들면 출석할 수 있어요."}
												</Text>
											</View>
											<Text style={[s.body, { color: theme.blue }]}>
												{model.attendance?.checkedIn
													? "혜택 보기 ›"
													: "출석하기 ›"}
											</Text>
										</Pressable>
										<Text style={[s.finePrint, muted]}>
											생성한 번호는 실시간 활동에 함께 표시돼요.
										</Text>
										<Banner
											format="card"
											groupId={model.adConfig?.bannerGroups?.card}
										/>
									</View>
									<View
										style={[s.divider, { backgroundColor: theme.surface }]}
									/>
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
												<Text style={[s.sectionTitle, text]}>
													최근 당첨 번호
												</Text>
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
							) : (
								<View style={[s.section, s.firstSection]}>
									<Text style={[s.eyebrow, { color: theme.blue }]}>
										기기에 저장한 번호
									</Text>
									{headline(
										"보관함",
										`${model.saved.length.toLocaleString()} / ${SAVED_LIMIT.toLocaleString()}개 보관 · 추첨 후 결과를 확인하세요.`,
										<IconButton
											name="icon-setting-mono"
											label="설정"
											iconSize={24}
											color={theme.muted}
											variant="clear"
											onPress={openSettings}
											style={s.settings}
										/>,
									)}
									{model.attendance?.notificationTemplateCode ? (
										<View style={[s.row, { paddingVertical: 16 }]}>
											<View style={{ flex: 1, paddingRight: 12 }}>
												<Text style={[s.body, text]}>
													결과가 나오면 알려주기
												</Text>
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
									<Banner
										format="inline"
										groupId={
											model.adConfig?.bannerGroups?.inline ??
											model.adConfig?.bannerGroupId
										}
									/>
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
										model.saved
											.slice(currentSavedPage * 20, (currentSavedPage + 1) * 20)
											.map((item) => {
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
									{savedPages > 1 ? (
										<View style={[s.row, { paddingVertical: 20 }]}>
											<Button
												size="tiny"
												style="weak"
												disabled={currentSavedPage === 0}
												onPress={() => {
													setSavedPage(currentSavedPage - 1);
													scroll.current?.scrollTo({ y: 0, animated: false });
												}}
											>
												이전
											</Button>
											<Text style={[s.caption, muted]}>
												{currentSavedPage + 1} / {savedPages} 페이지
											</Text>
											<Button
												size="tiny"
												style="weak"
												disabled={currentSavedPage + 1 >= savedPages}
												onPress={() => {
													setSavedPage(currentSavedPage + 1);
													scroll.current?.scrollTo({ y: 0, animated: false });
												}}
											>
												다음
											</Button>
										</View>
									) : null}
									<Text style={[s.finePrint, muted]}>
										보관 번호는 실제 구매 내역이 아니에요. 기기 보관함은 토스
										앱을 삭제하면 함께 지워질 수 있어요.
									</Text>
								</View>
							)}
						</Animated.View>
					</IOScrollView>
				)}
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
			</HideAccessibilityView>
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

			<BottomSheet.Root
				open={sheetOpen}
				onClose={() => setPanel(null)}
				onExited={() =>
					setSheet((current) =>
						current.open ? current : { panel: null, open: false },
					)
				}
				header={
					<BottomSheet.Header>
						{panel ? PANEL_TITLES[panel] : ""}
					</BottomSheet.Header>
				}
				wrapperProps={{
					ref: sheetScroll,
					contentContainerStyle: s.sheetContent,
					keyboardShouldPersistTaps: "handled",
				}}
				cta={
					panel === "custom" && customOpen ? (
						<View>
							{draftError ? (
								<Text
									accessibilityRole="alert"
									style={[
										s.caption,
										{ color: "#F04452", paddingHorizontal: 24, paddingTop: 12 },
									]}
								>
									{draftError}
								</Text>
							) : null}
							<BottomSheet.CTA
								loading={model.busy === "generate"}
								disabled={
									!!model.busy || !model.user || !model.context || !!draftError
								}
								onPress={() => void generateDraft()}
							>
								이 조건으로 만들기
							</BottomSheet.CTA>
						</View>
					) : panel && PANEL_PARENTS[panel] ? (
						<BottomSheet.CTA
							type="dark"
							style="weak"
							onPress={() => setPanel(PANEL_PARENTS[panel] ?? null)}
						>
							{panel === "resultPreview"
								? "테스트 도구로 돌아가기"
								: "설정으로 돌아가기"}
						</BottomSheet.CTA>
					) : undefined
				}
			>
				{model.error ? (
					<Text
						accessibilityRole="alert"
						style={{ color: "#F04452", marginBottom: 14, lineHeight: 22 }}
					>
						{model.error}
					</Text>
				) : null}
				<View key={panel}>
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
									<Tab.Item value="fixed">고정 {draft.fixed.length}/6</Tab.Item>
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
												disabled={!!model.busy}
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
								<ScrollView horizontal showsHorizontalScrollIndicator={false}>
									<View style={{ flexDirection: "row", gap: 8 }}>
										{[null, 0, 1, 2, 3, 4, 5, 6].map((n) => (
											<Button
												key={String(n)}
												size="tiny"
												type={draft.oddCount === n ? "primary" : "dark"}
												style="weak"
												disabled={!!model.busy}
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
												<Text style={[s.body, text]}>{info.consecutive}쌍</Text>
											</View>
											<View style={s.row}>
												<Text style={[s.body, muted]}>
													다른 보관 조합과 최대 겹침
												</Text>
												<Text style={[s.body, text]}>{info.maxOverlap}개</Text>
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
												조합 통계 제공: 645.live
											</Text>
											<Text style={[s.caption, muted]}>
												내 조합을 이해하는 정보예요. 다음 당첨 결과를 예측하지
												않아요.
											</Text>
										</View>
									);
								})()
							: featurePass("report")
						: null}
					{panel === "attendance" ? (
						<AttendancePanel
							model={model}
							onGenerate={() => {
								setPanel(null);
								setTab("make");
								scroll.current?.scrollTo({ y: 0, animated: true });
							}}
						/>
					) : null}
					{panel === "settings" ? (
						<View style={{ gap: 20 }}>
							{LOCAL_PREVIEW ? (
								<Button
									display="full"
									type="dark"
									style="weak"
									onPress={() => setPanel("localTest")}
								>
									로컬 테스트 도구
								</Button>
							) : null}
							<Text style={[s.body, text]}>
								{model.user?.displayName ?? "연결을 확인하고 있어요"}
							</Text>
							{model.attendance?.promotionTestEnabled ? (
								<View style={{ gap: 12 }}>
									<Text style={[s.body, text]}>프로모션 연동 테스트</Text>
									<Text style={[s.caption, muted]}>
										등록된 테스트 계정에만 보여요. TEST 코드로 호출하며 실제
										포인트와 출석 기록은 변경하지 않아요.
									</Text>
									{(["daily", "weekly"] as const).map((kind) => (
										<Button
											key={kind}
											display="full"
											style="weak"
											type="dark"
											disabled={!!model.busy}
											onPress={() => void model.testPromotion(kind)}
										>
											{kind === "daily"
												? "매일 1P 테스트·상태 확인"
												: "7일 50P 테스트·상태 확인"}
										</Button>
									))}
								</View>
							) : null}
							<Text style={[s.description, muted]}>
								별도 회원가입 없이 토스에서 이용할 수 있어요.
							</Text>
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
								onPress={() => setPanel("privacy")}
							>
								개인정보 처리방침
							</Button>
							<Button
								display="full"
								type="dark"
								style="weak"
								onPress={() => setPanel("support")}
							>
								문의하기
							</Button>
							<Text style={[s.caption, muted]}>
								공개 생성 내역은 90일 동안 보관돼요. 기기에 보관한 번호는 직접
								삭제할 때까지 유지돼요.
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
					{panel === "privacy" ? <PrivacyNotice /> : null}
					{panel === "localTest" && LOCAL_PREVIEW ? (
						<LocalTestPanel
							model={model}
							onAttendance={() => setPanel("attendance")}
							onResults={() => setPanel("resultPreview")}
						/>
					) : null}
					{panel === "resultPreview" &&
					LOCAL_PREVIEW &&
					model.context?.latestDraw ? (
						<LocalResultPreview
							draw={model.context.latestDraw}
							ballSize={ballSize}
							reducedMotion={model.reducedMotion}
						/>
					) : null}
					{panel === "support" ? (
						<View style={{ gap: 16 }}>
							<Text style={[s.sectionTitle, text]}>도움이 필요하신가요?</Text>
							<Text style={[s.description, muted]}>
								오류가 발생한 화면과 상황을 알려주세요. 개인정보 열람·삭제
								요청도 아래 연락처로 접수할 수 있어요.
							</Text>
							<Text selectable style={[s.body, text]}>
								support@645.live
							</Text>
							<Text selectable style={[s.body, text]}>
								02-877-1990
							</Text>
							<Text style={[s.caption, muted]}>
								1990컴퍼니 · 개인정보 보호담당 김정래
							</Text>
						</View>
					) : null}
				</View>
			</BottomSheet.Root>
		</View>
	);
}

const s = StyleSheet.create({
	screen: { flex: 1 },
	content: { flex: 1, width: "100%", maxWidth: 640, alignSelf: "center" },
	settings: {
		width: 44,
		height: 44,
		padding: 10,
		alignItems: "center",
		justifyContent: "center",
	},
	headingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
	headingTitle: { flex: 1 },
	firstSection: { paddingTop: 16 },
	attendanceEntry: {
		marginTop: 20,
		paddingVertical: 16,
		borderTopWidth: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 16,
		minHeight: 64,
	},
	attendanceCopy: { flex: 1, gap: 4 },
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
	sheetContent: { paddingHorizontal: 24, paddingBottom: 24 },
	pickerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
	picker: {
		width: 38,
		height: 40,
		borderRadius: 12,
		borderWidth: 1,
		alignItems: "center",
		justifyContent: "center",
	},
});
