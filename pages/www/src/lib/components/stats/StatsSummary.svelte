<script lang="ts">
type StatItem = {
	title: string;
	value: string | number;
	description?: string;
	theme?:
		| "primary"
		| "secondary"
		| "accent"
		| "info"
		| "success"
		| "warning"
		| "error";
};
let { stats, columns = 4 }: { stats: StatItem[]; columns?: number } = $props();
</script>

<dl class="stats-summary" style={`--summary-columns: ${Math.max(1, Math.min(columns, 6))}`}>
	{#each stats as stat (stat.title)}
		<div>
			<dt>{stat.title}</dt>
			<dd>{stat.value}</dd>
			{#if stat.description}<p>{stat.description}</p>{/if}
		</div>
	{/each}
</dl>

<style>
	.stats-summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border-block: 1px solid var(--color-base-300); }
	.stats-summary > div { min-width: 0; padding: 1rem 0.75rem 1rem 0; }
	dt { font-size: 0.8125rem; color: color-mix(in oklab, var(--color-base-content) 72%, transparent); }
	dd { margin-top: 0.35rem; font-size: clamp(1.25rem, 2.5vw, 1.8rem); font-weight: 750; line-height: 1.2; color: var(--color-base-content); font-variant-numeric: tabular-nums; }
	p { margin-top: 0.4rem; font-size: 0.8125rem; line-height: 1.5; color: color-mix(in oklab, var(--color-base-content) 68%, transparent); }
	@media (min-width: 768px) { .stats-summary { grid-template-columns: repeat(var(--summary-columns), minmax(0, 1fr)); } }
</style>
