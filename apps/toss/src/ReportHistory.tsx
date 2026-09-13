import type { CombinationReport } from "@645/lotto-core";
import { Button } from "@toss/tds-react-native";
import { ActivityIndicator, Text, View } from "react-native";
import { Balls } from "./Balls";
import { useTheme } from "./theme";

export type ReportState =
	| { data: CombinationReport; error?: never }
	| { data?: never; error: string };
export function ReportHistory({
	state,
	retry,
	busy,
	ballSize,
}: {
	state?: ReportState;
	retry: () => void;
	busy: boolean;
	ballSize: number;
}) {
	const theme = useTheme();
	if (!state) return <ActivityIndicator color={theme.blue} />;
	if (state.error)
		return (
			<View style={{ gap: 12 }}>
				<Text style={{ color: theme.muted, lineHeight: 22 }}>
					{state.error}
				</Text>
				<Button style="weak" size="medium" disabled={busy} onPress={retry}>
					비교 정보 다시 불러오기
				</Button>
			</View>
		);
	const data = state.data;
	if (!data) return null;
	return (
		<View style={{ gap: 18 }}>
			<Text style={{ fontSize: 19, fontWeight: "700", color: theme.text }}>
				과거 당첨 번호와 비교하면
			</Text>
			{data.historical.length ? (
				data.historical.map((draw) => (
					<View
						key={draw.round}
						style={{
							gap: 12,
							borderBottomWidth: 1,
							borderColor: theme.line,
							paddingBottom: 16,
						}}
					>
						<View
							style={{ flexDirection: "row", justifyContent: "space-between" }}
						>
							<Text style={{ color: theme.text, fontSize: 14 }}>
								{draw.round}회
							</Text>
							<Text style={{ color: theme.blue, fontSize: 14 }}>
								{draw.matches}개 일치
							</Text>
						</View>
						<Balls numbers={draw.numbers} size={Math.min(36, ballSize)} />
					</View>
				))
			) : (
				<Text style={{ color: theme.muted }}>
					당첨 이력을 불러오는 중이에요. 잠시 후 다시 확인해 주세요.
				</Text>
			)}
			<Text style={{ fontSize: 15, fontWeight: "600", color: theme.text }}>
				내 번호의 역대 출현 횟수
			</Text>
			{data.frequencies.map((item) => (
				<View
					key={item.number}
					style={{ flexDirection: "row", justifyContent: "space-between" }}
				>
					<Text style={{ color: theme.text, fontSize: 14 }}>
						{item.number}번
					</Text>
					<Text style={{ color: theme.muted, fontSize: 14 }}>
						{item.drawCount}회 ·{" "}
						{item.lastRound ? `최근 ${item.lastRound}회` : "출현 전"}
					</Text>
				</View>
			))}
		</View>
	);
}
