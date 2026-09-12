import { browser } from "$app/environment";

type EventParameters = Record<string, string | number | boolean>;
type AnalyticsWindow = Window & {
	gtag?: (...args: unknown[]) => void;
};

function safePageContext() {
	let referrer = "";
	try {
		referrer = document.referrer ? new URL(document.referrer).origin : "";
	} catch {}
	return {
		page_location: `${window.location.origin}${window.location.pathname}`,
		page_path: window.location.pathname,
		page_title: "645.live",
		page_referrer: referrer,
	};
}

export function trackPageView(): void {
	if (!browser || !import.meta.env.PROD) return;
	(window as AnalyticsWindow).gtag?.("event", "page_view", safePageContext());
}

/** Keep ticket contents, account IDs and URL queries out of product analytics. */
export function trackEvent(
	name: string,
	parameters: EventParameters = {},
): void {
	if (!browser || !import.meta.env.PROD) return;
	(window as AnalyticsWindow).gtag?.("event", name, {
		...safePageContext(),
		...parameters,
	});
}

export function registerNavigationAnalytics(): () => void {
	const handleClick = (event: MouseEvent) => {
		if (!(event.target instanceof Element)) return;
		const link = event.target.closest<HTMLAnchorElement>("a[href]");
		if (!link || link.origin !== window.location.origin) return;
		trackEvent("navigation_click", {
			destination: link.pathname,
			location: link.closest("header")
				? "header"
				: link.closest("footer")
					? "footer"
					: link.closest("nav")
						? "navigation"
						: "content",
		});
	};
	document.addEventListener("click", handleClick);
	return () => document.removeEventListener("click", handleClick);
}

export async function registerWebVitals(): Promise<void> {
	if (!browser || !import.meta.env.PROD) return;
	const { onCLS, onINP, onLCP } = await import("web-vitals");
	const report = (metric: {
		name: string;
		value: number;
		rating: string;
		navigationType: string;
		id: string;
	}) => {
		trackEvent("web_vital", {
			metric_name: metric.name,
			metric_value: metric.value,
			metric_rating: metric.rating,
			navigation_type: metric.navigationType,
			metric_id: metric.id,
		});
	};
	onCLS(report);
	onINP(report);
	onLCP(report);
}
