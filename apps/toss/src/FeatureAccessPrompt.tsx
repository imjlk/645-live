import type { AdSkipChoice } from "@trailbase-apps-in-toss-kit/ait-web/ad-skip";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { adSkipLabel } from "./ad-skip";
import { type AdFlow, createAdFlow } from "./ad-telemetry";
import { FEATURE_AD_POLICY } from "./feature-ad-counter";
import { useTabShell } from "./TabShell";
import { adTelemetry } from "./telemetry";
import { useTheme } from "./theme";
import { Button, ConfirmDialog } from "./web/controls";
import { Text, View } from "./web/primitives";
export type FeatureRequest = {
	feature: "custom" | "report";
	action: () => void;
};
type Choice = "ad" | "ticket" | null;
export function FeatureAccessPrompt({
	request,
	continueFeature,
	continueWithTicket,
	ticketChoice,
	onDone,
	entryPoint = "feature",
}: {
	request: FeatureRequest | null;
	continueFeature: (
		feature: "custom" | "report",
		flow?: AdFlow,
	) => Promise<boolean>;
	/** Uses one ad skip ticket instead of the ad; never calls the ad SDK. */
	continueWithTicket?: (feature: "custom" | "report") => Promise<boolean>;
	ticketChoice?: (feature: "custom" | "report") => AdSkipChoice;
	entryPoint?: string;
	onDone: () => void;
}) {
	const { presentOverlay } = useTabShell();
	const theme = useTheme();
	const [open, setOpen] = useState(false);
	const [mounted, setMounted] = useState(false);
	const accepted = useRef<Choice>(null);
	const current = useRef(request);
	const processing = useRef(false);
	const flow = useMemo(
		() =>
			request
				? createAdFlow(adTelemetry, {
						placement: request.feature,
						policy: FEATURE_AD_POLICY,
						entryPoint,
					})
				: null,
		[request, entryPoint],
	);
	useEffect(
		() => () => {
			if (!processing.current) flow?.track("settled", "prompt_canceled");
		},
		[flow],
	);
	useEffect(() => {
		current.current = request;
		if (!request) {
			setMounted(false);
			return;
		}
		setMounted(true);
		accepted.current = null;
		processing.current = false;
		setOpen(true);
		return () => {
			if (current.current === request) current.current = null;
		};
	}, [request]);
	useLayoutEffect(() => {
		if (!request) return;
		return presentOverlay(() => {
			if (!processing.current) {
				accepted.current = null;
				setOpen(false);
			}
		});
	}, [request, presentOverlay]);
	if (!request || !mounted) return null;
	const ticket =
		continueWithTicket && ticketChoice ? ticketChoice(request.feature) : null;
	return (
		<ConfirmDialog
			open={open}
			onEntered={() => {
				if (current.current !== request || !open || processing.current) return;
				flow?.track("cta_viewed");
			}}
			title={
				request.feature === "custom"
					? "맞춤 조건으로 계속 만들까요?"
					: "조합 분석을 더 살펴볼까요?"
			}
			description={
				request.feature === "custom"
					? "광고 한 번을 완료하면 고정·제외 번호와 홀짝 조건을 다시 여러 번 설정할 수 있어요. 기본 번호 생성은 그대로 이용할 수 있어요."
					: "광고 한 번을 완료하면 번호별 흐름과 조합 패턴을 다시 여러 번 살펴볼 수 있어요. 기본 생성 통계는 그대로 볼 수 있어요."
			}
			content={
				ticket?.showTicket ? (
					<View
						style={{
							gap: 10,
							marginTop: 20,
							paddingTop: 16,
							paddingBottom: 4,
							borderTopWidth: 1,
							borderColor: theme.line,
						}}
					>
						<View
							style={{
								flexDirection: "row",
								alignItems: "center",
								justifyContent: "space-between",
								gap: 8,
							}}
						>
							<Text
								style={{
									fontSize: 14,
									lineHeight: 22,
									fontWeight: "600",
									color: theme.text,
								}}
							>
								광고 스킵권
							</Text>
							<Text
								style={{ fontSize: 13, lineHeight: 20, color: theme.muted }}
							>
								{ticket.balance == null
									? "보유 수량 확인 중"
									: `보유 ${ticket.balance}장`}
							</Text>
						</View>
						<Button
							display="block"
							size="medium"
							accessibilityLabel={adSkipLabel(ticket, "바로 이용하기")}
							style="weak"
							disabled={!ticket.ticketEnabled}
							onPress={() => {
								accepted.current = "ticket";
								setOpen(false);
							}}
						>
							<Text
								style={{
									fontSize: 14,
									lineHeight: 22,
									fontWeight: "600",
									color: ticket.ticketEnabled ? theme.blue : theme.muted,
								}}
							>
								{ticket.reason === "checking" || ticket.reason === "loading"
									? adSkipLabel(ticket, "바로 이용하기")
									: "스킵권 1장으로 바로 이용하기"}
							</Text>
						</Button>
						{ticket.reason === "empty" ? (
							<Text
								style={{ fontSize: 12, lineHeight: 18, color: theme.muted }}
							>
								출석하면 광고 스킵권을 받을 수 있어요.
							</Text>
						) : null}
					</View>
				) : undefined
			}
			leftButton={
				<ConfirmDialog.Button
					style="weak"
					type="dark"
					onPress={() => {
						accepted.current = null;
						setOpen(false);
					}}
				>
					나중에
				</ConfirmDialog.Button>
			}
			rightButton={
				<ConfirmDialog.Button
					disabled={ticket ? !ticket.adEnabled : false}
					onPress={() => {
						accepted.current = "ad";
						setOpen(false);
					}}
				>
					광고 보고 계속하기
				</ConfirmDialog.Button>
			}
			onClose={() => {
				setOpen(false);
			}}
			onExited={() => {
				if (processing.current) return;
				processing.current = true;
				setMounted(false);
				const pending = current.current;
				const choice = accepted.current;
				if (!choice || !pending) {
					flow?.track("settled", "declined");
					onDone();
					return;
				}
				// A ticket replaces the ad: it records no ad request, impression or
				// completion, only how the prompt was settled.
				const run =
					choice === "ticket" && continueWithTicket
						? continueWithTicket(pending.feature)
						: continueFeature(pending.feature, flow ?? undefined);
				void run.then(
					(ok) => {
						flow?.track(
							"settled",
							!ok
								? "feature_failed"
								: choice === "ticket"
									? "ad_skip_ticket"
									: "feature_continued",
						);
						if (current.current !== pending) {
							flow?.track("feature_outcome", "feature_canceled");
							return;
						}
						onDone();
						try {
							if (ok) pending.action();
							flow?.track(
								"feature_outcome",
								ok ? "feature_continued" : "feature_failed",
							);
						} catch {
							flow?.track("feature_outcome", "feature_failed");
						}
					},
					() => {
						flow?.track("settled", "feature_failed");
						flow?.track(
							"feature_outcome",
							current.current === pending
								? "feature_failed"
								: "feature_canceled",
						);
						if (current.current === pending) onDone();
					},
				);
			}}
		/>
	);
}
