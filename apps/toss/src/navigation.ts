export const TAB_ROUTES = {
	make: "/",
	live: "/live",
	saved: "/saved",
} as const;
export type LottoTab = keyof typeof TAB_ROUTES;

export function tabRoute(value: string) {
	return value === "make" || value === "live" || value === "saved"
		? TAB_ROUTES[value]
		: null;
}

export function navigateToTab(
	navigation: { push(path: (typeof TAB_ROUTES)[LottoTab]): void },
	current: LottoTab,
	next: string,
	visible: boolean,
) {
	const path = tabRoute(next);
	if (!visible || !path || current === next) return false;
	navigation.push(path);
	return true;
}
