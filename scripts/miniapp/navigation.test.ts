import { expect, test } from "bun:test";
import { createRequire } from "node:module";
import {
	numberStatisticsParams,
	resultsParams,
} from "../../apps/toss/src/insights-route";
import {
	type LottoTab,
	navigateToGenerationResults,
	navigateToInsights,
	navigateToNumberStatistics,
	navigateToSavedRound,
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
const { TabRouter, TabActions, CommonActions, StackRouter, StackActions } =
	await import(coreRequire.resolve("@react-navigation/routers"));

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

test("generation insights push onto Granite's parent stack and return to the same tab history", () => {
	const app = fixture();
	app.select("live");
	app.select("saved");
	const tabs = app.state;
	const router = StackRouter({ initialRouteName: "/" });
	const config = {
		routeNames: ["/", "/insights", "/numbers"],
		routeParamList: {},
		routeGetIdList: {},
	};
	let stack = router.getInitialState(config);
	const parent = {
		getState: () => stack,
		push(name: string, params: object) {
			stack = router.getStateForAction(
				stack,
				StackActions.push(name, params),
				config,
			);
		},
	};
	const navigation = {
		...app.navigation,
		getParent: () => parent,
	} as unknown as Parameters<typeof navigateToInsights>[0];
	expect(navigateToInsights(navigation, "saved", false)).toBe(false);
	expect(navigateToInsights(navigation, "make", true)).toBe(false);
	expect(
		navigateToInsights(navigation, "saved", true, { round: 1243, number: 7 }),
	).toBe(true);
	expect(stack.routes[stack.index].name).toBe("/insights");
	expect(stack.routes[stack.index].params).toEqual({ round: 1243, number: 7 });
	expect(navigateToInsights(navigation, "saved", true)).toBe(false);
	expect(stack.routes).toHaveLength(2);
	const numberRoute = stack.routes[stack.index];
	parent.push("/insights", { round: 1243 });
	expect(stack.routes).toHaveLength(3);
	expect(stack.routes[stack.index].params).toEqual({ round: 1243 });
	stack = router.getStateForAction(stack, CommonActions.goBack(), config);
	expect(stack.routes[stack.index]).toEqual(numberRoute);
	stack = router.getStateForAction(stack, CommonActions.goBack(), config);
	expect(stack.routes[stack.index].name).toBe("/");
	expect(app.state).toBe(tabs);
	expect(app.current()).toBe("saved");
	expect(app.back()).toBe(true);
	expect(app.current()).toBe("live");
	expect(
		navigateToNumberStatistics(navigation, "live", true, {
			round: 1243,
			number: 7,
			source: "draw",
		}),
	).toBe(true);
	expect(stack.routes[stack.index].params).toEqual({
		round: 1243,
		number: 7,
		source: "draw",
	});
	expect(
		navigateToNumberStatistics(navigation, "live", true, { number: 8 }),
	).toBe(false);
});

test("number detail routes require a real number and validate optional context", () => {
	expect(
		numberStatisticsParams({ number: 7, round: 1243, source: "generated" }),
	).toEqual({ number: 7, round: 1243, source: "generated" });
	expect(
		numberStatisticsParams({ number: 7, round: -1, source: "unknown" }),
	).toEqual({ number: 7 });
	for (const number of [undefined, 0, 46, 1.5])
		expect(() => numberStatisticsParams({ number })).toThrow();
});

test("result return targets the existing saved tab and Back returns to the generator", () => {
	const app = fixture();
	const keys = app.state.routes.map((r: { key: string }) => r.key);
	expect(navigateToSavedRound(app.navigation, "make", 1243, false)).toBe(false);
	expect(navigateToSavedRound(app.navigation, "live", 1243, true)).toBe(false);
	expect(navigateToSavedRound(app.navigation, "make", 0, true)).toBe(false);
	// Use the real TabRouter with a parameter-carrying jump.
	const router = TabRouter({
		initialRouteName: "make",
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
		jumpTo: (name: string, params: object) => {
			state = router.getStateForAction(
				state,
				TabActions.jumpTo(name, params),
				config,
			);
		},
	};
	expect(navigateToSavedRound(navigation, "make", 1243, true)).toBe(true);
	expect(state.routes[state.index].params).toEqual({
		round: 1243,
		entry: "home",
	});
	expect(state.routes).toHaveLength(keys.length);
	state = router.getStateForAction(state, CommonActions.goBack(), config);
	expect(state.routes[state.index].name).toBe("make");
});

test("results and analysis preserve the native result route and existing tab history on Back", () => {
	const app = fixture();
	app.select("saved");
	app.select("live");
	const tabs = app.state;
	const router = StackRouter({ initialRouteName: "/" });
	const config = {
		routeNames: ["/", "/results", "/insights"],
		routeParamList: {},
		routeGetIdList: {},
	};
	let stack = router.getInitialState(config);
	const parent = {
		getState: () => stack,
		push(name: string, params: object) {
			stack = router.getStateForAction(
				stack,
				StackActions.push(name, params),
				config,
			);
		},
	};
	const navigation = {
		...app.navigation,
		getParent: () => parent,
	} as unknown as Parameters<typeof navigateToGenerationResults>[0];
	expect(navigateToGenerationResults(navigation, "live", false)).toBe(false);
	expect(navigateToGenerationResults(navigation, "saved", true)).toBe(false);
	expect(
		navigateToGenerationResults(navigation, "live", true, { round: 1243 }),
	).toBe(true);
	const resultKey = stack.routes[stack.index].key;
	expect(navigateToGenerationResults(navigation, "live", true)).toBe(false);
	expect(navigateToInsights(navigation, "live", true)).toBe(false);
	parent.push("/insights", { round: 1242 });
	stack = router.getStateForAction(stack, CommonActions.goBack(), config);
	expect(stack.routes[stack.index].name).toBe("/results");
	expect(stack.routes[stack.index].key).toBe(resultKey);
	stack = router.getStateForAction(stack, CommonActions.goBack(), config);
	expect(stack.routes[stack.index].name).toBe("/");
	expect(app.state).toBe(tabs);
	expect(app.current()).toBe("live");
	expect(app.back()).toBe(true);
	expect(app.current()).toBe("saved");
});

test("results deep links ignore invalid rounds and unrelated number filters", () => {
	expect(resultsParams({ round: 1243, number: 7 })).toEqual({ round: 1243 });
	for (const round of [0, -1, 1.5, "1243", Infinity, NaN])
		expect(resultsParams({ round })).toEqual({});
});
