import { Button } from "@toss/tds-react-native";
import { View } from "react-native";

export function GenerationResultsLink({ onPress }: { onPress: () => void }) {
	return (
		<View style={{ marginTop: 20 }}>
			<Button style="weak" size="medium" onPress={onPress}>
				이전 회차 결과 보기 ›
			</Button>
		</View>
	);
}
