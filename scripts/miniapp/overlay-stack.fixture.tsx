import { expect, mock } from "bun:test";
import * as React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
mock.module(
	Bun.resolveSync("react", `${import.meta.dir}/../../apps/toss`),
	() => React,
);
const { useOverlayStack } = await import("../../apps/toss/src/TabShell");
let stack: ReturnType<typeof useOverlayStack>;
function Probe() {
	stack = useOverlayStack();
	return null;
}
let root: ReactTestRenderer;
let closeSheet: () => void;
let closeDialog: () => void;
const sheetBack = mock(() => {});
const dialogBack = mock(() => {});
await act(async () => {
	root = create(<Probe />);
});
await act(async () => {
	closeSheet = stack.presentOverlay(sheetBack);
	closeDialog = stack.presentOverlay(dialogBack);
});
stack.overlay?.onBack();
expect(dialogBack).toHaveBeenCalledTimes(1);
await act(async () => {
	closeDialog();
});
expect(stack.overlay?.onBack).toBe(sheetBack);
stack.overlay?.onBack();
expect(sheetBack).toHaveBeenCalledTimes(1);
await act(async () => {
	closeDialog();
});
expect(stack.overlay?.onBack).toBe(sheetBack);
await act(async () => {
	closeDialog = stack.presentOverlay(dialogBack);
	closeSheet();
});
expect(stack.overlay?.onBack).toBe(dialogBack);
await act(async () => {
	closeDialog();
});
expect(stack.overlay).toBeNull();
await act(async () => {
	root.unmount();
});
console.log("overlay ownership survives nested and out-of-order cleanup");
