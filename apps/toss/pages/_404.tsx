import { useNavigation } from "@granite-js/react-native";
import { Button } from "@toss/tds-react-native";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../src/theme";

export default function NotFoundPage() {
	const navigation = useNavigation();
	const theme = useTheme();
	return (
		<SafeAreaView
			style={[styles.screen, { backgroundColor: theme.background }]}
		>
			<View style={styles.content}>
				<Text
					accessibilityRole="header"
					style={[styles.title, { color: theme.text }]}
				>
					화면을 찾을 수 없어요
				</Text>
				<Text style={[styles.description, { color: theme.muted }]}>
					번호 생성기로 돌아가 다시 시작해 주세요.
				</Text>
				<Button size="big" onPress={() => navigation.replace("/")}>
					번호 생성기로 돌아가기
				</Button>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1, justifyContent: "center" },
	content: {
		width: "100%",
		maxWidth: 480,
		alignSelf: "center",
		padding: 24,
		gap: 20,
	},
	title: { fontSize: 24, fontWeight: "700", lineHeight: 34 },
	description: { fontSize: 16, lineHeight: 24 },
});
