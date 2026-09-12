<script lang="ts">
interface Props {
	ballNumber?: number;
	number?: number;
	initialValue?: number;
	class?: string;
	size?: "small" | "large";
	interactive?: boolean;
}
let {
	ballNumber,
	number,
	initialValue,
	class: className = "",
	size = "small",
	interactive = true,
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
<div class="lotto-ball {size} {className}" class:interactive style:background={`var(--lotto-${color})`} style:color={`var(--lotto-${color}-content)`} {...rest}>
 <strong>{displayNumber}</strong>{#if initialValue!==undefined}<span>{initialValue.toLocaleString()}회</span>{/if}
</div>
<style>
 .lotto-ball{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.25rem;width:100%;aspect-ratio:1;border-radius:50%;font-variant-numeric:tabular-nums;transition:transform 150ms;}
 strong{font-size:1rem;font-weight:750;}span{font-size:.6875rem;}.large strong{font-size:2rem;}.large span{font-size:.875rem;}.interactive:hover{transform:translateY(-2px);}
 @media (prefers-reduced-motion:reduce){.lotto-ball{transition:none;}.interactive:hover{transform:none;}}
</style>
