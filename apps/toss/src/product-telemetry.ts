export type ProductEvent =
	| "generation_started"
	| "generation_succeeded"
	| "generation_failed"
	| "combination_saved"
	| "recent_restored"
	| "saved_results_viewed"
	| "notification_prompt_viewed"
	| "notification_prompt_accepted"
	| "notification_prompt_dismissed"
	| "notification_enabled"
	| "notification_disabled"
	| "attendance_completed";
export function createProductTelemetry(
	send: (event: {
		log_name: string;
		log_type: "event";
		params: { source: string };
	}) => unknown,
) {
	return (event: ProductEvent, source = "app") => {
		try {
			void Promise.resolve(
				send({
					log_name: `lotto_${event}`,
					log_type: "event",
					params: { source: source.slice(0, 48) },
				}),
			).catch(() => {});
		} catch {
			/* Metrics must never interrupt the user action. */
		}
	};
}
