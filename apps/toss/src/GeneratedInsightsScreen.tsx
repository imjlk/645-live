import {
	IOScrollView,
	useBackEvent,
	useNavigation,
	useParams,
	useVisibility,
} from "@granite-js/react-native";
import { SegmentedControl, TDSProvider } from "@toss/tds-react-native";
import {
	HideAccessibilityProvider,
	HideAccessibilityView,
} from "@toss/tds-react-native/private";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActivityPanel } from "./ActivityPanel";
import { DrawNumberPanel } from "./DrawNumberPanel";
import {
	FeatureAccessPrompt,
	type FeatureRequest,
} from "./FeatureAccessPrompt";
import { useLottoContext } from "./LottoProvider";
import { TabShellContext, useOverlayStack } from "./TabShell";
import { trackProduct } from "./telemetry";
import { useTheme } from "./theme";

export function GeneratedInsightsScreen({
	numberRoute = false,
}: {
	numberRoute?: boolean;
}) {
	const { model } = useLottoContext();
	const params = useParams({ from: numberRoute ? "/numbers" : "/insights" });
	const [source, setSource] = useState<"draw" | "generated">(
		"source" in params && params.source === "generated" ? "generated" : "draw",
	);
	const visible = useVisibility();
	const navigation = useNavigation();
	const openingOverview = useRef(false);
	const visibleRef = useRef(visible);
	visibleRef.current = visible;
	const backEvent = useBackEvent();
	const theme = useTheme();
	const insets = useSafeAreaInsets();
	const { overlay, presentOverlay } = useOverlayStack();
	const [request, setRequest] = useState<FeatureRequest | null>(null);
	useEffect(() => {
		if (visible) openingOverview.current = false;
	}, [visible]);
	useEffect(() => {
		if (visible)
			trackProduct(
				"insights_viewed",
				params.number ? "number_preview" : "overview",
			);
	}, [visible, params.number]);
	useLayoutEffect(() => {
		if (!visible || !overlay) return;
		const back = () => overlay.onBack();
		backEvent.addEventListener(back);
		return () => backEvent.removeEventListener(back);
	}, [visible, overlay, backEvent]);
	const explore = (action: () => void) => {
		if (!visible || request || model.busy) return;
		const adsEnabled = model.adConfig?.placements.some(
			(p) => p.placement === "report" && p.enabled,
		);
		if (model.featureAdRequired && adsEnabled && model.user) {
			setRequest({ feature: "report", action });
			return;
		}
		model.featureUsed();
		action();
	};
	const openNumber = (
		round: number,
		number: number,
		source: "draw" | "generated",
	) => {
		if (
			!visibleRef.current ||
			request ||
			overlay ||
			openingOverview.current ||
			model.busy
		)
			return;
		explore(() => {
			if (!visibleRef.current || openingOverview.current) return;
			openingOverview.current = true;
			navigation.push("/numbers", { round, number, source });
		});
	};
	return (
		<TDSProvider colorPreference="light" fontScaleAvailable>
			<HideAccessibilityProvider>
				<TabShellContext.Provider value={{ tabBarHeight: 0, presentOverlay }}>
					<View style={[s.screen, { backgroundColor: theme.background }]}>
						<HideAccessibilityView>
							<IOScrollView
								contentContainerStyle={[
									s.content,
									{ paddingBottom: insets.bottom + 28 },
								]}
							>
								<View style={s.heading}>
									<Text
										accessibilityRole="header"
										style={[s.title, { color: theme.text }]}
									>
										{numberRoute
											? `${params.number}번 번호 통계`
											: params.number
												? "번호별 생성 통계"
												: "생성 통계"}
									</Text>
									<Text style={[s.description, { color: theme.muted }]}>
										{numberRoute
											? "실제 추첨 이력과 이용자 생성 기록을 구분해 살펴보세요."
											: params.number
												? "선택한 번호가 얼마나 생성됐는지 살펴보세요."
												: "모두가 만든 번호의 순위와 조합 패턴을 살펴보세요."}
									</Text>
								</View>
								{numberRoute ? (
									<SegmentedControl.Root
										name="number-statistics-source"
										size="small"
										value={source}
										onChange={(value) => {
											if (value === "draw" || value === "generated")
												setSource(value);
										}}
									>
										<SegmentedControl.Item value="draw">
											추첨 통계
										</SegmentedControl.Item>
										<SegmentedControl.Item value="generated">
											생성 통계
										</SegmentedControl.Item>
									</SegmentedControl.Root>
								) : null}
								{numberRoute && source === "draw" && params.number ? (
									<DrawNumberPanel
										number={params.number}
										active={visible && model.foreground}
										adConfig={model.adConfig}
									/>
								) : (
									<ActivityPanel
										active={visible}
										initialRound={params.round}
										initialNumber={params.number}
										savedNumbers={model.saved}
										adConfig={model.adConfig}
										onExplore={explore}
										onNumberPress={
											params.number && !numberRoute
												? undefined
												: (round, number, source = "generated") =>
														openNumber(round, number, source)
										}
										onOverview={(round) => {
											if (
												!visible ||
												request ||
												overlay ||
												openingOverview.current
											)
												return;
											openingOverview.current = true;
											// A new route instance keeps the focused number when returning.
											navigation.push("/insights", { round });
										}}
									/>
								)}
								{model.actionError?.area === "feature" ? (
									<Text
										accessibilityRole="alert"
										style={[s.description, { color: "#F04452" }]}
									>
										{model.actionError.message}
									</Text>
								) : null}
							</IOScrollView>
						</HideAccessibilityView>
						<FeatureAccessPrompt
							request={visible ? request : null}
							entryPoint="insights"
							continueFeature={async (feature, flow) => {
								const ok = await model.continueFeature(feature, flow);
								if (ok) model.featureUsed();
								return ok;
							}}
							onDone={() => setRequest(null)}
						/>
					</View>
				</TabShellContext.Provider>
			</HideAccessibilityProvider>
		</TDSProvider>
	);
}

const s = StyleSheet.create({
	screen: { flex: 1 },
	content: {
		width: "100%",
		maxWidth: 640,
		alignSelf: "center",
		paddingHorizontal: 20,
		paddingTop: 16,
		gap: 20,
	},
	heading: { gap: 10 },
	title: {
		fontSize: 29,
		lineHeight: 39,
		fontWeight: "700",
		letterSpacing: -0.7,
	},
	description: { fontSize: 15, lineHeight: 23 },
});
