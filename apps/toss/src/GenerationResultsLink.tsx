import { useNavigation } from "@granite-js/react-native";
import { Button } from "@toss/tds-react-native";
import { View } from "react-native";

export function GenerationResultsLink() {
	const navigation = useNavigation();
	return (
		<View style={{ marginTop: 20 }}>
			<Button
				style="weak"
				size="medium"
				onPress={() => navigation.navigate("/results")}
			>
				회차별 생성 결과 보기 ›
			</Button>
		</View>
	);
}
