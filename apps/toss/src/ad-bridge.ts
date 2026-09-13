import {
	loadFullScreenAd,
	requestNotificationAgreement,
	showFullScreenAd,
} from "@apps-in-toss/framework";
import { createAppsInTossFullScreenAdBridge } from "@trailbase-apps-in-toss-kit/ait-rn/ads";
import { createAppsInTossNotificationAgreementBridge } from "@trailbase-apps-in-toss-kit/ait-rn/notifications";
import { type AdConfig, type Api, apiErrorCode } from "./api";

export function createAdController(api: Api) {
	const bridge = createAppsInTossFullScreenAdBridge({
		loadFullScreenAd,
		showFullScreenAd,
		showTimeoutMs: 120_000,
	});
	let busy = false;
	let disposed = false;
	let pendingCompletion: { id: string; events: string[] } | null = null;
	function supported() {
		try {
			return loadFullScreenAd.isSupported() && showFullScreenAd.isSupported();
		} catch {
			return false;
		}
	}
	return {
		supported,
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
		async unlock(placement: "custom" | "report") {
			if (busy) throw new Error("진행 중인 광고를 먼저 완료해 주세요.");
			if (!supported())
				throw new Error(
					"이 토스 버전에서는 광고를 지원하지 않아요. 출석으로도 이용권을 받을 수 있어요.",
				);
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
							["AD_INCOMPLETE", "AD_EXPIRED", "AD_NOT_FOUND"].includes(
								apiErrorCode(error) ?? "",
							)
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
					pendingCompletion = { id: session.id, events: result.events };
					await api.completeAd(session.id, result.events);
					pendingCompletion = null;
				} catch (error) {
					if (
						["AD_INCOMPLETE", "AD_EXPIRED", "AD_NOT_FOUND"].includes(
							apiErrorCode(error) ?? "",
						)
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
