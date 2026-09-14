import {
	getOperationalEnvironment,
	loadFullScreenAd,
	requestNotificationAgreement,
	showFullScreenAd,
} from "@apps-in-toss/framework";
import { createAppsInTossFullScreenAdBridge } from "@trailbase-apps-in-toss-kit/ait-rn/ads";
import { createAppsInTossNotificationAgreementBridge } from "@trailbase-apps-in-toss-kit/ait-rn/notifications";
import {
	type AdConfig,
	type AdPlacement,
	type Api,
	apiErrorCode,
	LOCAL_PREVIEW,
} from "./api";

export function createAdController(api: Api) {
	const bridge = createAppsInTossFullScreenAdBridge({
		loadFullScreenAd,
		showFullScreenAd,
		showTimeoutMs: 120_000,
	});
	let busy = false;
	let disposed = false;
	let pendingCompletion: {
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
		async unlock(placement: AdPlacement) {
			if (busy) throw new Error("진행 중인 광고를 먼저 완료해 주세요.");
			const reason = unavailableReason();
			if (reason) throw new Error(reason);
			busy = true;
			try {
				if (pendingCompletion) {
					try {
						await api.completeAd(
							pendingCompletion.id,
							pendingCompletion.events,
						);
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
				const session = await api.startAd(placement);
				if (session.alreadyGranted) return;
				try {
					const result = await bridge.preloadAndShow({
						adGroupId: session.groupId,
						adFormat: session.format,
						interstitialCompletionFallbackMs: 120_000,
						preloadNext: false,
					});
					pendingCompletion = {
						id: session.id,
						events: result.events,
					};
					await api.completeAd(session.id, result.events);
					pendingCompletion = null;
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
					if (!pendingCompletion)
						await api.completeAd(session.id, ["cancelled"]).catch(() => {});
					throw error;
				}
			} finally {
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
