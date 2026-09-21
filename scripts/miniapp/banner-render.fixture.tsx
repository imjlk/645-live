// Run in a separate Bun process: native module mocks must not leak into API tests.
import { expect, mock } from "bun:test";
import * as React from "react";
import { createContext, createElement, useContext } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// A hoisted renderer and app-local React must share one dispatcher in this harness.
mock.module(
	Bun.resolveSync("react", `${import.meta.dir}/../../apps/toss`),
	() => React,
);
const io = createContext<{ manager: object | null }>({ manager: null });
let visible = true;
let mounts = 0;
const metrics: string[] = [];
const flows: string[] = [];
let onImpression = () => {};
let props = {
	variant: "",
	adGroupId: "",
	onAdRendered: () => {},
	onNoFill: () => {},
	onAdViewable: () => {},
};
mock.module("@granite-js/react-native", () => ({
	IOContext: io,
	useVisibility: () => visible,
	ImpressionArea: ({
		onImpressionStart,
		children,
	}: {
		onImpressionStart: () => void;
		children: React.ReactNode;
	}) => {
		onImpression = onImpressionStart;
		return children;
	},
}));
mock.module("@apps-in-toss/framework", () => ({
	InlineAd: (value: typeof props) => {
		if (!useContext(io).manager) throw new Error("Missing native IO context");
		mounts++;
		props = value;
		return createElement("native-ad", { variant: value.variant });
	},
	getOperationalEnvironment: () => "toss",
	isMinVersionSupported: () => true,
}));
mock.module("@trailbase-apps-in-toss-kit/ait-rn/inline-ads", () => ({
	isAppsInTossInlineAdSupported: async () => true,
}));
mock.module("react-native", () => ({
	View: "view",
	Text: "text",
	StyleSheet: { create: (value: unknown) => value },
}));
mock.module("../../apps/toss/src/telemetry", () => ({
	adTelemetry: {
		track: (event: string, context: { flowId: string }) => {
			metrics.push(event);
			flows.push(context.flowId);
		},
	},
}));
mock.module("../../apps/toss/src/api", () => ({ LOCAL_PREVIEW: false }));
mock.module("../../apps/toss/src/theme", () => ({ useTheme: () => ({}) }));
const { Banner } = await import("../../apps/toss/src/Banner");
let root: ReactTestRenderer | undefined;
function tree() {
	if (!root) throw new Error("Renderer not initialized");
	return root;
}
await act(async () => {
	root = create(<Banner placement="saved" groupId="card" />);
});
expect(tree().toJSON()).toBeNull();
expect(mounts).toBe(0);
const manager = {};
function screen(
	placement: "saved" | "generator" | "live_feed",
	groupId = "group",
) {
	return (
		<io.Provider value={{ manager }}>
			<Banner placement={placement} groupId={groupId} />
		</io.Provider>
	);
}
await act(async () => {
	tree().update(screen("saved"));
});
expect(props.variant).toBe("card");
// Filled ads exercise the delayed path absent from no-fill-only checks.
await act(async () => {
	props.onAdRendered();
});
expect(tree().toJSON()).not.toBeNull();
expect(metrics).toEqual(["banner_rendered"]);
await act(async () => {
	props.onAdViewable();
	props.onAdViewable();
});
expect(metrics).toEqual(["banner_rendered", "banner_viewable"]);
for (const placement of ["generator", "live_feed"] as const) {
	await act(async () => {
		tree().update(screen(placement));
	});
	expect(props.variant).toBe("expanded");
}
visible = false;
await act(async () => {
	tree().update(screen("saved"));
});
expect(tree().toJSON()).toBeNull();
visible = true;
await act(async () => {
	tree().update(screen("saved", "new-group"));
});
expect(props.adGroupId).toBe("new-group");
await act(async () => {
	props.onNoFill();
});
// Removing the context also removes the filled SDK child before it can crash.
await act(async () => {
	tree().update(<Banner placement="saved" groupId="new-group" />);
});
expect(tree().toJSON()).toBeNull();
await act(async () => {
	tree().unmount();
});
const before = metrics.length;
props.onAdViewable();
expect(metrics.length).toBe(before);
const { AdCtaImpression } = await import("../../apps/toss/src/AdCtaImpression");
type Run = (
	action: (
		flow: import("../../apps/toss/src/ad-telemetry").AdFlow | undefined,
	) => Promise<unknown>,
) => Promise<unknown>;
let run: Run = async () => {
	throw new Error("CTA not initialized");
};
function cta(enabled = true, policy = "device:5:5-30") {
	return (
		<AdCtaImpression enabled={enabled} policy={policy}>
			{(next) => {
				run = next;
				return null;
			}}
		</AdCtaImpression>
	);
}
await act(async () => {
	root = create(cta());
});
const firstImpression = onImpression;
firstImpression();
const firstId = flows.at(-1);
expect(typeof firstId).toBe("string");
expect(firstId?.length).toBeGreaterThan(0);
let release: () => void = () => {};
const gate = new Promise<void>((resolve) => {
	release = resolve;
});
const firstRun = run;
let firstPromise: Promise<unknown>;
await act(async () => {
	firstPromise = run(async (flow) => {
		flow?.track("requested");
		await gate;
		flow?.track("failed", "AD_LOAD_FAILED");
		return false;
	});
	await run(async () => {
		throw new Error("overlapping tap ran twice");
	});
});
await act(async () => {
	release();
	await firstPromise;
});
expect(metrics.slice(-3)).toEqual(["cta_viewed", "requested", "failed"]);
expect(new Set(flows.slice(-3)).size).toBe(1);
const beforeRetry = metrics.length;
// Old native callbacks/press handlers cannot write into a settled attempt.
firstImpression();
await firstRun(async () => {
	throw new Error("settled handler ran twice");
});
expect(metrics.length).toBe(beforeRetry);
// Rotation itself must not fabricate a view; wait for the new observer callback.
onImpression();
const retryId = flows.at(-1);
expect(retryId).not.toBe(firstId);
await act(async () => {
	await run(async (flow) => {
		flow?.track("requested");
		flow?.track("generation_completed");
	});
});
expect(metrics.slice(-3)).toEqual([
	"cta_viewed",
	"requested",
	"generation_completed",
]);
expect(flows.slice(-3)).toEqual([retryId, retryId, retryId]);
// Rejecting actions also rotate, with no success attributed to that attempt.
onImpression();
const rejectedId = flows.at(-1);
await act(async () => {
	await expect(
		run(async (flow) => {
			flow?.track("requested");
			throw new Error("offline");
		}),
	).rejects.toThrow("offline");
});
onImpression();
expect(flows.at(-1)).not.toBe(rejectedId);
// A policy change or unmount during an action must not reset a newer observer.
let finish: () => void = () => {};
const waiting = new Promise<void>((resolve) => {
	finish = resolve;
});
let late: Promise<unknown>;
await act(async () => {
	late = run(async () => waiting);
	tree().update(cta(true, "device:5:10-50"));
});
onImpression();
const newPolicyId = flows.at(-1);
await act(async () => {
	finish();
	await late;
});
onImpression();
expect(flows.at(-1)).toBe(newPolicyId);
await act(async () => {
	tree().update(cta(false));
});
let received = false;
await run(async (flow) => {
	expect(flow).toBeUndefined();
	received = true;
});
expect(received).toBe(true);
await act(async () => {
	tree().unmount();
});
console.log("banner placement lifecycle passed");
