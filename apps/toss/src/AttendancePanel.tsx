import { Button } from "@toss/tds-react-native";
import { StyleSheet, Text, View } from "react-native";
import { LOCAL_PREVIEW, type Promotion } from "./api";
import { useTheme } from "./theme";
import type { LottoModel } from "./use-lotto";

function Reward({ reward, model }: { reward: Promotion; model: LottoModel }) {
	const theme = useTheme();
	const paid = reward.status === "success" || reward.status === "recorded";
	const claimed = reward.status === "already_claimed";
	const label = {
		daily: "매일 출석",
		weekly: "7일 연속 출석",
		legacy: "이전 출석",
	}[reward.kind];
	let button = `${reward.amount}P 받기`;
	if (paid) button = "지급 완료";
	else if (claimed) button = "이미 받은 혜택";
	else if (reward.claimId) button = "지급 상태 확인";
	else if (!reward.available) button = "프로모션 준비 중";
	else if (!reward.eligible) button = "출석 조건을 채워 주세요";
	return (
		<View style={[s.reward, { borderColor: theme.line }]}>
			<View style={s.rewardHeading}>
				<Text style={[s.rewardTitle, { color: theme.text }]}>{label}</Text>
				<Text style={[s.amount, { color: theme.blue }]}>{reward.amount}P</Text>
			</View>
			<Text style={[s.body, { color: theme.muted }]}>
				{reward.kind === "daily"
					? "오늘 번호를 만들고 출석하면 받을 수 있어요."
					: "7일을 채우면 추가로 받아요. 완성한 혜택은 7일 안에 신청해 주세요."}
			</Text>
			<Button
				display="full"
				style="weak"
				loading={model.busy === "promotion"}
				disabled={
					!!model.busy ||
					paid ||
					claimed ||
					(!reward.eligible && !reward.claimId)
				}
				onPress={() => void model.promotion(reward)}
			>
				{button}
			</Button>
		</View>
	);
}

