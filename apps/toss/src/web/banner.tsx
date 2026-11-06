import { TossAds } from "@apps-in-toss/web-framework";
import {
	createWebViewBannerAds,
	type WebViewBannerOptions,
} from "@trailbase-apps-in-toss-kit/ait-web/ads";
import { useEffect, useRef } from "react";

const ads = createWebViewBannerAds({ framework: { TossAds } });
export const isBannerSupported = async () =>
	typeof TossAds?.attachBanner === "function" &&
	TossAds.attachBanner.isSupported();
export function InlineAd({
	adGroupId,
	theme,
	tone,
	variant,
	onUnavailable,
	...callbacks
}: WebViewBannerOptions &
	NonNullable<WebViewBannerOptions["callbacks"]> & {
		adGroupId: string;
		onUnavailable: () => void;
	}) {
	const host = useRef<HTMLDivElement>(null),
		latest = useRef({ ...callbacks, onUnavailable });
	latest.current = { ...callbacks, onUnavailable };
	useEffect(() => {
		const controller = new AbortController();
		let closed = false,
			handle: { destroy: () => void } | undefined;
		if (!host.current) return;
		void ads
			.attachBanner(adGroupId, host.current, {
				signal: controller.signal,
				theme,
				tone,
				variant,
				callbacks: {
					onAdRendered: (e) => latest.current.onAdRendered?.(e),
					onAdImpression: (e) => latest.current.onAdImpression?.(e),
					onAdViewable: (e) => latest.current.onAdViewable?.(e),
					onAdClicked: (e) => latest.current.onAdClicked?.(e),
					onNoFill: (e) => latest.current.onNoFill?.(e),
					onAdFailedToRender: (e) => latest.current.onAdFailedToRender?.(e),
				},
			})
			.then((result) => {
				if (closed) result.destroy();
				else handle = result;
			})
			.catch(() => {
				if (!closed) latest.current.onUnavailable();
			});
		return () => {
			closed = true;
			controller.abort();
			handle?.destroy();
		};
	}, [adGroupId, theme, tone, variant]);
	return <div ref={host} style={{ width: "100%" }} />;
}
