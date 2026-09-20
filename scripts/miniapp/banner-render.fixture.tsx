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
let props = {
	variant: "",
	adGroupId: "",
	onAdRendered: () => {},
	onNoFill: () => {},
};
mock.module("@granite-js/react-native", () => ({
	IOContext: io,
	useVisibility: () => visible,
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
console.log("banner placement lifecycle passed");
