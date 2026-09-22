import { expect, mock } from "bun:test";
import { EMPTY_OPTIONS } from "@645/lotto-core";
import * as React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
mock.module(
	Bun.resolveSync("react", `${import.meta.dir}/../../apps/toss`),
	() => React,
);
const write = mock(async () => {});
let resolveRead: (value: unknown) => void = () => {};
const preferences = {
	read: () =>
		new Promise((resolve) => {
			resolveRead = resolve;
		}),
	write,
};
mock.module("../../apps/toss/src/use-lotto", () => ({
	useLotto: () => ({ preferences }),
}));
const { LottoProvider, useLottoContext } = await import(
	"../../apps/toss/src/LottoProvider"
);
let context: ReturnType<typeof useLottoContext>;
function Probe() {
	context = useLottoContext();
	return null;
}
let root: ReactTestRenderer;
await act(async () => {
	root = create(
		<LottoProvider>
			<Probe />
		</LottoProvider>,
	);
});
await act(async () => {
	resolveRead({ options: EMPTY_OPTIONS, liveColumns: 5 });
});
expect(write).not.toHaveBeenCalled();
await act(async () => {
	context.setLiveColumns(9);
});
expect(write).toHaveBeenLastCalledWith({
	liveColumns: 9,
});
await act(async () => {
	root.unmount();
});
write.mockClear();
await act(async () => {
	root = create(
		<LottoProvider>
			<Probe />
		</LottoProvider>,
	);
});
await act(async () => {
	context.setLiveColumns(9);
});
await act(async () => {
	resolveRead({
		options: { fixed: [7], excluded: [], oddCount: null },
		liveColumns: 5,
	});
});
expect(context.liveColumns).toBe(9);
expect(context.options.fixed).toEqual([7]);
expect(write).toHaveBeenLastCalledWith({
	liveColumns: 9,
});
await act(async () => {
	root.unmount();
});
console.log("preference hydration preserves stored values and early edits");
