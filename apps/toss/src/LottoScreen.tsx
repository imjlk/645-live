import {
	BALL_COLORS,
	compareDraw,
	describeCombination,
	EMPTY_OPTIONS,
	type Generation,
	type GenerationOptions,
	resultFingerprint,
	type SavedCombination,
} from "@645/lotto-core";
import { getTossShareLink, share } from "@apps-in-toss/framework";
import {
	useIsFocused,
	useNavigation,
} from "@granite-js/native/@react-navigation/native";
import {
	ImpressionArea,
	IOScrollView,
	useVisibility,
} from "@granite-js/react-native";
import {
	BottomSheet,
	Button,
	IconButton,
	SegmentedControl,
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
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	ActivityIndicator,
	Alert,
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AdCtaImpression } from "./AdCtaImpression";
import { AttendancePanel } from "./AttendancePanel";
import { adPolicyLabel } from "./ad-telemetry";
import { LOCAL_PREVIEW } from "./api";
import { Balls } from "./Balls";
import { Banner } from "./Banner";
import { Celebration } from "./Celebration";
import {
	FeatureAccessPrompt,
	type FeatureRequest,
} from "./FeatureAccessPrompt";
import { GenerationInsightPreview } from "./GenerationInsightPreview";
import { GenerationResultsContent } from "./GenerationResultsContent";
import { GeneratorAttendanceEntry } from "./GeneratorAttendanceEntry";
import { generationOptionsError } from "./generation-options";
import type { InsightsParams } from "./insights-route";
import { LiveFeed, relativeTime } from "./LiveFeed";
import { LocalResultPreview } from "./LocalResultPreview";
import { LocalTestPanel } from "./LocalTestPanel";
import { useLottoContext } from "./LottoProvider";
import {
	type LottoTab,
	type LottoTabNavigation,
	navigateToInsights,
	navigateToSavedRound,
	navigateToTab,
} from "./navigation";
import { PrivacyNotice } from "./PrivacyNotice";
import { ReportHistory } from "./ReportHistory";
import { unreadSavedRounds } from "./result-return";
import { requestAppReview } from "./review-bridge";
import { REVIEW_SAVED_MILESTONE, type ReviewSource } from "./review-request";
import { SavedCombinationComparison } from "./SavedCombinationComparison";
import { ShoppingRecommendation } from "./ShoppingRecommendation";
import { SAVED_LIMIT } from "./saved-store";
import { useTabShell } from "./TabShell";
import { trackProduct } from "./telemetry";
import { useTheme } from "./theme";
import {
	RECENT_LIMIT,
	type SavedFilter,
	savedRounds,
	savedSummary,
} from "./ux-state";

type Panel =
	| "custom"
	| "report"
	| "attendance"
	| "settings"
	| "privacy"
	| "support"
	| "localTest"
	| "resultPreview"
	| "recent"
	| "generationResults"
	| null;
