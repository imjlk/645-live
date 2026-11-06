import {
	closeView,
	getSchemeUri,
	graniteEvent,
} from "@apps-in-toss/web-framework";
import { createContext, useContext, useSyncExternalStore } from "react";
import {
	insightsParams,
	numberStatisticsParams,
	resultsParams,
} from "../insights-route";
import type { DetailPath, LottoTab, LottoTabNavigation } from "../navigation";
import { type SavedParams, savedParams } from "../result-return";

export const Focus = createContext(true);
export const useIsFocused = () => useContext(Focus);
type Params = SavedParams & { number?: number; source?: "generated" | "draw" };
export const RouteParams = createContext<Params>({});
export const useParams = (_: { from: string }) => useContext(RouteParams);
export type Route = { path: string; params: Params };
const tabPaths = { make: "/", live: "/live", saved: "/saved" } as const;
const tabs = Object.keys(tabPaths) as LottoTab[];
type Snapshot = {
	tab: LottoTab;
	saved: SavedParams;
	details: (Route & { key: string })[];
	depth: number;
};
const empty: Snapshot = { tab: "make", saved: {}, details: [], depth: 0 };
const listeners = new Set<() => void>();
const backs = new Set<() => void>();
let state = empty;
function route() {
	return (
		state.details.at(-1) ?? {
			path: tabPaths[state.tab],
			params: state.tab === "saved" ? state.saved : {},
		}
	);
}
function url() {
	const top = route(),
		query = new URLSearchParams();
	for (const [k, v] of Object.entries(top.params))
		if (v !== undefined) query.set(k, String(v));
	return top.path + (query.size ? "?" + query : "");
}
function publish(next: Snapshot, push: boolean) {
	state = next;
	history[push ? "pushState" : "replaceState"]({ lotto: state }, "", url());
	for (const f of listeners) f();
}
export function decodeRoute(path: string, search: string): Route {
	const p = Object.fromEntries(new URLSearchParams(search));
	const nums = { ...p, round: Number(p.round), number: Number(p.number) };
	if (path === "/numbers") {
		try {
			return { path, params: numberStatisticsParams(nums) };
		} catch {
			return { path: "/404", params: {} };
		}
	}
	if (path === "/results" || path === "/insights")
		return {
			path,
			params: path === "/results" ? resultsParams(nums) : insightsParams(nums),
		};
	return { path, params: path === "/saved" ? savedParams(p) : {} };
}
function pushDetail(path: DetailPath, params: Params = {}) {
	publish(
		{
			...state,
			details: [...state.details, { path, params, key: crypto.randomUUID() }],
			depth: state.depth + 1,
		},
		true,
	);
}
export const navigation: LottoTabNavigation & {
	push: typeof pushDetail;
	navigate: typeof pushDetail;
	replace: (path: "/") => void;
} = {
	getState: () => ({
		index: tabs.indexOf(state.tab),
		routes: tabs.map((name) => ({ name })),
		type: "tab",
	}),
	jumpTo: (tab, params) =>
		publish(
			{
				...state,
				tab,
				saved: params ?? state.saved,
				details: [],
				depth: state.depth + 1,
			},
			true,
		),
	setParams: (params) =>
		publish({ ...state, saved: savedParams(params) }, false),
	getParent: () => ({
		getState: () => ({
			index: 0,
			routes: [{ name: route().path }],
			type: "stack",
		}),
		push: pushDetail,
	}),
	push: pushDetail,
	navigate: pushDetail,
	replace: () => publish(empty, false),
};
export function useNavigation() {
	return navigation;
}
export const backEvent = {
	addEventListener: (f: () => void) => {
		backs.add(f);
	},
	removeEventListener: (f: () => void) => {
		backs.delete(f);
	},
};
export const useBackEvent = () => backEvent;
export function startWebNavigation() {
	let entry = new URL(location.href);
	if (entry.pathname === "/index.html") entry.pathname = "/";
	if (entry.pathname === "/") {
		try {
			const scheme = new URL(getSchemeUri());
			if (scheme.host === "645-live" && scheme.pathname.length > 1)
				entry = scheme;
		} catch {
			/* Standalone browser */
		}
	}
	const first = decodeRoute(entry.pathname, entry.search);
	const tab = tabs.find((t) => tabPaths[t] === first.path);
	state = history.state?.lotto ?? {
		...empty,
		tab: tab ?? "make",
		saved: tab === "saved" ? first.params : {},
		details: tab ? [] : [{ ...first, key: "entry" }],
	};
	history.replaceState({ lotto: state }, "", location.href);
	const pop = () => {
		const overlay = [...backs].at(-1);
		if (overlay) {
			history.pushState({ lotto: state }, "", url());
			overlay();
			return;
		}
		state = history.state?.lotto ?? empty;
		for (const f of listeners) f();
	};
	const back = () => {
		const overlay = [...backs].at(-1);
		if (overlay) overlay();
		else if (state.depth) history.back();
		else void closeView();
	};
	window.addEventListener("popstate", pop);
	let remove: (() => void) | undefined;
	try {
		remove = graniteEvent.addEventListener("backEvent", { onEvent: back });
	} catch {
		/* Browser dev server. */
	}
	return () => {
		window.removeEventListener("popstate", pop);
		remove?.();
	};
}
export function useRouteState() {
	return useSyncExternalStore(
		(f) => {
			listeners.add(f);
			return () => {
				listeners.delete(f);
			};
		},
		() => state,
	);
}
