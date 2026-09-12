<script lang="ts">
interface Props {
	ballNumber?: number;
	number?: number;
	initialValue?: number;
	class?: string;
	size?: "small" | "large";
	interactive?: boolean;
	viewTransitionName?: string;
}
let {
	ballNumber,
	number,
	initialValue,
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
 <strong>{displayNumber}</strong>{#if initialValue!==undefined}<span>{initialValue.toLocaleString()}회</span>{/if}
</div>
<style>
 .lotto-ball{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.2rem;width:100%;min-width:0;aspect-ratio:1;border-radius:50%;background-image:radial-gradient(circle at 35% 22%,light-dark(#ffffff70,#ffffff12),transparent 65%);box-shadow:inset 0 1px 1px light-dark(#ffffffb3,#ffffff15),inset 0 -2px 3px light-dark(#0000000d,#00000026);font-variant-numeric:tabular-nums;line-height:1.15;transition:transform 150ms;overflow:hidden;}
 strong{font-size:1rem;font-weight:750;}span{max-width:100%;padding-inline:.15rem;font-size:.6875rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}.large strong{font-size:2rem;}.large span{font-size:.875rem;}.interactive:hover{transform:translateY(-2px);}
 @media (prefers-reduced-motion:reduce){.lotto-ball{transition:none;}.interactive:hover{transform:none;}}
</style>
