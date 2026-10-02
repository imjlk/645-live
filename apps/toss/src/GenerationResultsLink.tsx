import { Button } from "@toss/tds-react-native";

export function GenerationResultsLink({ onPress }: { onPress: () => void }) {
	return (
		<Button display="full" style="weak" onPress={onPress}>
			이전 회차 결과 보기
		</Button>
	);
}
