export type ProductEvent =
	| "generation_started"
	| "generation_succeeded"
	| "generation_failed"
	| "combination_saved"
	| "saved_results_viewed"
	| "notification_prompt_viewed"
	| "notification_prompt_accepted"
	| "notification_prompt_dismissed"
	| "notification_enabled"
	| "notification_disabled"
	| "attendance_completed"
	| "insights_viewed"
	| "insights_detail_viewed"
	| "insights_patterns_viewed"
	| "results_return_opened"
	| "notification_result_opened"
	| "saved_comparison_viewed";
export function createProductTelemetry(
	send: (event: {
		log_name: string;
		log_type: "event";
		params: { source: string; app_version: string };
	}) => unknown,
	appVersion = "unknown",
) {
	return (event: ProductEvent, source = "app") => {
		try {
			void Promise.resolve(
				send({
					log_name: `lotto_${event}`,
					log_type: "event",
					params: {
						source: source.slice(0, 48),
						app_version: appVersion.slice(0, 24),
					},
				}),
			).catch(() => {});
		} catch {
			/* Metrics must never interrupt the user action. */
		}
	};
}
