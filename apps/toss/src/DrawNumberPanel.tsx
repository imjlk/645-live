import { Button } from "@toss/tds-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { type AdConfig, API_BASE } from "./api";
import { Balls } from "./Balls";
import { Banner } from "./Banner";
import {
	createDrawStatisticsClient,
	type DrawNumberStatistics,
} from "./draw-statistics";
import { useTheme } from "./theme";

const client = createDrawStatisticsClient(API_BASE);
export function DrawNumberPanel({
	number,
	active,
	adConfig,
}: {
	number: number;
	active: boolean;
	adConfig?: AdConfig | null;
}) {
	const theme = useTheme();
	const [state, setState] = useState<{
		data: DrawNumberStatistics | null;
		error: string;
		loading: boolean;
	}>({ data: null, error: "", loading: true });
	const [revision, retry] = useState(0);
	const freshRequested = useRef(false);
	const refresh = () => {
		freshRequested.current = true;
		retry((r) => r + 1);
	};
	// biome-ignore lint/correctness/useExhaustiveDependencies: revision triggers an explicit user refresh.
	useEffect(() => {
		if (!active) return;
		const controller = new AbortController();
		setState({ data: null, error: "", loading: true });
		const fresh = freshRequested.current;
		freshRequested.current = false;
		void client.read(number, controller.signal, fresh).then(
			(data) => {
				if (!controller.signal.aborted)
					setState({ data, error: "", loading: false });
			},
			(error) => {
				if (!controller.signal.aborted)
					setState({ data: null, error: error.message, loading: false });
			},
		);
		return () => controller.abort();
	}, [active, number, revision]);
	const data = state.data,
		text = { color: theme.text },
		muted = { color: theme.muted };
	return (
		<View style={s.root}>
			{state.loading ? (
				<ActivityIndicator
					color={theme.blue}
					accessibilityLabel="실제 추첨 누적 통계 불러오는 중"
				/>
			) : null}
			{state.error ? (
				<View style={s.root}>
					<Text accessibilityRole="alert" style={muted}>
						{state.error}
					</Text>
					<Button size="medium" style="weak" onPress={refresh}>
						다시 불러오기
					</Button>
				</View>
			) : null}
			{data ? (
				<>
					<View style={s.row}>
						<Text style={[s.caption, muted]}>실제 추첨 결과 · 전체 누적</Text>
						<Button size="tiny" style="weak" onPress={refresh}>
							새로 확인
						</Button>
					</View>
					<Text style={[s.caption, muted]}>
						{data.throughRound
							? `${data.throughRound}회까지 · 총 ${data.totalDraws.toLocaleString()}회 추첨 기준`
							: "아직 발표된 추첨 결과가 없어요."}
					</Text>
					<View style={[s.summary, { backgroundColor: theme.surface }]}>
						<View style={s.row}>
							<Text style={[s.heading, text]}>{number}번 추첨 이력</Text>
							<Balls numbers={[number]} size={40} reducedMotion />
						</View>
						<Text style={[s.total, text]}>
							{data.mainCount.toLocaleString()}
							<Text style={s.body}>회 본번호 출현</Text>
						</Text>
						<Text style={[s.body, text]}>
							보너스 {data.bonusCount.toLocaleString()}회 · 본번호 출현 비율{" "}
							{(
								(data.totalDraws ? data.mainCount / data.totalDraws : 0) * 100
							).toFixed(1)}
							%
						</Text>
						<Text style={[s.body, text]}>
							본번호 출현 순위 {data.rank ? `${data.rank}위` : "집계 전"}
						</Text>
						<Text style={[s.caption, muted]}>
							{data.lastMainRound
								? `최근 본번호 출현: ${data.lastMainRound}회`
								: "본번호 출현 기록이 없어요."}
						</Text>
					</View>
					<Banner
						placement="insights_summary"
						groupId={adConfig?.bannerGroups?.card ?? adConfig?.bannerGroupId}
					/>
					<Text style={[s.caption, muted]}>
						645.live 제공 · 이용자 생성 기록과 별도 집계해요. 출현 비율은 과거
						추첨 중 본번호로 나온 비율이며 다음 추첨의 당첨 확률을 뜻하지
						않아요.
					</Text>
				</>
			) : null}
		</View>
	);
}
const s = StyleSheet.create({
	root: { gap: 16 },
	row: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 10,
	},
	summary: { padding: 16, borderRadius: 16, gap: 14 },
	heading: { fontSize: 18, fontWeight: "700" },
	body: { fontSize: 14, lineHeight: 22 },
	caption: { fontSize: 12, lineHeight: 19 },
	total: { fontSize: 32, fontWeight: "700" },
});
