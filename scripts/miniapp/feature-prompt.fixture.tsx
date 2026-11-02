import { expect, mock } from "bun:test";
import * as React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import type { AdFlow } from "../../apps/toss/src/ad-telemetry";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
mock.module(
	Bun.resolveSync("react", `${import.meta.dir}/../../apps/toss`),
	() => React,
);
const Dialog = Object.assign(
	(props: Record<string, unknown>) =>
		React.createElement("dialog", props, props.content as React.ReactNode),
	{ Button: "button" },
);
mock.module("@toss/tds-react-native", () => ({
	ConfirmDialog: Dialog,
	Button: "ticket",
}));
mock.module("react-native", () => ({ View: "view", Text: "text" }));
mock.module("../../apps/toss/src/theme", () => ({
	useTheme: () => ({ muted: "#999" }),
}));
let back: (() => void) | null = null,
	releases = 0;
const presentOverlay = (close: () => void) => {
	back = close;
	return () => {
		back = null;
		releases++;
	};
};
mock.module("../../apps/toss/src/TabShell", () => ({
	useTabShell: () => ({ presentOverlay }),
}));
const metrics: {
	event: string;
	id?: string;
	outcome: string;
	entryPoint?: string;
}[] = [];
mock.module("../../apps/toss/src/telemetry", () => ({
	adTelemetry: {
		track(
			event: string,
			context: { flowId?: string; entryPoint?: string },
			outcome = "",
		) {
			metrics.push({
				event,
				id: context.flowId,
				outcome,
				entryPoint: context.entryPoint,
			});
		},
	},
}));
const { FeatureAccessPrompt } = await import(
	"../../apps/toss/src/FeatureAccessPrompt"
);
let root: ReactTestRenderer;
const action = mock(() => {}),
	onDone = mock(() => {}),
	watch = mock(async (_feature: string, flow?: AdFlow) => {
		flow?.track("requested");
		flow?.track("settled", "ad_completed");
		return true;
	});
