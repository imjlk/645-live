import { expect, mock } from "bun:test";
import * as React from "react";
import { act, create } from "react-test-renderer";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
mock.module(
	Bun.resolveSync("react", `${import.meta.dir}/../../apps/toss`),
	() => React,
);
mock.module("react-native", () => ({
	View: "view",
	Text: "text",
	Pressable: "pressable",
	Animated: { Value: class {}, View: "animated" },
	StyleSheet: { create: (styles: unknown) => styles },
}));
mock.module("../../apps/toss/src/theme", () => ({
	useTheme: () => ({ surface: "gray", muted: "gray" }),
}));
const { Balls } = await import("../../apps/toss/src/Balls");
const opened: number[] = [];
let root!: ReturnType<typeof create>;
await act(async () => {
	root = create(
		<Balls
			numbers={[7, 10, 25, 29, 30, 43]}
			size={28}
			reducedMotion
			onNumberPress={(n) => opened.push(n)}
		/>,
	);
});
const buttons = root.root.findAllByType("pressable");
expect(buttons.map((n) => n.props.accessibilityLabel)).toEqual(
	[7, 10, 25, 29, 30, 43].map((n) => `${n}번 생성 통계 보기`),
);
expect(
	root.root.findAllByType("view").some((n) => n.props.accessible === true),
).toBe(false);
await act(async () => {
	buttons[0].props.onPress();
	buttons[5].props.onPress();
});
expect(opened).toEqual([7, 43]);
await act(async () => {
	root.update(<Balls numbers={[7, 10, 25, 29, 30, 43]} reducedMotion />);
});
expect(root.root.findAllByType("pressable")).toHaveLength(0);
expect(
	root.root.findByProps({ accessibilityLabel: "번호 7, 10, 25, 29, 30, 43" })
		.props.accessible,
).toBe(true);
await act(async () => {
	root.update(
		<Balls
			numbers={[0, 0, 0, 0, 0, 0]}
			reducedMotion
			onNumberPress={(n) => opened.push(n)}
		/>,
	);
});
expect(root.root.findAllByType("pressable")).toHaveLength(0);
await act(async () => {
	root.unmount();
});
console.log(
	"number balls expose individual actions without hiding them from accessibility",
);
