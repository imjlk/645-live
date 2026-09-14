import { expect, test } from "bun:test";
import { createRequire } from "node:module";
import { navigateToTab, TAB_ROUTES } from "../../apps/toss/src/navigation";

// Exercise the router shipped with Granite, not an app-owned imitation of a stack.
const require = createRequire(import.meta.url);
const nativeRequire = createRequire(
	require.resolve("@granite-js/native/package.json"),
);
const navigationRequire = createRequire(
	nativeRequire.resolve("@react-navigation/native"),
);
const coreRequire = createRequire(
	navigationRequire.resolve("@react-navigation/core"),
);
const { StackRouter, StackActions, CommonActions } = await import(
	coreRequire.resolve("@react-navigation/routers")
);

test("tabs build a native stack and back restores each previous screen", () => {
	const router = StackRouter({ initialRouteName: "/" });
	const config = {
		routeNames: Object.values(TAB_ROUTES),
		routeParamList: {},
		routeGetIdList: {},
	};
	let state = router.getInitialState(config);
	const firstKey = state.routes[0].key;
	const navigation = {
		push(path: (typeof TAB_ROUTES)[keyof typeof TAB_ROUTES]) {
			state = router.getStateForAction(state, StackActions.push(path), config);
		},
	};
	const names = () => state.routes.map((route: { name: string }) => route.name);
	expect(navigateToTab(navigation, "make", "live", true)).toBe(true);
	const liveKey = state.routes[1].key;
	expect(navigateToTab(navigation, "live", "saved", true)).toBe(true);
	expect(navigateToTab(navigation, "saved", "make", true)).toBe(true);
	expect(names()).toEqual(["/", "/live", "/saved", "/"]);

	state = router.getStateForAction(state, CommonActions.goBack(), config);
	expect(names()).toEqual(["/", "/live", "/saved"]);
	state = router.getStateForAction(state, CommonActions.goBack(), config);
	expect(names()).toEqual(["/", "/live"]);
	expect(state.routes[1].key).toBe(liveKey);
	state = router.getStateForAction(state, CommonActions.goBack(), config);
	expect(names()).toEqual(["/"]);
	expect(state.routes[0].key).toBe(firstKey);
	expect(
		router.getStateForAction(state, CommonActions.goBack(), config),
	).toBeNull();
});

test("same-tab taps and hidden screens cannot create phantom history", () => {
	const pushed: string[] = [];
	const navigation = { push: (path: string) => pushed.push(path) };
	expect(navigateToTab(navigation, "make", "make", true)).toBe(false);
	expect(navigateToTab(navigation, "make", "unknown", true)).toBe(false);
	expect(navigateToTab(navigation, "make", "live", false)).toBe(false);
	expect(pushed).toEqual([]);
});
