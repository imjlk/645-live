import { Button } from "@toss/tds-react-native";
import { useEffect, useRef } from "react";
import { Text, View } from "react-native";
import { API_BASE, LOCAL_PREVIEW, type LocalAttendanceAction } from "./api";
import { useTheme } from "./theme";
import type { LottoModel } from "./use-lotto";

const SCENARIOS = [
	["day_seven", "7일 출석 직전"],
	["missed_yesterday", "어제 출석을 놓친 경우"],
	["new_cycle", "7일 완료 후 새 주기"],
	["fresh", "출석 기록 초기화"],
] as const;

export function LocalTestPanel({
	model,
	onAttendance,
	onResults,
}: {
	model: LottoModel;
	onAttendance: () => void;
	onResults: () => void;
}) {
	const theme = useTheme();
	const mounted = useRef(true);
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);
	if (!LOCAL_PREVIEW) return null;
	const text = { color: theme.text, fontSize: 16, lineHeight: 24 };
	const caption = { color: theme.muted, fontSize: 13, lineHeight: 21 };
	const prepare = async (action: LocalAttendanceAction) => {
		if (await model.localAttendance(action)) {
			if (mounted.current) onAttendance();
		}
	};
	return (
		<View style={{ gap: 20 }}>
			<Text style={caption}>
				현재 로컬 계정의 출석 기록만 변경해요. 실제 포인트 지급은 꺼져 있어요.
			</Text>
			<Text selectable style={caption}>
				연결된 로컬 API{`\n`}
				{API_BASE}
			</Text>
			<View style={{ gap: 10 }}>
				<Text style={text}>출석 시나리오</Text>
				<Text style={caption}>
					오늘 번호를 만든 기록은 유지돼요. 생성 전이라면 번호를 한 번 만든 뒤
					출석·복구를 확인해 주세요.
				</Text>
				{SCENARIOS.map(([scenario, label]) => (
					<Button
						key={scenario}
						display="full"
						style="weak"
						type="dark"
						disabled={!!model.busy || !model.user}
						onPress={() => void prepare({ action: "prepare", scenario })}
					>
						{label}
					</Button>
				))}
			</View>
			<View style={{ gap: 10 }}>
				<Text style={text}>결과와 광고 이용권</Text>
				<Button
					display="full"
					style="weak"
					type="dark"
					disabled={!model.context?.latestDraw}
					onPress={onResults}
				>
					당첨 결과·축하 미리보기
				</Button>
				<Button
					display="full"
					style="weak"
					type="dark"
					loading={model.busy === "test-pass"}
					disabled={!!model.busy || !model.user}
					onPress={() => void model.testPass()}
				>
					테스트 이용권 초기화
				</Button>
			</View>
		</View>
	);
}
