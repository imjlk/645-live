import {
	IOScrollView,
	useBackEvent,
	useParams,
	useVisibility,
} from "@granite-js/react-native";
import { TDSProvider } from "@toss/tds-react-native";
import {
	HideAccessibilityProvider,
	HideAccessibilityView,
} from "@toss/tds-react-native/private";
import { useEffect, useLayoutEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActivityPanel } from "./ActivityPanel";
import {
	FeatureAccessPrompt,
	type FeatureRequest,
} from "./FeatureAccessPrompt";
import { useLottoContext } from "./LottoProvider";
import { TabShellContext, useOverlayStack } from "./TabShell";
import { trackProduct } from "./telemetry";
import { useTheme } from "./theme";

export function GeneratedInsightsScreen() {
	const { model } = useLottoContext();
	const params = useParams({ from: "/insights" });
	const visible = useVisibility();
	const backEvent = useBackEvent();
	const theme = useTheme();
	const insets = useSafeAreaInsets();
	const { overlay, presentOverlay } = useOverlayStack();
	const [request, setRequest] = useState<FeatureRequest | null>(null);
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
										생성 통계
									</Text>
									<Text style={[s.description, { color: theme.muted }]}>
										모두가 만든 번호의 순위와 조합 패턴을 살펴보세요.
									</Text>
								</View>
								<ActivityPanel
									active={visible}
									initialRound={params.round}
									initialNumber={params.number}
									savedNumbers={model.saved}
									adConfig={model.adConfig}
									onExplore={explore}
								/>
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
