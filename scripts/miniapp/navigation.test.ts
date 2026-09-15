import { expect, test } from "bun:test";
import { createRequire } from "node:module";
import {
	type LottoTab,
	navigateToTab,
	TAB_BACK_BEHAVIOR,
} from "../../apps/toss/src/navigation";

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
const { TabRouter, TabActions, CommonActions } = await import(
	coreRequire.resolve("@react-navigation/routers")
);

function fixture(initialRouteName: LottoTab = "make") {
	const router = TabRouter({
		initialRouteName,
		backBehavior: TAB_BACK_BEHAVIOR,
	});
	const config = {
		routeNames: ["make", "live", "saved"],
		routeParamList: {},
		routeGetIdList: {},
	};
	let state = router.getInitialState(config);
	const navigation = {
		getState: () => state,
		jumpTo(name: LottoTab) {
			state = router.getStateForAction(state, TabActions.jumpTo(name), config);
		},
	};
	return {
		navigation,
		get state() {
			return state;
		},
		current: () => state.routes[state.index].name,
		select(next: LottoTab) {
			return navigateToTab(
				navigation,
				state.routes[state.index].name,
				next,
				true,
			);
		},
		back() {
			const next = router.getStateForAction(
				state,
				CommonActions.goBack(),
				config,
			);
			if (!next) return false;
			state = next;
			return true;
		},
	};
}

test("tab history returns through every visit and keeps every screen identity", () => {
	const app = fixture();
	const keys = app.state.routes.map((route: { key: string }) => route.key);
	for (const tab of ["live", "saved", "make"] as const)
		expect(app.select(tab)).toBe(true);
	expect(app.current()).toBe("make");
	expect(app.back()).toBe(true);
	expect(app.current()).toBe("saved");
	expect(app.back()).toBe(true);
	expect(app.current()).toBe("live");
	expect(app.back()).toBe(true);
	expect(app.current()).toBe("make");
	expect(app.back()).toBe(false);
	expect(app.state.routes.map((route: { key: string }) => route.key)).toEqual(
		keys,
	);
});

test("same-tab, invalid, hidden and stale-render taps cannot create phantom history", () => {
	const app = fixture();
	expect(navigateToTab(app.navigation, "make", "make", true)).toBe(false);
	expect(navigateToTab(app.navigation, "make", "unknown", true)).toBe(false);
	expect(navigateToTab(app.navigation, "make", "live", false)).toBe(false);
	expect(app.state.history).toHaveLength(1);
	expect(app.select("live")).toBe(true);
	expect(navigateToTab(app.navigation, "make", "saved", true)).toBe(false);
	expect(app.state.history).toHaveLength(2);
	expect(app.back()).toBe(true);
	expect(app.current()).toBe("make");
});

test("hundreds of switches keep three stable screens while Back retraces the full visit sequence", () => {
	const app = fixture();
	const routes = app.state.routes;
	for (let index = 0; index < 300; index++) {
		const next = (["live", "saved", "make"] as const)[index % 3];
		app.select(next);
		expect(app.state.routes).toEqual(routes);
		expect(app.state.history).toHaveLength(index + 2);
		expect(app.current()).toBe(next);
	}
	for (let index = 299; index >= 0; index--) {
		expect(app.back()).toBe(true);
		expect(app.current()).toBe((["make", "live", "saved"] as const)[index % 3]);
		expect(app.state.routes).toEqual(routes);
	}
	expect(app.back()).toBe(false);
});

test("a saved deep link starts at saved and Back returns through subsequent visits", () => {
	const app = fixture("saved");
	expect(app.current()).toBe("saved");
	expect(app.back()).toBe(false);
	app.select("live");
	app.select("make");
	expect(app.back()).toBe(true);
	expect(app.current()).toBe("live");
	expect(app.back()).toBe(true);
	expect(app.current()).toBe("saved");
	expect(app.back()).toBe(false);
});
