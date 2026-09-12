<script lang="ts">
interface Props {
	show?: boolean;
	delta?: number;
	/** An optional template containing {delta}; fixed counts are ignored. */
	message?: string;
	color?: string;
}

let {
	show = false,
	delta = 0,
	message,
	color = "text-success-content",
}: Props = $props();
const displayMessage = $derived(
	message?.includes("{delta}")
		? message.replaceAll("{delta}", delta.toLocaleString())
		: `+${delta.toLocaleString()}`,
);
</script>

{#if show && Number.isFinite(delta) && delta > 0}
	{#key delta}
		<div class="increment-effect" aria-hidden="true">
			<span class="increment-value {color}">{displayMessage}</span>
		</div>
	{/key}
{/if}

<style>
	.increment-effect { position: absolute; top: -.3rem; right: -.2rem; z-index: 2; pointer-events: none; }
	.increment-value { display: block; padding: .2rem .4rem; border: 1px solid currentColor; border-radius: 999px; background: var(--color-base-100); font-size: .75rem; font-weight: 800; line-height: 1.2; font-variant-numeric: tabular-nums; box-shadow: 0 2px 6px color-mix(in oklab, var(--color-base-content) 10%, transparent); animation: increment-appear 240ms ease-out both; }
	@keyframes increment-appear { from { opacity: 0; transform: translateY(.35rem) scale(.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
	@media (prefers-reduced-motion: reduce) { .increment-value { animation: none; } }
</style>
