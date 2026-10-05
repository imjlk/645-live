import {
	IOScrollView,
	useBackEvent,
	useNavigation,
	useParams,
	useVisibility,
} from "@granite-js/react-native";
import { TDSProvider } from "@toss/tds-react-native";
import {
	HideAccessibilityProvider,
	HideAccessibilityView,
} from "@toss/tds-react-native/private";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
	FeatureAccessPrompt,
	type FeatureRequest,
} from "./FeatureAccessPrompt";
import { GenerationResultsContent } from "./GenerationResultsContent";
import { useLottoContext } from "./LottoProvider";
import { TabShellContext, useOverlayStack } from "./TabShell";
import { useTheme } from "./theme";

export function GenerationResultsScreen() {
	const { model } = useLottoContext();
	const params = useParams({ from: "/results" });
	const visible = useVisibility();
	const navigation = useNavigation();
	const theme = useTheme();
	const insets = useSafeAreaInsets();
	const opening = useRef(false);
	const visibleRef = useRef(visible);
	visibleRef.current = visible;
	const backEvent = useBackEvent();
	const { overlay, presentOverlay } = useOverlayStack();
	const [request, setRequest] = useState<FeatureRequest | null>(null);
	useLayoutEffect(() => {
		if (!visible || !overlay) return;
		const back = () => overlay.onBack();
		backEvent.addEventListener(back);
		return () => backEvent.removeEventListener(back);
	}, [visible, overlay, backEvent]);
	useEffect(() => {
		if (visible) opening.current = false;
	}, [visible]);
	const openNumber = (round: number, number: number) => {
		if (
			!visibleRef.current ||
			opening.current ||
			request ||
			overlay ||
			model.busy
		)
			return;
		const open = () => {
			if (!visibleRef.current || opening.current) return false;
			opening.current = true;
			navigation.push("/numbers", { round, number, source: "draw" });
			return true;
		};
		if (
			model.featureAdRequired &&
			model.user &&
			model.adConfig?.placements.some(
				(p) => p.placement === "report" && p.enabled,
			)
		)
			setRequest({ feature: "report", action: open });
		else if (open()) model.featureUsed();
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
								<Text
									accessibilityRole="header"
									style={[s.title, { color: theme.text }]}
								>
									이전 회차 결과
								</Text>
								<GenerationResultsContent
									active={visible && model.foreground}
									initialRound={params.round}
									onNumberPress={openNumber}
									onInsights={(round) => {
										if (
											!visible ||
											opening.current ||
											request ||
											overlay ||
											model.busy
										)
											return;
										opening.current = true;
										navigation.navigate("/insights", { round });
									}}
								/>
								{model.actionError?.area === "feature" ? (
									<Text accessibilityRole="alert" style={s.error}>
										{model.actionError.message}
									</Text>
								) : null}
							</IOScrollView>
						</HideAccessibilityView>
						<FeatureAccessPrompt
							request={visible ? request : null}
							entryPoint="results"
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
	error: { color: "#F04452", fontSize: 14, lineHeight: 22 },
	screen: { flex: 1 },
	content: {
		width: "100%",
		maxWidth: 640,
		alignSelf: "center",
		paddingHorizontal: 20,
		paddingTop: 16,
		gap: 16,
	},
	title: {
		fontSize: 29,
		lineHeight: 39,
		fontWeight: "700",
		letterSpacing: -0.7,
	},
});
