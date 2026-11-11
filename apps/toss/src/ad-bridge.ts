import {
	getOperationalEnvironment,
	loadFullScreenAd,
	showFullScreenAd,
} from "@apps-in-toss/web-framework";
import { createAppsInTossWebAdapter } from "@trailbase-apps-in-toss-kit/ait-web";
import {
	AppsInTossAdBridgeError,
	createAppsInTossFullScreenAdBridge,
} from "@trailbase-apps-in-toss-kit/ait-web/ads";
import { completionMatches, createAdCompletionRecovery } from "./ad-completion";
import { type AdFlow, createAdFlow } from "./ad-telemetry";
import {
	type AdPlacement,
	type Api,
	apiErrorCode,
	LOCAL_PREVIEW,
	retryableApiError,
} from "./api";
import { adTelemetry } from "./telemetry";

export type AdUnlockResult = {
	feature: string;
	expiresAt?: number;
	continuedWithoutAd?: boolean;
	resolution:
		| "already_granted"
		| "completion_retry"
		| "ad_completed"
		| "unavailable";
};

const continuation = (placement: AdPlacement) =>
	placement !== "attendance_restore";

function resolvedAd(
	result: Awaited<ReturnType<Api["completeAd"]>>,
	placement: AdPlacement,
	resolution: AdUnlockResult["resolution"],
): AdUnlockResult {
	if (
		result.feature !== placement ||
		(!continuation(placement) && result.continuedWithoutAd)
	) {
		throw new Error("광고 완료 결과를 확인하지 못했어요. 다시 시도해 주세요.");
	}
	return { ...result, resolution };
}

export function createAdController(
	api: Pick<Api, "startAd" | "completeAd" | "adCompletionScope">,
) {
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
		// Bounds opening only; the kit clears this once the SDK reports visibility.
		showTimeoutMs: 120_000,
	});
	let busy = false;
	let disposed = false;
	const recovery = createAdCompletionRecovery({
		scope: api.adCompletionScope,
		complete: api.completeAd,
		errorCode: apiErrorCode,
		retryable: retryableApiError,
		validate: (result, pending) => {
			resolvedAd(result, pending.placement as AdPlacement, "completion_retry");
		},
		active: () => !disposed,
		track: (event, outcome) => activeFlow?.track(event, outcome),
	});
	let pendingCancellation: string | null = null;
	async function flushCancellation() {
		if (!pendingCancellation) return;
		try {
			await api.completeAd(pendingCancellation, ["cancelled"]);
		} catch (error) {
			if (
				!["AD_INCOMPLETE", "AD_EXPIRED", "AD_NOT_FOUND"].includes(
					apiErrorCode(error) ?? "",
				)
			)
				throw error;
		}
		pendingCancellation = null;
	}
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
		async unlock(
			placement: AdPlacement,
			clientManagedCounter = false,
			providedFlow?: AdFlow,
			canShow: () => boolean = () => true,
			// The prompt this ad answers; the server refuses to show an ad for a
			// prompt that a skip ticket already settled.
			opportunityKey?: string | null,
		): Promise<AdUnlockResult> {
			if (disposed) throw new Error("광고 요청을 중단했어요.");
			if (busy) throw new Error("진행 중인 광고를 먼저 완료해 주세요.");
			const reason = unavailableReason();
			if (reason && !continuation(placement)) throw new Error(reason);
			busy = true;
			const flow = providedFlow ?? createAdFlow(adTelemetry, { placement });
			activeFlow = flow;
			flow.track("requested");
			try {
				await recovery.load();
				await flushCancellation();
				if (recovery.pending) {
					const previous = recovery.pending;
					try {
						const result = await recovery.settle();
						// A previous prompt must not refill the counter for a different prompt.
						if (completionMatches(previous, placement, opportunityKey)) {
							flow.track("completion_recovered", "previous_request");
							flow.track("settled", "completion_retry");
							return resolvedAd(result, placement, "completion_retry");
						}
					} catch (error) {
						if (recovery.pending) throw error;
					}
				}
				const session = await api
					.startAd(placement, clientManagedCounter, opportunityKey)
					.catch((error) => {
						if (
							continuation(placement) &&
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
					return {
						feature: placement,
						resolution: session ? "already_granted" : "unavailable",
						continuedWithoutAd: !session,
					};
				}
				if (
					placement === "attendance_restore" &&
					session.format !== "rewarded"
				) {
					// Older servers may still offer a mixed-format restore placement.
					// Release the reservation without showing an ad or granting a restore.
					pendingCancellation = session.id;
					await flushCancellation().catch(() => {});
					throw new Error(
						"연속 출석 복구에는 보상형 광고가 필요해요. 잠시 후 다시 시도해 주세요.",
					);
				}
				// Set the format before native callbacks arrive.
				flow.track("session_started", "", session.format);
				try {
					if (disposed || !canShow())
						throw new Error("광고 요청을 중단했어요.");
					if (reason) {
						flow.track("unavailable", "unsupported");
						await recovery.save({
							placement,
							id: session.id,
							events: ["failedToShow"],
							opportunityKey: opportunityKey ?? null,
						});
						const result = await recovery.settle();
						return resolvedAd(result, placement, "unavailable");
					}
					// Load only the server-selected group after an explicit CTA. A
					// disposed provider must never open a late native ad after loading.
					await bridge.preload({ adGroupId: session.groupId });
					if (disposed || !canShow())
						throw new Error("광고 요청을 중단했어요.");
					const result = await bridge.show({
						adGroupId: session.groupId,
						adFormat: session.format,
						interstitialCompletionFallbackMs: 120_000,
					});
					if (!continuation(placement) && !result.completed) {
						throw new Error(
							"광고를 끝까지 보면 출석 복구·기능 이용이 가능해요.",
						);
					}
					if (result.completed) flow.track("completed");
					await recovery.save({
						placement,
						id: session.id,
						events: result.events,
						opportunityKey: opportunityKey ?? null,
					});
					const completed = await recovery.settle();
					flow.track("settled", "accepted");
					return resolvedAd(completed, placement, "ad_completed");
				} catch (error) {
					flow.track(
						"failed",
						error instanceof AppsInTossAdBridgeError
							? error.code
							: "completion_error",
					);
					if (
						continuation(placement) &&
						!recovery.pending &&
						error instanceof AppsInTossAdBridgeError &&
						error.code !== "AD_SHOW_TIMEOUT"
					) {
						await recovery.save({
							placement,
							id: session.id,
							events: ["failedToShow"],
							opportunityKey: opportunityKey ?? null,
						});
						const result = await recovery.settle();
						return resolvedAd(result, placement, "unavailable");
					}
					if (!recovery.pending) {
						bridge.clear(session.groupId);
						pendingCancellation = session.id;
						await flushCancellation().catch(() => {});
					}
					if (error instanceof AppsInTossAdBridgeError) {
						throw new Error(
							error.code === "AD_SHOW_TIMEOUT"
								? "광고 응답이 늦어지고 있어요. 잠시 후 다시 시도해 주세요."
								: "광고를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
							{ cause: error },
						);
					}
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
		const bridge = createAppsInTossWebAdapter({
			appKey: "645-live",
			loadSdk: () => import("@apps-in-toss/web-framework"),
		});
		const response = await bridge.requestNotificationAgreement(templateCode);
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
