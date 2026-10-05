import { Button } from "@toss/tds-react-native";

export function GenerationResultsLink({ onPress }: { onPress: () => void }) {
	return (
		<Button
			display="full"
			size="medium"
			style="weak"
			accessibilityLabel="이전 회차 결과 보기"
			onPress={onPress}
		>
			이전 회차 결과
		</Button>
	);
}
