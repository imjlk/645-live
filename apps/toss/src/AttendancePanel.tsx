import { Button } from "@toss/tds-react-native";
import { useEffect, useRef } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { LOCAL_PREVIEW, type Promotion } from "./api";
import { createPromotionRefresh } from "./promotion-refresh";
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
	if (reward.claimId) button = "지급 상태 확인";
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
			{paid || claimed ? (
				<Text style={[s.body, { color: theme.muted }]}>
					{paid ? "포인트 적립 완료" : "이미 받은 혜택이에요"}
				</Text>
			) : reward.status === "pending" ? (
				<Text
					accessibilityLiveRegion="polite"
					style={[s.body, { color: theme.muted }]}
				>
					포인트 적립 결과를 확인하고 있어요.
				</Text>
			) : (
				<Button
					display="full"
					style="weak"
					loading={model.busy === "promotion"}
					disabled={!!model.busy || (!reward.eligible && !reward.claimId)}
					onPress={() => void model.promotion(reward)}
				>
					{button}
				</Button>
			)}
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
	const pendingKey = JSON.stringify(
		[
			...new Set(
				[...(state?.promotions ?? []), ...(state?.promotionHistory ?? [])]
					.filter((reward) => reward.status === "pending" && reward.claimId)
					.map((reward) => reward.claimId as string),
			),
		].sort(),
	);
	const { refreshPromotionClaims, busy } = model;
	const refresher = useRef<ReturnType<typeof createPromotionRefresh> | null>(
		null,
	);
	useEffect(() => {
		const controller = createPromotionRefresh(refreshPromotionClaims);
		refresher.current = controller;
		return () => controller.dispose();
	}, [refreshPromotionClaims]);
	// biome-ignore lint/correctness/useExhaustiveDependencies: Reapply the pending state when the preceding effect replaces the controller.
	useEffect(() => {
		refresher.current?.update(JSON.parse(pendingKey), !!busy);
	}, [pendingKey, refreshPromotionClaims, busy]);

	const count = state?.streak ?? 0;
	const daily = state?.promotions.find((p) => p.kind === "daily");
	const restoreAd = model.adConfig?.placements.find(
		(p) => p.placement === "attendance_restore",
	)?.enabled;
	const checkIn = () => {
		if (!state?.canRestore && !state?.restoreAfterGeneration) {
			void model.checkIn();
			return;
		}
		Alert.alert(
			"어제 출석을 먼저 복구할까요?",
			"오늘 출석을 완료하면 어제 놓친 도장을 복구할 수 없어요.",
			[
				{ text: "복구 먼저", style: "cancel" },
				{ text: "오늘 출석하기", onPress: () => void model.checkIn() },
			],
		);
	};
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
			{state?.canRestore || state?.restoreAfterGeneration ? (
				<View style={[s.restore, { backgroundColor: theme.surface }]}>
					<Text style={[s.rewardTitle, { color: theme.text }]}>
						어제 놓친 도장을 이어볼까요?
					</Text>
					<Text style={[s.body, { color: theme.muted }]}>
						{state.canRestore
							? "보상형 광고를 완료하면 어제 출석을 복구해요. 오늘 출석을 먼저 완료하면 복구할 수 없어요. 어제의 일일 포인트는 지급하지 않아요."
							: "오늘 번호를 한 번 만들면 어제 출석을 복구할 수 있어요. 복구를 원하면 오늘 출석보다 먼저 진행해 주세요."}
					</Text>
					{state.restoreAfterGeneration ? (
						<Button
							display="full"
							disabled={!!model.busy || !model.user}
							onPress={onGenerate}
						>
							번호 만들고 복구하기
						</Button>
					) : null}
					{state.canRestore && LOCAL_PREVIEW ? (
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
					{state.canRestore ? (
						<Button
							display="full"
							style="weak"
							disabled={
								!!model.busy || !restoreAd || !!model.adUnavailableReason
							}
							loading={model.busy === "unlock-attendance_restore"}
							onPress={() => void model.unlock("attendance_restore")}
						>
							{restoreAd ? "광고 보고 연속 출석 복구" : "복구 광고 준비 중"}
						</Button>
					) : null}
					{state.canRestore && model.adUnavailableReason ? (
						<Text style={[s.caption, { color: theme.muted }]}>
							{model.adUnavailableReason}
						</Text>
					) : null}
				</View>
			) : null}
			{state?.generatedToday || state?.checkedIn ? (
				<Button
					display="full"
					loading={model.busy === "checkIn"}
					disabled={!!model.busy || !model.user || state.checkedIn}
					onPress={checkIn}
				>
					{state.checkedIn
						? "오늘 출석 완료"
						: daily?.available
							? `출석하고 ${daily.amount}P 받기`
							: "오늘 출석하기"}
				</Button>
			) : !state?.restoreAfterGeneration ? (
				<Button
					display="full"
					disabled={!!model.busy || !model.user}
					onPress={onGenerate}
				>
					오늘 번호 만들기
				</Button>
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
							{reward.status === "success" ||
							reward.status === "recorded" ||
							reward.status === "already_claimed" ? (
								<Text style={[s.caption, { color: theme.muted }]}>
									적립 완료
								</Text>
							) : reward.status === "pending" ? (
								<Text style={[s.caption, { color: theme.muted }]}>
									적립 확인 중
								</Text>
							) : (
								<Button
									size="tiny"
									type="dark"
									style="weak"
									disabled={!!model.busy}
									onPress={() => void model.promotion(reward)}
								>
									지급 확인
								</Button>
							)}
						</View>
					))}
				</View>
			) : null}
			<Text style={[s.caption, { color: theme.muted }]}>
				출석은 한국 시간 자정에 갱신돼요. 프로모션은 운영 기간과 예산 내에서
				제공돼요. 번호를 만든 뒤 오늘의 출석을 완료해 주세요.
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