const request = { feature: "report" as const, action };
await act(async () => {
	root = create(
		<FeatureAccessPrompt
			request={request}
			continueFeature={watch}
			onDone={onDone}
		/>,
	);
});
let dialog = root.root.findByType("dialog");
expect(metrics).toEqual([]);
await act(async () => {
	dialog.props.onEntered();
	dialog.props.onEntered();
});
expect(metrics.map((m) => m.event)).toEqual(["cta_viewed"]);
const firstId = metrics[0].id;
await act(async () => {
	dialog.props.rightButton.props.onPress();
	dialog.props.rightButton.props.onPress();
	dialog.props.onClose();
});
expect(watch).not.toHaveBeenCalled();
expect(action).not.toHaveBeenCalled();
await act(async () => {
	dialog.props.onExited();
	dialog.props.onExited();
});
expect(watch).toHaveBeenCalledTimes(1);
expect(action).toHaveBeenCalledTimes(1);
expect(onDone).toHaveBeenCalledTimes(1);
expect(metrics.filter((m) => m.event === "requested")).toHaveLength(1);
expect(metrics.find((m) => m.event === "requested")?.id).toBe(firstId);
expect(metrics.find((m) => m.event === "feature_outcome")?.outcome).toBe(
	"feature_continued",
);
expect(metrics.find((m) => m.event === "feature_outcome")?.id).toBe(firstId);
expect(
	metrics.filter((m) => m.event === "settled" && m.id === firstId),
).toHaveLength(1);
await act(async () => {
	root.unmount();
});
expect(back).toBeNull();
await act(async () => {
	root = create(
		<FeatureAccessPrompt
			request={request}
			continueFeature={watch}
			onDone={onDone}
		/>,
	);
});
dialog = root.root.findByType("dialog");
await act(async () => {
	dialog.props.onEntered();
});
const secondId = metrics.filter((m) => m.event === "cta_viewed").at(-1)?.id;
expect(secondId).not.toBe(firstId);
await act(async () => {
	back?.();
});
dialog = root.root.findByType("dialog");
await act(async () => {
	dialog.props.onExited();
});
expect(watch).toHaveBeenCalledTimes(1);
expect(action).toHaveBeenCalledTimes(1);
expect(metrics.filter((m) => m.event === "requested")).toHaveLength(1);
expect(metrics.find((m) => m.outcome === "declined")?.id).toBe(secondId);
await act(async () => {
	root.unmount();
});
let settle!: (ok: boolean) => void;
const delayed = mock(
	() =>
		new Promise<boolean>((r) => {
			settle = r;
		}),
);
await act(async () => {
	root = create(
		<FeatureAccessPrompt
			request={request}
			continueFeature={delayed}
			onDone={onDone}
		/>,
	);
});
dialog = root.root.findByType("dialog");
await act(async () => {
	dialog.props.rightButton.props.onPress();
	dialog.props.onExited();
});
await act(async () => {
	root.unmount();
});
await act(async () => {
	settle(true);
});
expect(action).toHaveBeenCalledTimes(1);
expect(onDone).toHaveBeenCalledTimes(2);
expect(releases).toBe(3);
expect(back).toBeNull();
const beforeHidden = metrics.length;
await act(async () => {
	root = create(
		<FeatureAccessPrompt
			request={request}
			continueFeature={watch}
			onDone={onDone}
		/>,
	);
});
await act(async () => {
	root.unmount();
});
expect(metrics.slice(beforeHidden).map((m) => [m.event, m.outcome])).toEqual([
	["settled", "prompt_canceled"],
]);
expect(metrics.filter((m) => m.event === "cta_viewed")).toHaveLength(2);
expect(watch).toHaveBeenCalledTimes(1);
const beforeFailed = metrics.length;
await act(async () => {
	root = create(
		<FeatureAccessPrompt
			request={request}
			continueFeature={async () => false}
			onDone={onDone}
		/>,
	);
});
dialog = root.root.findByType("dialog");
await act(async () => {
	dialog.props.onEntered();
	dialog.props.rightButton.props.onPress();
	dialog.props.onExited();
});
expect(metrics.slice(beforeFailed).map((m) => [m.event, m.outcome])).toEqual([
	["cta_viewed", ""],
	["settled", "feature_failed"],
	["feature_outcome", "feature_failed"],
]);
expect(action).toHaveBeenCalledTimes(1);
await act(async () => {
	root.unmount();
});
// A ticket replaces the ad entirely and is never offered without a balance.
const choice = (balance: number | null) => () => ({
	adEnabled: true,
	balance,
	reason: balance ? null : ("empty" as const),
	showTicket: true,
	ticketEnabled: !!balance,
});
const ticket = mock(async () => true);
const beforeTicket = metrics.length;
await act(async () => {
	root = create(
		<FeatureAccessPrompt
			request={request}
			continueFeature={watch}
			continueWithTicket={ticket}
			ticketChoice={choice(2)}
			onDone={onDone}
		/>,
	);
});
dialog = root.root.findByType("dialog");
const option = root.root.findByType("ticket");
expect(option.props.disabled).toBe(false);
await act(async () => {
	option.props.onPress();
	dialog.props.onClose();
});
expect(ticket).not.toHaveBeenCalled();
await act(async () => {
	dialog.props.onExited();
	dialog.props.onExited();
});
expect(ticket).toHaveBeenCalledTimes(1);
expect(watch).toHaveBeenCalledTimes(1);
expect(action).toHaveBeenCalledTimes(2);
expect(
	metrics
		.slice(beforeTicket)
		.filter((m) => m.event === "requested" || m.event === "shown"),
).toEqual([]);
expect(
	metrics.slice(beforeTicket).find((m) => m.event === "settled")?.outcome,
).toBe("ad_skip_ticket");
await act(async () => {
	root.unmount();
});
await act(async () => {
	root = create(
		<FeatureAccessPrompt
			request={request}
			continueFeature={watch}
			continueWithTicket={ticket}
			ticketChoice={choice(0)}
			onDone={onDone}
		/>,
	);
});
expect(root.root.findByType("ticket").props.disabled).toBe(true);
await act(async () => {
	root.unmount();
});
console.log("feature continuation ordering and cancellation passed");
