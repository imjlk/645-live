<script lang="ts">
import { resolve } from "$app/paths";
import { onMount } from "svelte";
import { trackEvent } from "$lib/utils/analytics";

let {
	slot,
	placement,
	format,
	class: className = "",
}: {
	slot: string;
	placement: string;
	format: "horizontal" | "rectangle";
	class?: string;
} = $props();
let container: HTMLDivElement;
let element: HTMLElement;
let unavailable = $state(false);
onMount(() => {
	let visibleTimer: ReturnType<typeof setTimeout> | undefined;
	let requested = false;
	let reportedFilled = false;
	let reportedVisible = false;
	let visible = false;
	const cancelTimer = () => {
		clearTimeout(visibleTimer);
		visibleTimer = undefined;
	};
	const checkVisible = () => {
		cancelTimer();
		if (
			!visible ||
			!reportedFilled ||
			reportedVisible ||
			document.visibilityState !== "visible"
		)
			return;
		visibleTimer = setTimeout(() => {
			reportedVisible = true;
			trackEvent("ad_slot_visible", { placement });
		}, 1000);
	};
	const checkStatus = () => {
		const status = element.getAttribute("data-ad-status");
		if (status === "unfilled") unavailable = true;
		if (status === "filled" && !reportedFilled) {
			reportedFilled = true;
			trackEvent("ad_slot_filled", { placement });
			checkVisible();
		}
	};
	const mutation = new MutationObserver(checkStatus);
	mutation.observe(element, {
		attributes: true,
		attributeFilter: ["data-ad-status"],
	});
	const observer = new IntersectionObserver(
		([entry]) => {
			visible = entry.intersectionRatio >= 0.5;
			checkVisible();
		},
		{ threshold: [0, 0.5] },
	);
	observer.observe(container);
	document.addEventListener("visibilitychange", checkVisible);
	const request = new IntersectionObserver(
		([entry]) => {
			if (!entry.isIntersecting || requested || container.clientWidth === 0)
				return;
			requested = true;
			request.disconnect();
			try {
				const adsWindow = window as typeof window & {
					adsbygoogle?: Record<string, never>[];
				};
				adsWindow.adsbygoogle ??= [];
				adsWindow.adsbygoogle.push({});
				trackEvent("ad_slot_request", { placement, format });
			} catch {
				unavailable = true;
			}
		},
		{ rootMargin: "300px 0px" },
	);
	request.observe(container);
	return () => {
		cancelTimer();
		mutation.disconnect();
		observer.disconnect();
		request.disconnect();
		document.removeEventListener("visibilitychange", checkVisible);
	};
});
</script>

<div bind:this={container} class="ad-slot {className}" class:rectangle={format === "rectangle"} data-ad-placement={placement}>
	{#if unavailable}
		<div class="ad-fallback"><span>645.live 이용 가이드</span><a href={resolve("/guide")}>로또 결과와 통계 읽는 법 →</a></div>
	{:else}
		<span class="ad-label">광고</span>
	{/if}
	<ins bind:this={element} class="adsbygoogle" class:unavailable style="display:block;min-height:250px" data-ad-client="ca-pub-4441205887996163" data-ad-slot={slot} data-ad-format={format === "rectangle" ? "rectangle" : "auto"} data-full-width-responsive="true"></ins>
</div>

<style>
	.ad-slot { position: relative; min-height: 280px; margin-block: 2rem; padding-top: 1.25rem; background: var(--color-base-200); }
	.ad-label { position: absolute; top: 0.35rem; left: 0.75rem; color: var(--text-muted); font-size: 0.6875rem; }
	.rectangle { min-width: 0; }
	.unavailable { visibility: hidden; }
	.ad-fallback { position: absolute; inset: 0; padding: 1.5rem; display: flex; flex-direction: column; justify-content: center; gap: 0.75rem; }
	.ad-fallback span { color: var(--text-muted); font-size: 0.8125rem; }
	.ad-fallback a { color: var(--color-primary); font-size: 0.9375rem; }
</style>
