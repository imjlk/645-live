<script lang="ts">
import { LIVE_COUNT_MOTION_MS } from "@645/lotto-core";
interface Props {
	ballNumber?: number;
	number?: number;
	initialValue?: number;
	previousValue?: number;
	class?: string;
	size?: "small" | "large";
	interactive?: boolean;
	viewTransitionName?: string;
}
let {
	ballNumber,
	number,
	initialValue,
	previousValue,
	class: className = "",
	size = "small",
	interactive = true,
	viewTransitionName = "none",
	...rest
}: Props = $props();
const displayNumber = $derived(number ?? ballNumber ?? 1);
const color = $derived(
	displayNumber <= 10
		? "yellow"
		: displayNumber <= 20
			? "blue"
			: displayNumber <= 30
				? "red"
				: displayNumber <= 40
					? "grey"
					: "green",
);
</script>
<div class="lotto-ball {size} {className}" class:interactive style:background-color={`var(--lotto-${color})`} style:color={`var(--lotto-${color}-content)`} style:view-transition-name={viewTransitionName} {...rest}>
 <strong>{displayNumber}</strong>
 {#if initialValue !== undefined}
  {#if previousValue !== undefined && initialValue > previousValue}
   {#key initialValue}
    <span class="rolling-count" style:--count-duration={`${LIVE_COUNT_MOTION_MS}ms`} aria-hidden="true">
     <span class="count-measure" aria-hidden="true">{initialValue.toLocaleString()}회</span>
     <span class="count-previous" aria-hidden="true">{previousValue.toLocaleString()}회</span>
     <span class="count-current" aria-hidden="true">{initialValue.toLocaleString()}회</span>
    </span>
    <span class="sr-only">{initialValue.toLocaleString()}회</span>
   {/key}
  {:else}<span>{initialValue.toLocaleString()}회</span>{/if}
 {/if}
</div>
<style>
 .lotto-ball{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.2rem;width:100%;min-width:0;aspect-ratio:1;border-radius:50%;background-image:radial-gradient(circle at 35% 22%,light-dark(#ffffff70,#ffffff12),transparent 65%);box-shadow:inset 0 1px 1px light-dark(#ffffffb3,#ffffff15),inset 0 -2px 3px light-dark(#0000000d,#00000026);font-variant-numeric:tabular-nums;line-height:1.15;transition:transform 150ms;overflow:hidden;}
 strong{font-size:1rem;font-weight:750;}span{max-width:100%;padding-inline:.15rem;font-size:.6875rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}.large strong{font-size:2rem;}.large span{font-size:.875rem;}.interactive:hover{transform:translateY(-2px);}
 .rolling-count{position:relative;display:block;line-height:1.3;}.count-measure{display:block;visibility:hidden;}.rolling-count>span{font-size:inherit;padding:0;}.count-previous,.count-current{position:absolute;inset:0;}.count-previous{animation:count-leave var(--count-duration) ease-out both;}.count-current{animation:count-enter var(--count-duration) ease-out both;}
 @keyframes count-leave{0%{opacity:1;transform:translateY(0);}50%,100%{opacity:0;transform:translateY(-100%);}}
 @keyframes count-enter{0%{opacity:0;transform:translateY(100%);}50%,100%{opacity:1;transform:translateY(0);}}
 @media (prefers-reduced-motion:reduce){.lotto-ball{transition:none;}.interactive:hover{transform:none;}.count-previous{display:none;}.count-current{animation:none;}}
</style>
