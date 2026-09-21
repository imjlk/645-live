import {
	getOperationalEnvironment,
	loadFullScreenAd,
	requestNotificationAgreement,
	showFullScreenAd,
} from "@apps-in-toss/framework";
import {
	AppsInTossAdBridgeError,
	createAppsInTossFullScreenAdBridge,
} from "@trailbase-apps-in-toss-kit/ait-rn/ads";
import { createAppsInTossNotificationAgreementBridge } from "@trailbase-apps-in-toss-kit/ait-rn/notifications";
import { type AdFlow, createAdFlow } from "./ad-telemetry";
import {
	type AdConfig,
	type AdPlacement,
	type Api,
	apiErrorCode,
	LOCAL_PREVIEW,
} from "./api";
import { adTelemetry } from "./telemetry";

export function createAdController(api: Pick<Api, "startAd" | "completeAd">) {
	let activeFlow: AdFlow | null = null;
	const observedShow = Object.assign(
		(params: Parameters<typeof showFullScreenAd>[0]) => {
			const flow = activeFlow;
			return showFullScreenAd({
				...params,
				onEvent(event) {
					if (!disposed) {
						if (event.type === "show") flow?.track("shown");
						if (event.type === "impression") flow?.track("viewable");
					}
					params.onEvent(event);
				},
			});
		},
		{ isSupported: () => showFullScreenAd.isSupported() },
	);
	const bridge = createAppsInTossFullScreenAdBridge({
		loadFullScreenAd,
		showFullScreenAd: observedShow,
		showTimeoutMs: 120_000,
	});
	let busy = false;
	let disposed = false;
	let pendingCompletion: {
		placement: AdPlacement;
		id: string;
		events: string[];
	} | null = null;
	function unavailableReason(): string | null {
		try {
			if (getOperationalEnvironment() === "sandbox")
				return LOCAL_PREVIEW
					? "샌드박스는 실제 광고를 지원하지 않아요. 위의 테스트 버튼으로 기능을 확인해 주세요."
					: "샌드박스는 실제 광고를 지원하지 않아요. 토스 앱의 테스트 버전에서 확인해 주세요.";
			if (loadFullScreenAd.isSupported() && showFullScreenAd.isSupported())
				return null;
		} catch {}
		return LOCAL_PREVIEW
			? "이 로컬 환경에서는 실제 광고를 열 수 없어요. 위의 테스트 버튼으로 기능을 확인해 주세요."
			: "현재 환경에서는 광고를 이용할 수 없어요. 최신 토스 앱에서 다시 확인해 주세요.";
	}
	const supported = () => unavailableReason() === null;
	return {
		supported,
		unavailableReason,
		preload(config: AdConfig) {
			if (!supported() || disposed) return;
			const groups = new Set(
				config.placements
					.filter((p) => p.enabled)
					.flatMap((p) => [p.rewardedGroupId, p.interstitialGroupId])
					.filter((v): v is string => !!v),
			);
			for (const id of groups)
				void bridge.preload({ adGroupId: id }).catch(() => {});
		},
		async unlock(
			placement: AdPlacement,
			clientManagedCounter = false,
			providedFlow?: AdFlow,
		) {
			if (busy) throw new Error("진행 중인 광고를 먼저 완료해 주세요.");
			const reason = unavailableReason();
			if (reason && placement !== "generation_continue")
				throw new Error(reason);
			busy = true;
			const flow = providedFlow ?? createAdFlow(adTelemetry, { placement });
			activeFlow = flow;
			flow.track("requested");
			try {
				if (pendingCompletion) {
					try {
						const previous = pendingCompletion;
						const result = await api.completeAd(
							pendingCompletion.id,
							pendingCompletion.events,
						);
						pendingCompletion = null;
						if (previous.placement === placement) {
							flow.track("settled", "completion_retry");
							return result;
						}
					} catch (error) {
						if (
							[
								"AD_INCOMPLETE",
								"AD_EXPIRED",
								"AD_NOT_FOUND",
								"RESTORE_EXPIRED",
								"RESTORE_UNAVAILABLE",
							].includes(apiErrorCode(error) ?? "")
						)
							pendingCompletion = null;
						else throw error;
					}
					pendingCompletion = null;
				}
				const session = await api
					.startAd(placement, clientManagedCounter)
					.catch((error) => {
						if (
							placement === "generation_continue" &&
							["AD_COOLDOWN", "AD_UNAVAILABLE"].includes(
								apiErrorCode(error) ?? "",
							)
						)
							return null;
						throw error;
					});
				if (!session || session.alreadyGranted) {
					flow.track(
						"unavailable",
						session ? "already_granted" : "cooldown_or_disabled",
					);
					return;
				}
				// Set the format before native callbacks arrive.
				flow.track("session_started", "", session.format);
				try {
					if (reason) {
						flow.track("unavailable", "unsupported");
						pendingCompletion = {
							placement,
							id: session.id,
							events: ["failedToShow"],
						};
						const result = await api.completeAd(
							session.id,
							pendingCompletion.events,
						);
						pendingCompletion = null;
						return result;
					}
					const result = await bridge.preloadAndShow({
						adGroupId: session.groupId,
						adFormat: session.format,
						interstitialCompletionFallbackMs: 120_000,
						preloadNext: false,
					});
					if (result.completed) flow.track("completed");
					pendingCompletion = {
						placement,
						id: session.id,
						events: result.events,
					};
					const completed = await api.completeAd(session.id, result.events);
					pendingCompletion = null;
					flow.track("settled", "accepted");
					return completed;
				} catch (error) {
					flow.track(
						"failed",
						error instanceof AppsInTossAdBridgeError
							? error.code
							: "completion_error",
					);
					if (
						placement === "generation_continue" &&
						!pendingCompletion &&
						error instanceof AppsInTossAdBridgeError &&
						error.code !== "AD_SHOW_TIMEOUT"
					) {
						pendingCompletion = {
							placement,
							id: session.id,
							events: ["failedToShow"],
						};
						const result = await api.completeAd(
							session.id,
							pendingCompletion.events,
						);
						pendingCompletion = null;
						return result;
					}
					if (
						[
							"AD_INCOMPLETE",
							"AD_EXPIRED",
							"AD_NOT_FOUND",
							"RESTORE_EXPIRED",
							"RESTORE_UNAVAILABLE",
						].includes(apiErrorCode(error) ?? "")
					)
						pendingCompletion = null;
					if (!pendingCompletion)
						await api.completeAd(session.id, ["cancelled"]).catch(() => {});
					throw error;
				}
			} catch (error) {
				flow.track("failed", "request_error");
				throw error;
			} finally {
				activeFlow = null;
				busy = false;
			}
		},
		dispose() {
			disposed = true;
			bridge.clear();
		},
	};
}
export async function setResultNotification(
	api: Api,
	templateCode: string,
	enabled: boolean,
	rounds: number[],
) {
	let result = "agreementRejected";
	if (enabled) {
		const bridge = createAppsInTossNotificationAgreementBridge({
			requestNotificationAgreement,
			production: true,
		});
		const response = await bridge.requestAgreement({ templateCode });
		result = response.result;
	}
	await api.request("/api/app/v1/notifications/agreement", {
		templateCode,
		result,
	});
	const optedIn = result === "alreadyAgreed" || result === "newAgreement";
	if (optedIn)
		for (const round of new Set(rounds))
			await api.request("/api/app/v1/notifications/watch-result", { round });
	return optedIn;
}
