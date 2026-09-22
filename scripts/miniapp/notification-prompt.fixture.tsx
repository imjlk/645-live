import { expect, mock } from "bun:test";
import * as React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
mock.module(
	Bun.resolveSync("react", `${import.meta.dir}/../../apps/toss`),
	() => React,
);
const Dialog = Object.assign(
	(props: Record<string, unknown>) => React.createElement("dialog", props),
	{ Button: "button" },
);
mock.module("@toss/tds-react-native", () => ({ ConfirmDialog: Dialog }));
const notify = mock(async () => true);
const events: string[] = [];
mock.module("../../apps/toss/src/telemetry", () => ({
	trackProduct: (event: string) => events.push(event),
}));
let prompt = true;
let back: (() => void) | null = null;
let release = 0;
const presentOverlay = (onBack: () => void) => {
	back = onBack;
	return () => {
		back = null;
		release++;
	};
};
mock.module("../../apps/toss/src/TabShell", () => ({
	useTabShell: () => ({ presentOverlay }),
}));
mock.module("../../apps/toss/src/LottoProvider", () => ({
	useLottoContext: () => ({
		model: {
			notificationPrompt: prompt,
			busy: null,
			notifications: notify,
			dismissNotificationPrompt: () => {
				prompt = false;
			},
		},
	}),
}));
const { ResultNotificationPrompt } = await import(
	"../../apps/toss/src/ResultNotificationPrompt"
);
let root: ReactTestRenderer;
await act(async () => {
	root = create(<ResultNotificationPrompt />);
});
let dialog = root.root.findByType("dialog");
expect(dialog.props.open).toBe(true);
await act(async () => {
	dialog.props.rightButton.props.onPress();
	dialog.props.rightButton.props.onPress();
	dialog.props.onClose();
	root.update(<ResultNotificationPrompt />);
});
expect(notify).not.toHaveBeenCalled();
dialog = root.root.findByType("dialog");
expect(dialog.props.open).toBe(false);
await act(async () => {
	dialog.props.onExited();
});
expect(notify).toHaveBeenCalledTimes(1);
expect(notify).toHaveBeenCalledWith(true);
expect(events.filter((e) => e === "notification_prompt_accepted")).toHaveLength(
	1,
);
expect(
	events.filter((e) => e === "notification_prompt_dismissed"),
).toHaveLength(0);
expect(release).toBe(1);
await act(async () => {
	root.update(<ResultNotificationPrompt />);
});
expect(root.toJSON()).toBeNull();
await act(async () => {
	root.unmount();
});
prompt = true;
await act(async () => {
	root = create(<ResultNotificationPrompt />);
});
await act(async () => {
	back?.();
	back?.();
});
dialog = root.root.findByType("dialog");
await act(async () => {
	dialog.props.onExited();
});
expect(notify).toHaveBeenCalledTimes(1);
expect(
	events.filter((e) => e === "notification_prompt_dismissed"),
).toHaveLength(1);
await act(async () => {
	root.unmount();
});
expect(back).toBeNull();
console.log("notification prompt consent ordering passed");
