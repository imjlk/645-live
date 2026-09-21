import { createAnalyticsRouter } from "@trailbase-apps-in-toss-kit/ait-rn/analytics";

export type AdMetric =
	| "session_started"
	| "cta_viewed"
	| "requested"
	| "shown"
	| "viewable"
	| "completed"
	| "unavailable"
	| "failed"
	| "settled"
	| "generation_completed"
	| "banner_rendered"
	| "banner_viewable"
	| "banner_clicked"
	| "banner_no_fill"
	| "banner_failed";
export type AdMetricContext = {
	placement: string;
	format?: string;
	policy?: string;
	flowId?: string;
};
export type AdMetricPayload = {
	placement: string;
	format: string;
	policy: string;
	flow_id: string;
	outcome: string;
};
export type AdMetricSink = (event: {
	log_name: string;
	log_type: "event" | "click" | "impression";
	params: AdMetricPayload;
}) => void | Promise<void>;

/** No identities, generated numbers, server tokens, or raw error payloads. */
export function createAdTelemetry(send: AdMetricSink) {
	const router = createAnalyticsRouter<AdMetric, AdMetricPayload>({
		appsInToss: {
			enabled: true,
			// AppsInToss.registerApp owns Analytics.init; never replace its logger.
			analyticsModule: null,
			mapEvent: (event) => ({
				name: `lotto_ad_${event.eventName}`,
				type: "custom",
			}),
			dispatch: (mapped, event) =>
				send({
					log_name: mapped.name,
					log_type: logType(event.eventName),
					params: event.eventPayload,
				}),
		},
	});
	return {
		track(event: AdMetric, context: AdMetricContext, outcome = "") {
			// An explicit projection prevents callers from leaking extra properties.
			router.track(event, {
				placement: context.placement.slice(0, 64),
				format: (context.format ?? "unknown").slice(0, 32),
				policy: (context.policy ?? "not_applicable").slice(0, 96),
				flow_id: (context.flowId ?? "").slice(0, 64),
				outcome: outcome.slice(0, 64),
			});
		},
		flush: router.flush,
	};
}
export type AdTelemetry = ReturnType<typeof createAdTelemetry>;

/** One in-memory attempt, never a persistent user/device identifier. */
export function createAdFlow(telemetry: AdTelemetry, context: AdMetricContext) {
	const identity = {
		...context,
		flowId:
			context.flowId ??
			`${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
	};
	const seen = new Set<AdMetric>();
	return {
		track(event: AdMetric, outcome = "", format?: string) {
			if (seen.has(event)) return;
			seen.add(event);
			if (format) identity.format = format;
			telemetry.track(event, identity, outcome);
		},
	};
}
export type AdFlow = ReturnType<typeof createAdFlow>;

export function adPolicyLabel(policy?: {
	counter?: string;
	firstGenerations?: number;
	minGenerations?: number;
	maxGenerations?: number;
}) {
	return policy
		? `${policy.counter ?? "server"}:${policy.firstGenerations ?? "legacy"}:${policy.minGenerations ?? "?"}-${policy.maxGenerations ?? "?"}`
		: "server:legacy";
}

function logType(event: AdMetric): "click" | "impression" | "event" {
	if (event === "requested" || event === "banner_clicked") return "click";
	if (event.endsWith("viewable") || event === "cta_viewed") return "impression";
	return "event";
}
