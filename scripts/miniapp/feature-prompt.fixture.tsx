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
const { FeatureAccessPrompt } = await import(
	"../../apps/toss/src/FeatureAccessPrompt"
);
let root: ReactTestRenderer;
const action = mock(() => {}),
	onDone = mock(() => {}),
	watch = mock(async () => true);
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
await act(async () => {
	back?.();
});
dialog = root.root.findByType("dialog");
await act(async () => {
	dialog.props.onExited();
});
expect(watch).toHaveBeenCalledTimes(1);
expect(action).toHaveBeenCalledTimes(1);
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
console.log("feature continuation ordering and cancellation passed");
