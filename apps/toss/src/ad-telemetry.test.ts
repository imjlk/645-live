import { expect, test } from "bun:test";
import {
	type AdMetricSink,
	adPolicyLabel,
	createAdFlow,
	createAdTelemetry,
} from "./ad-telemetry";

test("ad funnel distinguishes rendered/viewed, deduplicates callbacks and strips extra data", async () => {
	const events: Parameters<AdMetricSink>[0][] = [];
	const telemetry = createAdTelemetry((event) => {
		events.push(event);
	});
	const flow = createAdFlow(telemetry, {
		placement: "generation_continue",
		policy: "device:5:5-30",
		flowId: "attempt",
		...{ authToken: "secret", numbers: [1, 2, 3], userId: "private" },
	});
	flow.track("requested");
	flow.track("shown", "", "rewarded");
	flow.track("shown");
	flow.track("completed");
	flow.track("settled", "completion_retry");
	flow.track("generation_completed");
	flow.track("generation_completed");
	await telemetry.flush();
	expect(events.map((e) => e.log_name)).toEqual([
		"lotto_ad_requested",
		"lotto_ad_shown",
		"lotto_ad_completed",
		"lotto_ad_settled",
		"lotto_ad_generation_completed",
	]);
	expect(events.every((e) => e.params.flow_id === "attempt")).toBe(true);
	expect(events[4].params.format).toBe("rewarded");
	expect(JSON.stringify(events)).not.toContain("secret");
	expect(JSON.stringify(events)).not.toContain("numbers");
	telemetry.track("banner_rendered", { placement: "saved" });
	telemetry.track("banner_viewable", { placement: "saved" });
	await telemetry.flush();
	expect(events.at(-2)?.log_type).toBe("event");
	expect(events.at(-1)?.log_type).toBe("impression");
});

test("analytics bridge failures never fail the app action", async () => {
	for (const send of [
		() => {
			throw new Error("missing bridge");
		},
		async () => {
			throw new Error("offline");
		},
	]) {
		const telemetry = createAdTelemetry(send);
		expect(() =>
			telemetry.track("requested", { placement: "saved" }),
		).not.toThrow();
		await telemetry.flush();
	}
});

test("policy reflects server configuration rather than hardcoded release defaults", () => {
	expect(
		adPolicyLabel({
			counter: "device",
			firstGenerations: 5,
			minGenerations: 5,
			maxGenerations: 30,
		}),
	).toBe("device:5:5-30");
	expect(adPolicyLabel()).toBe("server:legacy");
});
