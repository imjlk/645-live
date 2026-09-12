<script lang="ts">
type Props = {
	number: number;
	color?: "yellow" | "blue" | "red" | "grey" | "green";
	size?: "small" | "normal" | "large";
	href?: string;
	interactive?: boolean;
	viewTransitionName?: string;
};
let {
	number,
	color,
	size = "normal",
	href,
	interactive = false,
	viewTransitionName = "none",
}: Props = $props();
const ballColor = $derived(
	color ??
		(number <= 10
			? "yellow"
			: number <= 20
				? "blue"
				: number <= 30
					? "red"
					: number <= 40
						? "grey"
						: "green"),
);
</script>

{#if href}
	<a {href} class="lotto-ball {size}" class:interactive aria-label={`${number}번 통계 보기`} style={`--ball-color: var(--lotto-${ballColor}); --ball-content: var(--lotto-${ballColor}-content)`} style:view-transition-name={viewTransitionName}>{number}</a>
{:else}
	<span class="lotto-ball {size}" class:transition-ball={viewTransitionName !== "none"} style={`--ball-color: var(--lotto-${ballColor}); --ball-content: var(--lotto-${ballColor}-content)`} style:view-transition-name={viewTransitionName}>{number}</span>
{/if}

<style>
	.lotto-ball { display: inline-flex; flex-shrink: 0; align-items: center; justify-content: center; width: 2rem; height: 2rem; border-radius: 50%; background: var(--ball-color); color: var(--ball-content); font-size: 0.875rem; line-height: 1; font-weight: 750; font-variant-numeric: tabular-nums; text-decoration: none; transition: transform 140ms ease; }
	.small { width: 1.5rem; height: 1.5rem; font-size: 0.75rem; }
	.large { width: 2.75rem; height: 2.75rem; font-size: 1rem; }
	.transition-ball.large { width: 4.5rem; height: 4.5rem; font-size: 1.75rem; background-image: radial-gradient(circle at 35% 22%, light-dark(#ffffff70, #ffffff12), transparent 65%); box-shadow: inset 0 1px 1px light-dark(#ffffffb3, #ffffff15), inset 0 -2px 3px light-dark(#0000000d, #00000026); }
	a { min-width: 2.75rem; min-height: 2.75rem; }
	a:hover { transform: translateY(-2px); }
	a:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 3px; }
	@media (prefers-reduced-motion: reduce) { .lotto-ball { transition: none; } a:hover { transform: none; } }
</style>
