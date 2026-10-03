// Run in a separate Bun process: native module mocks must not leak into API tests.
import { expect, mock } from "bun:test";
import * as React from "react";
import { createContext, createElement, useContext, useEffect } from "react";
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
let unmounts = 0;
const originalTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;
const retentionTimers = new Map<unknown, () => void>();
// Deliver only the app's retention timer without waiting a minute in this
// isolated process. Other timers keep their real behavior.
globalThis.setTimeout = ((...args: Parameters<typeof setTimeout>) => {
	const timer = originalTimeout(...args);
	const callback = args[0];
	if (args[1] === 60_000 && typeof callback === "function") {
		retentionTimers.set(timer, () => {
			originalClearTimeout(timer);
			callback();
		});
	}
	return timer;
}) as typeof setTimeout;
globalThis.clearTimeout = (timer) => {
	retentionTimers.delete(timer);
	originalClearTimeout(timer);
};
const metrics: string[] = [];
const flows: string[] = [];
let onImpression = () => {};
let onViewport = (_inView: boolean, _ratio: number) => {};
let props = {
	variant: "",
	adGroupId: "",
	onAdRendered: () => {},
	onAdImpression: () => {},
	onNoFill: () => {},
	onAdViewable: () => {},
	onAdClicked: () => {},
	onAdFailedToRender: (_payload: { error: { code: number } }) => {},
};
mock.module("@granite-js/react-native", () => ({
	IOContext: io,
	useVisibility: () => visible,
	InView: ({
		onChange,
		children,
		...rest
	}: {
		onChange: typeof onViewport;
		children: React.ReactNode;
	}) => {
		onViewport = onChange;
		return createElement("viewport", rest, children);
	},
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
		useEffect(() => {
			mounts++;
			return () => {
				unmounts++;
			};
		}, []);
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
	placement:
		| "saved"
		| "generator"
		| "live_feed"
		| "insights_summary"
		| "insights_patterns",
	groupId = "group",
	rootManager: object | null = manager,
) {
	return (
		<io.Provider value={{ manager: rootManager }}>
			<Banner placement={placement} groupId={groupId} />
		</io.Provider>
	);
}
await act(async () => {
	tree().update(screen("saved"));
});
// Overscan mounts an observable placeholder, never an SDK ad request.
expect(mounts).toBe(0);
await act(async () => onViewport(true, 0.1));
expect(mounts).toBe(0);
await act(async () => onViewport(false, 0));
expect(mounts).toBe(0);
await act(async () => onViewport(true, 0.5));
expect(props.variant).toBe("card");
// Filled ads exercise the delayed path absent from no-fill-only checks.
await act(async () => {
	props.onAdRendered();
});
expect(tree().toJSON()).not.toBeNull();
expect(metrics).toEqual([
	"banner_slot_viewed",
	"banner_requested",
	"banner_rendered",
]);
await act(async () => {
	props.onAdViewable();
	props.onAdViewable();
});
expect(metrics).toEqual([
	"banner_slot_viewed",
	"banner_requested",
	"banner_rendered",
	"banner_viewable",
]);
await act(async () => {
	props.onAdImpression();
	props.onAdImpression();
});
expect(metrics.at(-1)).toBe("banner_impression");
expect(metrics.filter((m) => m === "banner_impression")).toHaveLength(1);
const mountedBeforeScroll = mounts;
await act(async () => {
	onViewport(false, 0);
	onViewport(true, 1);
});
expect(mounts).toBe(mountedBeforeScroll);
expect(metrics.filter((m) => m === "banner_requested")).toHaveLength(1);
// A short tab/app absence preserves the SDK's creative, observer and request.
for (let i = 0; i < 3; i++) {
	visible = false;
	await act(async () => tree().update(screen("saved")));
	expect(tree().toJSON()).not.toBeNull();
	expect(mounts).toBe(mountedBeforeScroll);
	expect(retentionTimers.size).toBe(1);
	await act(async () => onViewport(true, 1));
	visible = true;
	await act(async () => tree().update(screen("saved")));
	expect(retentionTimers.size).toBe(0);
	expect(mounts).toBe(mountedBeforeScroll);
}
expect(metrics.filter((m) => m === "banner_requested")).toHaveLength(1);
// SDK refresh errors retain its existing filled creative instead of making
// the slot disappear. Initial no-fill is still terminal below.
await act(async () => {
	props.onNoFill();
	props.onAdFailedToRender({ error: { code: 500 } });
});
expect(tree().toJSON()).not.toBeNull();
expect(mounts).toBe(mountedBeforeScroll);
const oldRendered = props.onAdRendered;
const oldImpression = props.onAdImpression;
const beforeExpiry = metrics.length;
const beforeUnmount = unmounts;
visible = false;
await act(async () => tree().update(screen("saved")));
expect(retentionTimers.size).toBe(1);
await act(async () => {
	for (const [timer, expire] of retentionTimers) {
		retentionTimers.delete(timer);
		expire();
	}
});
expect(tree().toJSON()).toBeNull();
expect(unmounts).toBe(beforeUnmount + 1);
oldRendered();
oldImpression();
expect(metrics.length).toBe(beforeExpiry);
// Expired slots require actual viewport entry to load again.
visible = true;
await act(async () => tree().update(screen("saved")));
expect(mounts).toBe(mountedBeforeScroll);
await act(async () => onViewport(true, 0.5));
expect(mounts).toBe(mountedBeforeScroll + 1);
expect(metrics.filter((m) => m === "banner_requested")).toHaveLength(2);
const afterReload = metrics.length;
visible = false;
await act(async () => tree().update(screen("saved")));
props.onAdViewable();
props.onAdImpression();
props.onAdClicked();
expect(metrics.length).toBe(afterReload);
// A new group cannot reuse a previous group's cache or preload while hidden.
const beforeGroup = mounts;
await act(async () => tree().update(screen("saved", "replacement")));
expect(tree().toJSON()).toBeNull();
expect(retentionTimers.size).toBe(0);
await act(async () => onViewport(true, 1));
expect(mounts).toBe(beforeGroup);
visible = true;
await act(async () => tree().update(screen("saved", "replacement")));
expect(mounts).toBe(beforeGroup);
await act(async () => onViewport(true, 1));
expect(props.adGroupId).toBe("replacement");
expect(mounts).toBe(beforeGroup + 1);
// Losing the IO root releases both a retained SDK child and its pending timer.
const beforeContextLoss = unmounts;
const lateRendered = props.onAdRendered;
visible = false;
await act(async () => tree().update(screen("saved", "replacement")));
expect(retentionTimers.size).toBe(1);
const retentionTimer = retentionTimers.keys().next().value;
await act(async () => tree().update(screen("saved", "replacement", {})));
// Context value rerenders must not extend the retention window.
expect(retentionTimers.keys().next().value).toBe(retentionTimer);
await act(async () => tree().update(screen("saved", "replacement", null)));
expect(tree().toJSON()).toBeNull();
expect(retentionTimers.size).toBe(0);
expect(unmounts).toBe(beforeContextLoss + 1);
const afterContextLoss = metrics.length;
lateRendered();
expect(metrics.length).toBe(afterContextLoss);
visible = true;
for (const placement of [
	"generator",
	"live_feed",
	"insights_patterns",
] as const) {
	await act(async () => {
		tree().update(screen(placement));
	});
	await act(async () => onViewport(true, 1));
	expect(props.variant).toBe("expanded");
}
await act(async () => {
	tree().update(screen("insights_summary"));
});
await act(async () => onViewport(true, 1));
expect(props.variant).toBe("card");
visible = false;
await act(async () => {
	tree().update(screen("saved"));
});
expect(tree().toJSON()).toBeNull();
visible = true;
await act(async () => {
	tree().update(screen("saved", "new-group"));
});
await act(async () => onViewport(true, 1));
expect(props.adGroupId).toBe("new-group");
await act(async () => {
	props.onNoFill();
});
expect(tree().toJSON()).toBeNull();
const afterNoFill = metrics.length;
props.onAdViewable();
props.onAdRendered();
expect(metrics.length).toBe(afterNoFill);
// Removing the context also removes the filled SDK child before it can crash.
await act(async () => {
	tree().update(<Banner placement="saved" groupId="new-group" />);
});
expect(tree().toJSON()).toBeNull();
await act(async () => {
	tree().unmount();
});
expect(retentionTimers.size).toBe(0);
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
