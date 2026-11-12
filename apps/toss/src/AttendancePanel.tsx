import { type ReactNode, useEffect, useRef } from "react";
import { LOCAL_PREVIEW, type Promotion } from "./api";
import { attendanceInstruction, attendanceReady } from "./attendance-progress";
import { createPromotionRefresh } from "./promotion-refresh";
import {
	checkInLabel,
	kstEndLabel,
	pointWindowNotice,
	promotionButton,
	visiblePointRewards,
} from "./reward-policy";
import { useTheme } from "./theme";
import type { LottoModel } from "./use-lotto";
import { Button } from "./web/controls";
import { Alert, StyleSheet, Text, View } from "./web/primitives";

function Reward({ reward, model }: { reward: Promotion; model: LottoModel }) {
	const theme = useTheme();
	const paid = reward.status === "success" || reward.status === "recorded";
	const claimed = reward.status === "already_claimed";
	const label = {
		daily: "매일 출석",
		weekly: "7일 연속 출석",
		legacy: "이전 출석",
	}[reward.kind];
	const button = promotionButton(reward);
	// A met condition is not a credit: budget and provider state still apply.
	const met =
		reward.eligible && reward.claimDeadlineAt
			? `수령 조건을 충족했어요 · ${kstEndLabel(reward.claimDeadlineAt)} 신청할 수 있어요.`
			: null;
	return (
		<View style={[s.reward, { borderColor: theme.line }]}>
			<View style={s.rewardHeading}>
				<Text style={[s.rewardTitle, { color: theme.text }]}>
					{label} · 토스 포인트
				</Text>
				{reward.amount !== null ? (
					<Text style={[s.amount, { color: theme.blue }]}>
						{reward.amount}P
					</Text>
				) : null}
			</View>
			<Text style={[s.body, { color: theme.muted }]}>
				{met ??
					(reward.kind === "daily"
						? "오늘 번호를 만들고 출석하면 받을 수 있어요."
						: "7일을 채우면 추가로 받아요. 완성한 혜택은 7일 안에 신청해 주세요.")}
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
	onAdFree,
	afterAttendance,
}: {
	model: LottoModel;
	onGenerate: () => void;
	onAdFree?: () => void;
	afterAttendance?: ReactNode;
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
	const skips = state?.adSkips;
	const showTickets = !!skips && (skips.active || skips.balance > 0);
	const pointNotice = pointWindowNotice(state);
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
					{attendanceInstruction(state)} 7일을 채우면 다음 날 새로운 주기가
					시작돼요.
				</Text>
			</View>
			{state?.checkedIn ? (
				<View style={{ gap: 10 }}>
					<Text style={[s.rewardTitle, { color: theme.text }]}>
						내일도 번호 한 번, 출석 한 번
					</Text>
					<Text style={[s.body, { color: theme.muted }]}>
						오늘 출석을 마쳤어요. 내일 다시 번호를 만들고 출석을 이어가세요.
					</Text>
					{afterAttendance ? (
						<>
							{afterAttendance}
							<Text style={[s.caption, { color: theme.muted }]}>
								마음에 드는 번호를 보관하면 추첨 후 보관함에서 결과를 확인할 수
								있어요.
							</Text>
						</>
					) : null}
				</View>
			) : null}
			{showTickets && skips ? (
				<View style={[s.restore, { backgroundColor: theme.surface }]}>
					<View style={s.rewardHeading}>
						<Text style={[s.rewardTitle, { color: theme.text }]}>
							출석하고 광고 스킵권 받기
						</Text>
						<Text
							accessibilityLabel={`광고 스킵권 ${skips.balance}장 보유`}
							style={[s.rewardTitle, { color: theme.blue }]}
						>
							{skips.balance}장
						</Text>
					</View>
					<Text style={[s.body, { color: theme.muted }]}>
						매일 출석하면 스킵권 {skips.dailyTickets}장, 7일 연속 출석을
						완성하면 추가 {skips.streakBonusTickets}장을 받아요.
						{count === 6 && !state?.checkedIn
							? ` 오늘은 일일 보상과 연속 보상을 합쳐 ${skips.dailyTickets + skips.streakBonusTickets}장을 받아요.`
							: ""}
					</Text>
					<Text style={[s.caption, { color: theme.muted }]}>
						스킵권 1장으로 번호 생성·맞춤 설정·상세 분석의 전면 광고 1회를
						건너뛸 수 있어요. 양도·현금·토스 포인트로 바꿀 수 없어요.
					</Text>
				</View>
			) : null}
			{pointNotice ? (
				<Text style={[s.body, { color: theme.muted }]}>{pointNotice}</Text>
			) : null}
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
							? `보상형 광고를 완료하면 어제 출석을 복구해요. 오늘 출석을 먼저 완료하면 복구할 수 없어요. 어제의 일일 포인트${showTickets ? "와 스킵권" : ""}은 지급하지 않아요.${showTickets ? " 연속 출석 복구에는 광고 스킵권을 사용할 수 없어요." : ""}`
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
			{state && attendanceReady(state) ? (
				<Button
					display="full"
					loading={model.busy === "checkIn"}
					disabled={!!model.busy || !model.user || state.checkedIn}
					onPress={checkIn}
				>
					{checkInLabel(state)}
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
			{onAdFree && (model.adFree.enabled || LOCAL_PREVIEW) ? (
				<View style={[s.restore, { backgroundColor: theme.surface }]}>
					<Text style={[s.rewardTitle, { color: theme.text }]}>
						{model.adFree.owned ? "광고 제거 이용 중" : "광고 없이 번호 만들기"}
					</Text>
					<Text style={[s.body, { color: theme.muted }]}>
						{model.adFree.owned
							? "배너와 번호 생성 광고 없이 이용 중이에요."
							: "한 번 구매하면 배너와 번호 생성 광고를 제거할 수 있어요."}
					</Text>
					{!model.adFree.owned ? (
						<Button
							display="full"
							size="medium"
							style="weak"
							onPress={onAdFree}
						>
							광고 제거 알아보기
						</Button>
					) : null}
				</View>
			) : null}
			{visiblePointRewards(state?.promotions ?? []).map((reward) => (
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
								{reward.amount ?? 0}P
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
