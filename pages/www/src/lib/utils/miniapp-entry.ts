import * as publicEnv from "$env/static/public";
import { trackEvent } from "$lib/utils/analytics";

export const MINIAPP_NAME = "645 번호 생성기";
const defaultShareLink = "https://minion.toss.im/haA4J9Hj";
export type MiniappPlacement = "home" | "generator" | "footer";

// SDK-issued share links include the native app route and app-store fallback.
export const MINIAPP_SHARE_URL = (() => {
	const value = Object.entries(publicEnv).find(
		([key]) => key === "PUBLIC_TOSS_MINIAPP_SHARE_URL",
	)?.[1];
	if (!value) return defaultShareLink;
	try {
		const url = new URL(value);
		return url.protocol === "https:" && !url.username && !url.password
			? url.href
			: defaultShareLink;
	} catch {
		return defaultShareLink;
	}
})();

export function recordMiniappEntry(
	event: "miniapp_banner_viewed" | "miniapp_entry_clicked",
	placement: MiniappPlacement,
	action = "",
) {
	try {
		trackEvent(event, { placement, miniapp: "645-live", action });
	} catch {
		// Optional analytics must never prevent the app link from opening.
	}
}

/** One impression per mounted placement after 50% is visible for one second. */
export function observeMiniappEntry(
	element: HTMLElement,
	placement: MiniappPlacement,
) {
	if (!("IntersectionObserver" in window)) return;
	let visible = false;
	let counted = false;
	let timer: ReturnType<typeof setTimeout> | undefined;
	const cancel = () => {
		clearTimeout(timer);
		timer = undefined;
	};
	const update = () => {
		cancel();
		if (counted || !visible || document.visibilityState !== "visible") return;
		timer = setTimeout(() => {
			if (document.visibilityState !== "visible") return;
			counted = true;
			recordMiniappEntry("miniapp_banner_viewed", placement);
			observer.disconnect();
		}, 1000);
	};
	const observer = new IntersectionObserver(
		(entries) => {
			visible = entries.some((entry) => entry.intersectionRatio >= 0.5);
			update();
		},
		{ threshold: [0, 0.5] },
	);
	observer.observe(element);
	document.addEventListener("visibilitychange", update);
	return () => {
		cancel();
		observer.disconnect();
		document.removeEventListener("visibilitychange", update);
	};
}
