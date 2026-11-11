import { expect, test } from "bun:test";
import {
	type AdMetricSink,
	adPolicyLabel,
	bindAdMetrics,
	createAdFlow,
	createAdTelemetry,
} from "./ad-telemetry";

test("ad funnel distinguishes rendered/viewed, deduplicates callbacks and strips extra data", async () => {
	const events: Parameters<AdMetricSink>[0][] = [];
	const telemetry = createAdTelemetry((event) => {
		events.push(event);
	}, "1.4.4");
	const flow = createAdFlow(telemetry, {
		placement: "generation_continue",
		policy: "device:5:5-30",
		flowId: "attempt",
		entryPoint: "continuation",
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
	expect(events.every((e) => e.params.entry_point === "continuation")).toBe(
		true,
	);
	expect(events.every((e) => e.params.app_version === "1.4.4")).toBe(true);
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

test("experiment events share only an ephemeral session and preserve cohort labels", async () => {
	const events: Parameters<AdMetricSink>[0][] = [];
	const telemetry = createAdTelemetry((event) => {
		events.push(event);
	}, "1.6.0");
	const policy = adPolicyLabel({
		counter: "device",
		firstGenerations: 2,
		firstMaxGenerations: 5,
		minGenerations: 2,
		maxGenerations: 5,
		experiment: "generation-cadence-v1",
		variant: "short",
	});
	telemetry.track("experiment_exposed", {
		placement: "generation_continue",
		policy,
	});
	telemetry.track("generation_succeeded", {
		placement: "generation_continue",
		policy,
	});
	await telemetry.flush();
	expect(events[0].params.session_id).toBeTruthy();
	expect(events[0].params.session_id).toBe(events[1].params.session_id);
	expect(events[0].params.policy).toBe(
		"generation-cadence-v1/short:device:2-5:2-5",
	);
});

test("private metrics mirror is bounded to experiment events and retains IDs across retries", async () => {
	const batches: string[][] = [];
	let fail = true;
	const mirror = bindAdMetrics(async (events) => {
		batches.push(events.map((e) => e.eventPayload.event_id));
		if (fail) throw Error("offline");
	});
	try {
		const telemetry = createAdTelemetry(() => {
			throw Error("SDK unavailable");
		});
		telemetry.track("experiment_exposed", {
			placement: "generation_continue",
			policy: "generation-cadence-v3/control:device:3-3:3-12",
		});
		for (const policy of [
			"generation-cadence-v4/control:device:1-3:2-8",
			"generation-cadence-v4/short:device:1-3:2-5",
			"generation-cadence-v40/control:device:1-3:2-8",
		]) {
			telemetry.track("experiment_exposed", {
				placement: "generation_continue",
				policy,
			});
		}

		telemetry.track("banner_rendered", { placement: "saved" });
		await telemetry.flush();
		await mirror.flush();
		fail = false;
		await mirror.flush();
		expect(batches).toHaveLength(2);
		expect(batches[0]).toHaveLength(3);
		expect(batches[1]).toEqual(batches[0]);
	} finally {
		mirror.dispose();
	}
});

test("disabling the server mirror keeps SDK analytics independent and sends no server batch", async () => {
	let server = 0;
	const sdk: string[] = [];
	const mirror = bindAdMetrics(async () => {
		server++;
	}, false);
	try {
		const telemetry = createAdTelemetry((e) => {
			sdk.push(e.log_name);
		});
		telemetry.track("generation_succeeded", {
			placement: "generation_continue",
			policy: "generation-cadence-v4/control:device:1-3:2-8",
		});
		await telemetry.flush();
		await mirror.flush();
		expect(server).toBe(0);
		expect(sdk).toEqual(["lotto_ad_generation_succeeded"]);
	} finally {
		mirror.dispose();
	}
});

test("purchase metrics mirror separately from ad policy and never carry order receipts", async () => {
	const batches: string[] = [];
	const mirror = bindAdMetrics(async (events) => {
		batches.push(...events.map((e) => e.eventName));
	});
	try {
		const t = createAdTelemetry(() => {});
		t.track("purchase_entered", {
			placement: "ad_free_purchase",
			policy: "purchase-v1",
			flowId: "p",
			format: "non_consumable",
		});
		t.track(
			"purchase_succeeded",
			{
				placement: "ad_free_purchase",
				policy: "purchase-v1",
				flowId: "p",
				format: "non_consumable",
			},
			"verified",
		);
		await t.flush();
		await mirror.flush();
		expect(batches).toEqual(["purchase_entered", "purchase_succeeded"]);
	} finally {
		mirror.dispose();
	}
});

test("journey flow keeps ticket and purchased generation separate from SDK ad completion", async () => {
	const names: string[] = [];
	const mirror = bindAdMetrics(async (events) => {
		names.push(...events.map((e) => e.eventName));
	});
	try {
		const t = createAdTelemetry(() => {});
		const flow = createAdFlow(t, {
			placement: "app_journey",
			policy: "journey-v1",
			format: "product",
			entryPoint: "generator",
		});
		flow.track("journey_generation_started", "ticket");
		flow.track("journey_ticket_selected");
		flow.track("journey_ticket_redeemed", "ticket");
		flow.track("journey_generation_finished", "ticket");
		flow.track("journey_generation_finished", "ticket");
		await t.flush();
		await mirror.flush();
		expect(names).toEqual([
			"journey_generation_started",
			"journey_ticket_selected",
			"journey_ticket_redeemed",
			"journey_generation_finished",
		]);
		expect(names).not.toContain("completed");
	} finally {
		mirror.dispose();
	}
});
