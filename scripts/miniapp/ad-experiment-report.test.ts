import { expect, test } from "bun:test";
import {
	type ExperimentEvent,
	summarizeExperiment,
} from "./ad-experiment-report";

const event = (
	name: string,
	time: number,
	session = "s",
	flow = "f",
	variant = "short",
): ExperimentEvent => ({
	timestampMs: time,
	log_name: `lotto_ad_${name}`,
	params: {
		policy: `generation-cadence-v2/${variant}:device:1-3:2-8`,
		session_id: session,
		flow_id: flow,
		app_version: "test",
	},
});
test("matures windows, deduplicates CTA views, excludes other sessions, and separates no fill", () => {
	const events = [
		event("experiment_exposed", 0),
		event("cta_viewed", 10),
		event("cta_viewed", 10),
		event("generation_completed", 20, "other"),
		event("unavailable", 20),
		event("generation_succeeded", 30),
		event("cta_viewed", 399999, "s", "recent"),
	];
	const result = summarizeExperiment(events, "test", 400000)[1];
	expect(result.matureCtaAttempts).toBe(1);
	expect(result.resumedAttempts).toBe(0);
	expect(result.unavailableAttempts).toBe(1);
	expect(result.generationsPerExposedSession).toBe(1);
	events.push(event("generation_completed", 40));
	expect(
		summarizeExperiment(events, "test", 400000)[1].ctaNonContinuationRate,
	).toBe(0);
	expect(
		summarizeExperiment(events, "different", 400000)[1].ctaNonContinuationRate,
	).toBeNull();
});

test("immediate taps count without viewport events and do not double count a later view", () => {
	const events = [
		event("experiment_exposed", 0),
		event("requested", 10),
		event("cta_viewed", 20),
		event("generation_completed", 30),
	];
	const result = summarizeExperiment(events, "test", 400000)[1];
	expect(result.matureCtaAttempts).toBe(1);
	expect(result.resumedAttempts).toBe(1);
	expect(
		summarizeExperiment(
			events.filter((e) => e.log_name !== "lotto_ad_cta_viewed"),
			"test",
			400000,
		)[1].resumedAttempts,
	).toBe(1);
	expect(summarizeExperiment(events, "test", 200000)[1].matureCtaAttempts).toBe(
		0,
	);
});

test("new phase reports separately and rejects mixed phases within one version", () => {
	const old = event("experiment_exposed", 0);
	const next = {
		...old,
		params: {
			...old.params,
			policy: "generation-cadence-v3/short:device:1-3:2-8",
		},
	};
	expect(summarizeExperiment([next], "test", 400000)[1].experiment).toBe(
		"generation-cadence-v3",
	);
	expect(() => summarizeExperiment([old, next], "test", 400000)).toThrow(
		"Separate experiment phases",
	);
});
