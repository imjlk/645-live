import {
	IOScrollView,
	useNavigation,
	useParams,
	useVisibility,
} from "@granite-js/react-native";
import { TDSProvider } from "@toss/tds-react-native";
import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GenerationResultsContent } from "./GenerationResultsContent";
import { useLottoContext } from "./LottoProvider";
import { useTheme } from "./theme";

export function GenerationResultsScreen() {
	const { model } = useLottoContext();
	const params = useParams({ from: "/results" });
	const visible = useVisibility();
	const navigation = useNavigation();
	const theme = useTheme();
	const insets = useSafeAreaInsets();
	const opening = useRef(false);
	useEffect(() => {
		if (visible) opening.current = false;
	}, [visible]);
	return (
		<TDSProvider colorPreference="light" fontScaleAvailable>
			<View style={[s.screen, { backgroundColor: theme.background }]}>
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
						onInsights={(round) => {
							if (!visible || opening.current) return;
							opening.current = true;
							navigation.navigate("/insights", { round });
						}}
					/>
				</IOScrollView>
			</View>
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
		gap: 16,
	},
	title: {
		fontSize: 29,
		lineHeight: 39,
		fontWeight: "700",
		letterSpacing: -0.7,
	},
});