const PANEL_TITLES = {
	recent: "최근 만든 번호",
	custom: "내 취향대로 만들기",
	report: "내 조합 살펴보기",
	attendance: "매일 한 번, 출석",
	settings: "설정",
	privacy: "개인정보 처리방침",
	support: "문의하기",
	localTest: "로컬 테스트 도구",
	resultPreview: "당첨 결과 미리보기",
	generationResults: "이전 회차 결과",
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

export function LottoScreen({ tab = "make" }: { tab?: LottoTab }) {
	return (
		<HideAccessibilityProvider>
			<LottoContent tab={tab} />
		</HideAccessibilityProvider>
	);
}

function LottoContent({ tab }: { tab: LottoTab }) {
	const { model, options, setOptions, liveColumns, setLiveColumns } =
		useLottoContext();
	const navigation = useNavigation<LottoTabNavigation>();
	const focused = useIsFocused();
	const visible = useVisibility() && focused;
	const navigateTab = (value: string) => {
		navigateToTab(navigation, tab, value, visible);
	};
	const generationLabel = model.current ? "새 번호 만들기" : "번호 만들기";
	const viewingPreviousRound =
		!!model.current &&
		!!model.context &&
		model.current.round !== model.context.targetRound;
	const theme = useTheme();
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();
	const { tabBarHeight, presentOverlay, savedTarget } = useTabShell();
	const [savedPage, setSavedPage] = useState(0);
	const [savedFilter, setSavedFilter] = useState<SavedFilter>("all");
	const [selectedRound, setSelectedRound] = useState<number | null>(null);
	const [linkedRound, setLinkedRound] = useState<number | null>(null);
	const unreadRounds = useMemo(
		() => unreadSavedRounds(model.saved, model.results),
		[model.saved, model.results],
	);
	const returnRound = unreadRounds[0];
	const returnCount = model.saved.filter(
		(item) => item.round === returnRound,
	).length;
	useLayoutEffect(() => {
		if (!visible || tab !== "saved" || !savedTarget?.round) return;
		setSelectedRound(savedTarget.round);
		setLinkedRound(savedTarget.round);
		setSavedFilter("all");
		setSavedPage(0);
		if (savedTarget.entry === "notification")
			trackProduct("notification_result_opened", "saved_deep_link");
		// Consume the navigation target, preserving subsequent manual selection and Back history.
		navigation.setParams({ round: undefined, entry: undefined });
	}, [visible, tab, savedTarget?.round, savedTarget?.entry, navigation]);
	const [savingGenerationId, setSavingGenerationId] = useState<number | null>(
		null,
	);
	const rounds = savedRounds(
		model.saved,
		model.results,
		savedFilter,
		model.context?.latestDraw?.round ?? null,
	);
	let savedRound: number | undefined = rounds[0];
	if (selectedRound !== null && rounds.includes(selectedRound))
		savedRound = selectedRound;
	if (linkedRound !== null && !rounds.includes(linkedRound))
		savedRound = undefined;
	const roundItems = model.saved.filter((item) => item.round === savedRound);
	const roundDraw = savedRound ? model.results[savedRound] : undefined;
	const summary = roundDraw ? savedSummary(roundItems, roundDraw) : null;
	const savedPages = Math.max(1, Math.ceil(roundItems.length / 20));
	const viewedResults = useRef(new Set<string>());
	const currentSavedPage = Math.min(savedPage, savedPages - 1);
	const [{ panel, open: sheetOpen }, setSheet] = useState<{
		panel: Panel;
		open: boolean;
	}>({ panel: null, open: false });
	const [resultsInitialRound, setResultsInitialRound] = useState<
		number | undefined
	>();
	const [resultsEntry, setResultsEntry] = useState(0);
	const pendingInsights = useRef<InsightsParams | null>(null);
	const insightsOpening = useRef(false);
	const resultsReturnRound = useRef<number | undefined>(undefined);
	const wasAway = useRef(false);
	const mounted = useRef(false);
	const visibleRef = useRef(visible);
	visibleRef.current = visible;
	const setPanel = useCallback((next: Panel) => {
		pendingInsights.current = null;
		insightsOpening.current = false;
		resultsReturnRound.current = undefined;
		wasAway.current = false;
		setResultsInitialRound(undefined);
		setSheet((current) =>
			next ? { panel: next, open: true } : { ...current, open: false },
		);
	}, []);
	const parentPanel = panel ? (PANEL_PARENTS[panel] ?? null) : null;
	useEffect(() => {
		if (!visible) {
			if (resultsReturnRound.current !== undefined) wasAway.current = true;
			pendingInsights.current = null;
			insightsOpening.current = false;
			return;
		}
		if (!wasAway.current || resultsReturnRound.current === undefined) return;
		const round = resultsReturnRound.current;
		resultsReturnRound.current = undefined;
		wasAway.current = false;
		setResultsInitialRound(round);
		setResultsEntry((value) => value + 1);
		setSheet({ panel: "generationResults", open: true });
	}, [visible]);
	useLayoutEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
			pendingInsights.current = null;
			resultsReturnRound.current = undefined;
			visibleRef.current = false;
		};
	}, []);
	const sheetScroll = useRef<ScrollView>(null);
	useLayoutEffect(() => {
		if (!visible || !panel) return;
		return presentOverlay(() => {
			// Back during the sheet exit cancels a queued native navigation too.
			if (sheetOpen || pendingInsights.current) setPanel(parentPanel);
		});
	}, [panel, parentPanel, presentOverlay, setPanel, sheetOpen, visible]);
	useEffect(() => {
		if (panel && sheetOpen)
			sheetScroll.current?.scrollTo({ y: 0, animated: false });
	}, [panel, sheetOpen]);
	const [draft, setDraft] = useState<GenerationOptions>(EMPTY_OPTIONS);
	const [pickMode, setPickMode] = useState<"fixed" | "excluded">("fixed");
	const draftError = generationOptionsError(draft);
	const [report, setReport] = useState<SavedCombination | null>(null);
	const ballSize = Math.min(
		52,
		Math.floor((Math.min(width, 640) - 40 - 30) / 6),
	);
	const [featureRequest, setFeatureRequest] = useState<FeatureRequest | null>(
		null,
	);
	const [reviewOpportunity, setReviewOpportunity] =
		useState<ReviewSource | null>(null);
	const reviewGuard = useRef<() => boolean>(() => false);
	reviewGuard.current = () =>
		mounted.current &&
		visibleRef.current &&
		model.foreground &&
		!model.busy &&
		!sheetOpen &&
		!featureRequest &&
		!model.notificationPrompt;
	useEffect(() => {
		if (!reviewOpportunity) return;
		if (
			!visible ||
			!model.foreground ||
			featureRequest ||
			model.notificationPrompt
		) {
			setReviewOpportunity(null);
			return;
		}
		if (sheetOpen || model.busy) return;
		if (
			reviewOpportunity === "save" &&
			model.saved.length < REVIEW_SAVED_MILESTONE
		) {
			setReviewOpportunity(null);
			return;
		}
		// Let the successful save/result feedback settle before native review UI.
		const timer = setTimeout(() => {
			if (!reviewGuard.current()) return;
			setReviewOpportunity(null);
			void requestAppReview({
				source: reviewOpportunity,
				eligible: true,
				canShow: () => reviewGuard.current(),
			});
		}, 1500);
		return () => clearTimeout(timer);
	}, [
		reviewOpportunity,
		visible,
		model.foreground,
		model.busy,
		model.saved.length,
		model.notificationPrompt,
		sheetOpen,
		featureRequest,
	]);
	const accessFeature = (feature: "custom" | "report", action: () => void) => {
		if (featureRequest || model.busy) return;
		const adsEnabled = model.adConfig?.placements.some(
			(p) => p.placement === feature && p.enabled,
		);
		if (model.featureAdRequired && adsEnabled && model.user) {
			setFeatureRequest({ feature, action });
			return;
		}
		model.featureUsed();
		action();
	};
	const openInsights = (round?: number, number?: number) => {
		if (!visible || insightsOpening.current) return;
		if (sheetOpen) {
			const returnRound = panel === "generationResults" ? round : undefined;
			setPanel(null);
			pendingInsights.current = { round, number };
			resultsReturnRound.current = returnRound;
			insightsOpening.current = true;
			return;
		}
		insightsOpening.current = navigateToInsights(navigation, tab, visible, {
			round,
			number,
		});
	};
	const onSheetExited = () => {
		if (!mounted.current) return;
		setSheet((current) =>
			current.open ? current : { panel: null, open: false },
		);
		const params = pendingInsights.current;
		if (!params) return;
		pendingInsights.current = null;
		if (!navigateToInsights(navigation, tab, visibleRef.current, params)) {
			insightsOpening.current = false;
			resultsReturnRound.current = undefined;
		}
	};
	const hasOptions =
		options.fixed.length > 0 ||
		options.excluded.length > 0 ||
		options.oddCount !== null;
	const oldestRecent = model.recent[model.recent.length - 1];
	const recentLimitAtRisk =
		model.recent.length >= RECENT_LIMIT &&
		!!oldestRecent &&
		!model.saved.some((item) => item.generationId === oldestRecent.id);
	const saveGeneration = async (item: Generation) => {
		setSavingGenerationId(item.id);
		try {
			const saved = await model.save(item);
			if (saved && mounted.current) setReviewOpportunity("save");
		} finally {
			setSavingGenerationId(null);
		}
	};
	const saveButton = (item: Generation) => {
		const saved = model.saved.some((entry) => entry.generationId === item.id);
		return (
			<Button
				display="full"
				style="weak"
				accessibilityLabel={`${item.round}회 번호 ${item.numbers.join(", ")} ${saved ? "보관됨" : "보관하기"}`}
				loading={model.busy === "save" && savingGenerationId === item.id}
				disabled={!!model.busy || saved || !model.savedReady}
				onPress={() => void saveGeneration(item)}
			>
				{saved ? "보관함에 저장했어요" : "이 번호 보관하기"}
			</Button>
		);
	};
	const scroll = useRef<ScrollView>(null);
	useEffect(() => {
		if (!model.notice || !visible) return;
		const timer = setTimeout(model.clearNotice, 5500);
		return () => clearTimeout(timer);
	}, [model.notice, model.clearNotice, visible]);

	useEffect(() => {
		if (
			visible &&
			sheetOpen &&
			panel === "report" &&
			report &&
			!model.busy &&
			!model.reports[report.id]
		)
			void model.loadReport(report);
	}, [
		visible,
		sheetOpen,
		panel,
		report,
		model.busy,
		model.reports,
		model.loadReport,
	]);

	const text = { color: theme.text };
	const muted = { color: theme.muted };
	const actionMessage = (area: string) =>
		model.actionError?.area === area ||
		model.actionError?.area === "feature" ? (
			<View accessibilityRole="alert" style={{ paddingVertical: 12, gap: 8 }}>
				<Text style={[s.caption, { color: "#F04452" }]}>
					{model.actionError.message}
				</Text>
				<Button size="tiny" style="weak" onPress={model.clearActionError}>
					확인
				</Button>
			</View>
		) : null;
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

	return (
		<View
			style={[
				s.screen,
				{ backgroundColor: theme.background, paddingBottom: insets.bottom },
			]}
		>
			<HideAccessibilityView
				style={[s.content, { paddingBottom: tabBarHeight }]}
			>
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
						myGeneration={model.recent[0] ?? null}
						columns={liveColumns}
						onColumnsChange={setLiveColumns}
						refreshing={model.refreshing}
						onRefresh={model.retry}
						onInsights={() => openInsights()}
						onResults={() => {
							setResultsEntry((value) => value + 1);
							setPanel("generationResults");
						}}
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
						<View>
							{tab === "make" ? (
								<>
									<View style={[s.section, s.firstSection]}>
										{actionMessage("make")}
										{actionMessage("saved")}
										<View style={s.row}>
											<Text style={[s.eyebrow, { color: theme.blue }]}>
												{model.context
													? viewingPreviousRound
														? `${model.current?.round}회 생성한 번호`
														: `${model.context.targetRound}회 번호 만들기`
													: "이번 주 번호 만들기"}
											</Text>
											<Text style={[s.caption, muted]}>
												{model.context
													? viewingPreviousRound
														? "이전 회차 기록"
														: `${dateLabel(model.context.drawsAt)} 추첨`
													: "회차 확인 중"}
											</Text>
										</View>
										{headline(
											viewingPreviousRound
												? "다시 보는 내 번호"
												: "이번 주, 내 번호는?",
											"번호를 만들고 마음에 드는 조합을 보관하세요.",
										)}
										<View style={{ paddingTop: 20, paddingBottom: 20 }}>
											<Balls
												numbers={model.current?.numbers ?? [0, 0, 0, 0, 0, 0]}
												size={ballSize}
												animate
												reducedMotion={model.reducedMotion}
											/>
										</View>
										{recentLimitAtRisk ? (
											<Pressable
												accessibilityRole="button"
												onPress={() => setPanel("recent")}
												style={{ paddingVertical: 10 }}
											>
												<Text style={[s.caption, { color: theme.blue }]}>
													최근 번호가 {RECENT_LIMIT}개예요. 새 번호를 만들면
													가장 오래된 미보관 번호가 사라져요. 먼저 보관하기 ›
												</Text>
											</Pressable>
										) : null}
										<AdCtaImpression
											enabled={model.generationAdRequired}
											policy={adPolicyLabel(model.adConfig?.generationAdPolicy)}
										>
											{(runAttempt) => (
												<Button
													display="full"
													loading={model.busy === "generate"}
													disabled={
														!!model.busy ||
														model.generationCooling ||
														!model.user ||
														!model.generationReady
													}
													onPress={() => {
														void runAttempt((adFlow) =>
															model.generate(
																hasOptions ? options : EMPTY_OPTIONS,
																model.generationAdRequired,
																adFlow,
																() => visibleRef.current,
															),
														);
													}}
												>
													{model.generationAdRequired
														? "광고 보고 계속 만들기"
														: generationLabel}
												</Button>
											)}
										</AdCtaImpression>
										{model.current ? (
											<View style={{ marginTop: 10 }}>
												{saveButton(model.current)}
											</View>
										) : null}
										{model.generationAdRequired ? (
											<Text style={[s.caption, muted, { marginTop: 8 }]}>
												광고 한 번을 완료하면 다시 여러 번 번호를 만들 수
												있어요.
											</Text>
										) : null}
										<View style={s.secondaryActions}>
											<Pressable
												accessibilityRole="button"
												onPress={() => {
													model.clearError();
													setDraft(options);
													accessFeature("custom", () => setPanel("custom"));
												}}
												style={s.secondaryLink}
											>
												<Text style={[s.body, { color: theme.blue }]}>
													{hasOptions
														? "다음 번호 맞춤 조건"
														: "내 취향대로 만들기"}{" "}
													›
												</Text>
											</Pressable>
											{model.recent.length > 0 ? (
												<Pressable
													accessibilityRole="button"
													accessibilityLabel={`최근 만든 번호 ${model.recent.length}개 보기`}
													onPress={() => setPanel("recent")}
													style={s.secondaryLink}
												>
													<Text style={[s.caption, muted]}>
														최근 번호 {model.recent.length}개 ›
													</Text>
												</Pressable>
											) : null}
											{hasOptions ? (
												<Pressable
													accessibilityRole="button"
													onPress={() => setOptions(EMPTY_OPTIONS)}
													style={s.secondaryLink}
												>
													<Text style={[s.caption, muted]}>초기화</Text>
												</Pressable>
											) : null}
										</View>
										{hasOptions ? (
											<Text style={[s.caption, muted, { marginBottom: 12 }]}>
												다음 생성 ·{" "}
												{[
													options.fixed.length
														? `고정 ${options.fixed.join("·")}`
														: "",
													options.excluded.length
														? `제외 ${options.excluded.length}개`
														: "",
													options.oddCount !== null
														? `홀수 ${options.oddCount}개`
														: "",
												]
													.filter(Boolean)
													.join(" / ")}
											</Text>
										) : null}
										<GenerationInsightPreview
											key={model.current?.id ?? "overview"}
											generation={model.current}
											feed={model.feed}
											round={model.context?.targetRound}
											published={
												!!model.current &&
												model.current.id === model.publishedGenerationId
											}
											onInsights={(round) => openInsights(round)}
										/>
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
										{returnRound ? (
											<View style={{ gap: 8, marginTop: 16 }}>
												<Text style={[s.caption, muted]}>
													{returnRound}회 · 새 결과
												</Text>
												<Text style={[s.body, text]}>
													보관한 {returnCount}개 조합의 결과가 나왔어요.
												</Text>
												<Button
													size="medium"
													style="weak"
													onPress={() => {
														if (
															navigateToSavedRound(
																navigation,
																tab,
																returnRound,
																visible,
															)
														)
															trackProduct(
																"results_return_opened",
																"generator",
															);
													}}
												>
													보관한 번호 결과 보기
												</Button>
											</View>
										) : null}
										<Banner
											placement="generator"
											groupId={
												model.adConfig?.bannerGroups?.inline ??
												model.adConfig?.bannerGroupId
											}
										/>
										<GeneratorAttendanceEntry
											attendance={model.attendance}
											onPress={() => setPanel("attendance")}
										/>
										{model.current ? (
											<ShoppingRecommendation
												placement="generator"
												active={visible && !sheetOpen}
											/>
										) : null}
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
										<Button
											display="full"
											size="medium"
											type="dark"
											style="weak"
											onPress={() => navigateTab("live")}
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
												disabled={!!model.busy}
												checked={model.attendance.notificationsEnabled}
												onCheckedChange={(checked) =>
													void model.notifications(checked)
												}
											/>
										</View>
									) : null}
									<Banner
										placement="saved"
										groupId={model.adConfig?.bannerGroups?.card}
									/>
									{actionMessage("saved")}
									{model.savedReady && model.saved.length > 0 ? (
										<View style={{ gap: 12, marginVertical: 20 }}>
											<SegmentedControl.Root
												name="saved-filter"
												size="small"
												value={savedFilter}
												onChange={(value) => {
													if (
														value !== "all" &&
														value !== "waiting" &&
														value !== "ready"
													)
														return;
													setSavedFilter(value);
													setSelectedRound(null);
													setLinkedRound(null);
													setSavedPage(0);
												}}
											>
												<SegmentedControl.Item value="all">
													전체
												</SegmentedControl.Item>
												<SegmentedControl.Item value="waiting">
													결과 대기
												</SegmentedControl.Item>
												<SegmentedControl.Item value="ready">
													추첨 완료
												</SegmentedControl.Item>
											</SegmentedControl.Root>
											<ScrollView
												horizontal
												showsHorizontalScrollIndicator={false}
												contentContainerStyle={{ gap: 8 }}
											>
												{rounds.map((round) => (
													<Button
														key={round}
														size="tiny"
														style={round === savedRound ? "fill" : "weak"}
														onPress={() => {
															setSelectedRound(round);
															setLinkedRound(null);
															setSavedPage(0);
														}}
													>
														{round}회
														{unreadRounds.includes(round) ? " · 새 결과" : ""}
													</Button>
												))}
											</ScrollView>
											{summary && roundDraw ? (
												<ImpressionArea
													key={`${resultFingerprint(roundDraw)}:${roundItems.map((item) => item.id).join(",")}`}
													enabled={
														visible &&
														model.foreground &&
														model.savedReady &&
														!sheetOpen &&
														!savedTarget?.round
													}
													areaThreshold={0.5}
													timeThreshold={1000}
													onImpressionStart={() => {
														if (
															!visibleRef.current ||
															!model.foreground ||
															!model.savedReady ||
															sheetOpen ||
															savedTarget?.round ||
															!roundDraw
														)
															return;
														const fingerprint = resultFingerprint(roundDraw);
														if (!viewedResults.current.has(fingerprint)) {
															viewedResults.current.add(fingerprint);
															trackProduct("saved_results_viewed");
															setReviewOpportunity("results");
														}
														void model.markResultsViewed?.(roundDraw.round);
													}}
												>
													<View style={{ gap: 6 }}>
														<Text style={[s.body, text]}>
															{savedRound}회 · 보관한 {summary.total}개 결과
														</Text>
														<Text style={[s.caption, muted]}>
															{summary.rankCounts
																.slice(1)
																.map((count, i) =>
																	count
																		? `${i + 1}등 번호 일치 ${count}개`
																		: "",
																)
																.filter(Boolean)
																.join(" · ") ||
																"3개 이상 일치하는 조합이 없어요."}
														</Text>
													</View>
												</ImpressionArea>
											) : savedRound ? (
												<Text style={[s.caption, muted]}>
													{savedRound}회 · {roundItems.length}개 보관 ·{" "}
													{!model.context
														? "회차 정보를 확인하고 있어요."
														: savedRound <=
																(model.context.latestDraw?.round ?? 0)
															? model.resultsLoading
																? "결과를 불러오고 있어요."
																: model.actionError?.source === "saved-results"
																	? "결과를 불러오지 못했어요. 아래로 당겨 다시 확인해 주세요."
																	: "아직 결과를 확인할 수 없어요. 아래로 당겨 다시 확인해 주세요."
															: "추첨 결과를 기다리고 있어요."}
												</Text>
											) : (
												<Text style={[s.body, muted]}>
													{model.context
														? linkedRound !== null
															? `${linkedRound}회 번호가 이 기기에 보관되어 있지 않아요.`
															: "이 조건에 해당하는 보관 번호가 없어요."
														: "회차 정보를 확인하고 있어요."}
												</Text>
											)}
										</View>
									) : null}
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
												{linkedRound !== null
													? `${linkedRound}회 번호가 이 기기에 없어요`
													: "아직 보관한 번호가 없어요"}
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
											<Button
												display="full"
												onPress={() => navigateTab("make")}
											>
												첫 번호 만들러 가기
											</Button>
										</View>
									) : (
										roundItems
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
																	: !model.context
																		? "회차 정보 확인 중"
																		: item.round <=
																				(model.context.latestDraw?.round ?? 0)
																			? model.resultsLoading
																				? "결과 불러오는 중"
																				: "결과 확인 필요"
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
																	accessFeature("report", () =>
																		setPanel("report"),
																	);
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
						</View>
					</IOScrollView>
				)}
				{model.notice ? (
					<View
						accessibilityLiveRegion="polite"
						style={[
							s.toast,
							{
								backgroundColor: theme.dark ? "#E5E8EB" : "#333D4B",
								bottom: tabBarHeight + 12,
							},
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
			</HideAccessibilityView>
			{visible && model.celebration && !model.reducedMotion ? (
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

			<FeatureAccessPrompt
				request={visible ? featureRequest : null}
				entryPoint={tab === "make" ? "generator" : tab}
				continueFeature={async (feature, flow) => {
					const ok = await model.continueFeature(feature, flow);
					if (ok) model.featureUsed();
					return ok;
				}}
				onDone={() => setFeatureRequest(null)}
			/>
			<BottomSheet.Root
				open={sheetOpen && visible}
				onClose={() => setPanel(null)}
				onExited={onSheetExited}
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
				wrapper={panel === "generationResults" ? IOScrollView : undefined}
				cta={
					panel === "custom" ? (
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
									!!model.busy ||
									model.generationCooling ||
									!model.user ||
									!model.generationReady ||
									!!draftError
								}
								onPress={() => void generateDraft()}
							>
								이 조건으로 만들기
							</BottomSheet.CTA>
						</View>
					) : parentPanel ? (
						<BottomSheet.CTA
							type="dark"
							style="weak"
							onPress={() => setPanel(parentPanel)}
						>
							{panel === "resultPreview"
								? "테스트 도구로 돌아가기"
								: "설정으로 돌아가기"}
						</BottomSheet.CTA>
					) : undefined
				}
			>
				{model.actionError &&
				(model.actionError.area === panel ||
					model.actionError.area === "feature" ||
					(panel === "custom" && model.actionError.area === "make") ||
					(panel === "recent" && model.actionError.area === "saved")) ? (
					<Text
						accessibilityRole="alert"
						style={{ color: "#F04452", marginBottom: 14, lineHeight: 22 }}
					>
						{model.actionError.message}
					</Text>
				) : null}
				<View key={panel}>
					{panel === "recent" ? (
						<View style={{ gap: 16 }}>
							<Text style={[s.caption, muted]}>
								앱을 이용하는 동안 최근 {RECENT_LIMIT}개를 임시로 기억해요.
								남겨두고 싶은 번호는 아래에서 보관해 주세요.
							</Text>
							{model.recent.map((item) => (
								<View
									key={item.id}
									style={{
										gap: 14,
										paddingVertical: 16,
										borderBottomWidth: 1,
										borderBottomColor: theme.line,
									}}
								>
									<Text style={[s.caption, muted]}>
										{item.round}회 · {relativeTime(item.createdAt, Date.now())}
									</Text>
									<Balls
										numbers={item.numbers}
										size={Math.min(40, ballSize)}
										reducedMotion
									/>
									{saveButton(item)}
									{model.savedReady ? (
										<SavedCombinationComparison
											generation={item}
											saved={model.saved}
											compact
											onExplore={(action) => accessFeature("report", action)}
										/>
									) : null}
								</View>
							))}
						</View>
					) : panel === "generationResults" ? (
						<GenerationResultsContent
							key={resultsEntry}
							active={sheetOpen && visible}
							initialRound={resultsInitialRound}
							onInsights={(round) => openInsights(round)}
						/>
					) : panel === "custom" ? (
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
														other = pickMode === "fixed" ? "excluded" : "fixed";
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
					) : null}
					{panel === "report"
						? report
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
							: null
						: null}
					{panel === "attendance" ? (
						<AttendancePanel
							model={model}
							onGenerate={() => {
								setPanel(null);
								navigateTab("make");
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
													void model.withdraw().then((ok) => {
														if (ok) setPanel(null);
													});
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
	secondaryActions: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		flexWrap: "wrap",
		columnGap: 12,
		marginTop: 8,
	},
	secondaryLink: {
		minHeight: 44,
		justifyContent: "center",
		paddingVertical: 10,
	},
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
	empty: { paddingVertical: 40, gap: 8 },
	savedRow: { borderTopWidth: 1, paddingVertical: 22 },
	message: { paddingHorizontal: 20, paddingVertical: 12, gap: 10 },
	toast: {
		position: "absolute",
		left: 20,
		right: 20,
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
