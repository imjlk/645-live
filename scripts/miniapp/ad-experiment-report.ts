import { readFileSync } from "node:fs";

export type ExperimentEvent = {
	timestampMs: number;
	log_name: string;
	params: {
		policy: string;
		session_id: string;
		flow_id?: string;
		app_version: string;
	};
};
const PREFIX = "generation-cadence-v1/";
/** An export must include complete event coverage through asOf, including the follow-up window. */
export function summarizeExperiment(
	events: ExperimentEvent[],
	version: string,
	asOf: number,
	windowMs = 300_000,
) {
	return ["control", "short"].map((variant) => {
		const rows = events.filter(
			(e) =>
				e.params.app_version === version &&
				e.params.policy.startsWith(`${PREFIX}${variant}:`) &&
				Number.isFinite(e.timestampMs) &&
				e.timestampMs <= asOf,
		);
		const exposures = new Map<string, number>();
		const views = new Map<string, ExperimentEvent>();
		for (const e of rows) {
			if (e.log_name === "lotto_ad_experiment_exposed" && e.params.session_id)
				exposures.set(
					e.params.session_id,
					Math.min(
						exposures.get(e.params.session_id) ?? Infinity,
						e.timestampMs,
					),
				);
			if (
				e.log_name === "lotto_ad_cta_viewed" &&
				e.params.flow_id &&
				e.params.session_id
			) {
				const key = `${e.params.session_id}/${e.params.flow_id}`;
				if ((views.get(key)?.timestampMs ?? Infinity) > e.timestampMs)
					views.set(key, e);
			}
		}
		const mature = [...views.values()].filter(
			(e) =>
				e.timestampMs + windowMs <= asOf && exposures.has(e.params.session_id),
		);
		const outcomes = (view: ExperimentEvent, name: string) =>
			rows.some(
				(e) =>
					e.log_name === name &&
					e.params.session_id === view.params.session_id &&
					e.params.flow_id === view.params.flow_id &&
					e.timestampMs >= view.timestampMs &&
					e.timestampMs <= view.timestampMs + windowMs,
			);
		const resumed = mature.filter((e) =>
			outcomes(e, "lotto_ad_generation_completed"),
		).length;
		const sessions = [...exposures].filter(([, t]) => t + windowMs <= asOf);
		const generated = sessions.reduce(
			(sum, [id, start]) =>
				sum +
				rows.filter(
					(e) =>
						e.params.session_id === id &&
						e.log_name === "lotto_ad_generation_succeeded" &&
						e.timestampMs >= start &&
						e.timestampMs <= start + windowMs,
				).length,
			0,
		);
		return {
			variant,
			version,
			windowMinutes: windowMs / 60000,
			exposedSessions: sessions.length,
			matureCtaAttempts: mature.length,
			resumedAttempts: resumed,
			ctaNonContinuationRate: mature.length
				? (mature.length - resumed) / mature.length
				: null,
			unavailableAttempts: mature.filter((e) =>
				outcomes(e, "lotto_ad_unavailable"),
			).length,
			failedAttempts: mature.filter((e) => outcomes(e, "lotto_ad_failed"))
				.length,
			generationsPerExposedSession: sessions.length
				? generated / sessions.length
				: null,
		};
	});
}
if (import.meta.main) {
	const [file, version, asOfText] = process.argv.slice(2);
	if (!file || !version || !asOfText)
		throw Error(
			"Usage: bun scripts/miniapp/ad-experiment-report.ts events.jsonl APP_VERSION EXPORT_COMPLETE_THROUGH_ISO",
		);
	const asOf = Date.parse(asOfText);
	if (!Number.isFinite(asOf))
		throw Error("A valid export coverage cutoff is required");
	const rows = readFileSync(file, "utf8")
		.split(/\r?\n/)
		.filter(Boolean)
		.map((line) => JSON.parse(line) as ExperimentEvent);
	console.log(
		JSON.stringify(summarizeExperiment(rows, version, asOf), null, 2),
	);
}