export function AttendancePanel({
	model,
	onGenerate,
}: {
	model: LottoModel;
	onGenerate: () => void;
}) {
	const theme = useTheme();
	const state = model.attendance;
	const count = state?.streak ?? 0;
	const daily = state?.promotions.find((p) => p.kind === "daily");
	const restoreAd = model.adConfig?.placements.find(
		(p) => p.placement === "attendance_restore",
	)?.enabled;
	return (
		<View style={s.content}>
			<View style={s.intro}>
				<Text style={[s.title, { color: theme.text }]}>
					{count === 7 ? "7일을 모두 채웠어요!" : "번호 만들고, 출석 도장 꾹"}
				</Text>
				<Text style={[s.body, { color: theme.muted }]}>
					오늘 번호를 한 번 만들면 출석할 수 있어요. 7일을 채우면 다음 날 새로운
					주기가 시작돼요.
				</Text>
			</View>
			<View accessibilityLabel={`7일 중 ${count}일 출석`} style={s.stamps}>
				{Array.from({ length: 7 }, (_, i) => i + 1).map((day) => (
					<View
						key={day}
						style={[
							s.stamp,
							{ backgroundColor: count >= day ? theme.blue : theme.surface },
						]}
					>
						<Text
							style={[s.day, { color: count >= day ? "#FFFFFF" : theme.muted }]}
						>
							{day}
						</Text>
						<Text
							style={[
								s.caption,
								{ color: count >= day ? "#FFFFFF" : theme.muted },
							]}
						>
							{day === 7 ? "보너스" : "일"}
						</Text>
					</View>
				))}
			</View>
			{state?.generatedToday || state?.checkedIn ? (
				<Button
					display="full"
					loading={model.busy === "checkIn"}
					disabled={!!model.busy || !model.user || state.checkedIn}
					onPress={() => void model.checkIn()}
				>
					{state.checkedIn
						? "오늘 출석 완료"
						: daily?.available
							? `출석하고 ${daily.amount}P 받기`
							: "오늘 출석하기"}
				</Button>
			) : (
				<Button
					display="full"
					disabled={!!model.busy || !model.user}
					onPress={onGenerate}
				>
					오늘 번호 만들기
				</Button>
			)}
			{state?.canRestore ? (
				<View style={[s.restore, { backgroundColor: theme.surface }]}>
					<Text style={[s.rewardTitle, { color: theme.text }]}>
						어제 놓친 도장을 이어볼까요?
					</Text>
					<Text style={[s.body, { color: theme.muted }]}>
						광고를 완료하면 어제 출석을 복구해요. 주기당 한 번 사용할 수 있고,
						어제의 일일 포인트는 지급하지 않아요.
					</Text>
					{LOCAL_PREVIEW ? (
						<Button
							display="full"
							style="weak"
							type="dark"
							disabled={!!model.busy || !model.user}
							loading={model.busy === "local-attendance"}
							onPress={() => void model.localAttendance({ action: "restore" })}
						>
							테스트 · 광고 없이 출석 복구
						</Button>
					) : null}
					<Button
						display="full"
						style="weak"
						disabled={!!model.busy || !restoreAd || !!model.adUnavailableReason}
						loading={model.busy === "unlock-attendance_restore"}
						onPress={() => void model.unlock("attendance_restore")}
					>
						{restoreAd ? "광고 보고 연속 출석 복구" : "복구 광고 준비 중"}
					</Button>
					{model.adUnavailableReason ? (
						<Text style={[s.caption, { color: theme.muted }]}>
							{model.adUnavailableReason}
						</Text>
					) : null}
				</View>
			) : null}
			{state?.promotions.map((reward) => (
				<Reward key={reward.kind} reward={reward} model={model} />
			))}
			{state?.promotionHistory.length ? (
				<View style={s.history}>
					<Text style={[s.rewardTitle, { color: theme.text }]}>
						이전 혜택 내역
					</Text>
					{state.promotionHistory.map((reward) => (
						<View key={reward.claimId} style={s.rewardHeading}>
							<Text style={[s.body, { color: theme.muted }]}>
								{reward.kind === "daily" ? "일일" : "연속"} 출석 ·{" "}
								{reward.amount}P
							</Text>
							<Button
								size="tiny"
								type="dark"
								style="weak"
								disabled={
									!!model.busy ||
									reward.status === "success" ||
									reward.status === "recorded"
								}
								onPress={() => void model.promotion(reward)}
							>
								{reward.status === "success" || reward.status === "recorded"
									? "지급 완료"
									: "지급 확인"}
							</Button>
						</View>
					))}
				</View>
			) : null}
			<Text style={[s.caption, { color: theme.muted }]}>
				출석은 한국 시간 자정에 갱신돼요. 프로모션은 운영 기간과 예산 내에서
				제공되며, 기본 번호 생성은 광고 없이 이용할 수 있어요.
			</Text>
		</View>
	);
}
const s = StyleSheet.create({
	content: { gap: 24 },
	intro: { gap: 12 },
	title: {
		fontSize: 25,
		lineHeight: 35,
		fontWeight: "700",
		letterSpacing: -0.5,
	},
	body: { fontSize: 14, lineHeight: 22 },
	caption: { fontSize: 11, lineHeight: 17 },
	stamps: { flexDirection: "row", gap: 4 },
	stamp: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		height: 66,
		borderRadius: 12,
		gap: 2,
	},
	day: { fontSize: 19, fontWeight: "700" },
	reward: { borderTopWidth: 1, paddingTop: 22, gap: 12 },
	rewardHeading: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
	},
	rewardTitle: { fontSize: 17, lineHeight: 25, fontWeight: "700" },
	amount: { fontSize: 22, lineHeight: 30, fontWeight: "700" },
	restore: { padding: 18, borderRadius: 18, gap: 12 },
	history: { gap: 14 },
});
