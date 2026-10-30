import {
	type AnalyticsEvent,
	createAnalyticsRouter,
	createBufferedAnalyticsSink,
} from "@trailbase-apps-in-toss-kit/ait-rn/analytics";

export type AdMetric =
	| "experiment_exposed"
	| "generation_attempted"
	| "generation_succeeded"
	| "session_started"
	| "cta_viewed"
	| "requested"
	| "shown"
	| "viewable"
	| "completed"
	| "unavailable"
	| "failed"
	| "settled"
	| "feature_outcome"
	| "generation_completed"
	| "banner_slot_viewed"
	| "banner_requested"
	| "banner_impression"
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
	entryPoint?: string;
};
export type AdMetricPayload = {
	placement: string;
	format: string;
	policy: string;
	flow_id: string;
	outcome: string;
	entry_point: string;
	app_version: string;
	session_id: string;
	event_id: string;
};
export type AdMetricSink = (event: {
	log_name: string;
	log_type: "event" | "click" | "impression";
	params: AdMetricPayload;
}) => void | Promise<void>;

/** No identities, generated numbers, server tokens, or raw error payloads. */
export function createAdTelemetry(send: AdMetricSink, appVersion = "unknown") {
	const sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
	let sequence = 0;
	const router = createAnalyticsRouter<AdMetric, AdMetricPayload>({
		detail: { enabled: true, enqueueBatch: (events) => detailSink?.(events) },
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
				entry_point: (context.entryPoint ?? "continuation").slice(0, 32),
				app_version: appVersion.slice(0, 24),
				session_id: sessionId,
				event_id: `${sessionId}-${++sequence}`,
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
	firstMaxGenerations?: number;
	experiment?: string;
	variant?: string;
	minGenerations?: number;
	maxGenerations?: number;
}) {
	return policy
		? `${policy.experiment ? `${policy.experiment}/${policy.variant}:` : ""}${policy.counter ?? "server"}:${policy.firstGenerations ?? "legacy"}${policy.firstMaxGenerations ? `-${policy.firstMaxGenerations}` : ""}:${policy.minGenerations ?? "?"}-${policy.maxGenerations ?? "?"}`
		: "server:legacy";
}

function logType(event: AdMetric): "click" | "impression" | "event" {
	if (event === "requested" || event === "banner_clicked") return "click";
	if (
		event.endsWith("viewable") ||
		event.endsWith("_viewed") ||
		event === "banner_impression"
	)
		return "impression";
	return "event";
}

let detailSink:
	| ((
			events: Array<AnalyticsEvent<AdMetric, AdMetricPayload>>,
	  ) => void | Promise<void>)
	| undefined;
export function bindAdMetrics(
	send: (
		events: Array<AnalyticsEvent<AdMetric, AdMetricPayload>>,
	) => Promise<unknown>,
) {
	const sink = createBufferedAnalyticsSink<AdMetric, AdMetricPayload>({
		maxBatchSize: 20,
		maxQueueSize: 100,
		flushIntervalMs: 2000,
		enqueueBatch: async (events) => {
			await send(events);
		},
	});
	const forward = (events: Array<AnalyticsEvent<AdMetric, AdMetricPayload>>) =>
		sink.enqueueBatch(
			events.filter(
				(e) =>
					e.eventPayload.placement === "generation_continue" &&
					e.eventPayload.policy.startsWith("generation-cadence-v2/"),
			),
			{ sink: "detail" },
		);
	detailSink = forward;
	return {
		flush: () => sink.flush().catch(() => {}),
		dispose: () => {
			if (detailSink === forward) detailSink = undefined;
			sink.clear();
		},
	};
}
