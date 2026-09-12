<script lang="ts">
import type { StatsFreshness } from "$lib/trailbase/stats-freshness";
import StatsFreshnessNotice from "./StatsFreshnessNotice.svelte";

type HeroMetric = {
	label: string;
	value: string | number;
	note?: string;
	tone?: "default" | "primary" | "secondary" | "accent";
};
type Props = {
	eyebrow?: string;
	title: string;
	description: string;
	metrics?: HeroMetric[];
	freshness?: StatsFreshness | null;
};
let {
	eyebrow = "로또 통계",
	title,
	description,
	metrics = [],
	freshness = null,
}: Props = $props();
</script>

<header class="stats-page-hero">
	<div>
		<p class="eyebrow">{eyebrow}</p>
		<h1>{title}</h1>
		<p class="description">{description}</p>
	</div>
	{#if freshness}<StatsFreshnessNotice {freshness} />{/if}
	{#if metrics.length > 0}
		<dl class="metrics">
			{#each metrics as metric (metric.label)}
				<div class="metric">
					<dt>{metric.label}</dt>
					<dd>{metric.value}</dd>
					{#if metric.note}<p>{metric.note}</p>{/if}
				</div>
			{/each}
		</dl>
	{/if}
</header>

<style>
	.stats-page-hero { display: grid; gap: 1rem; min-width: 0; }
	.eyebrow { color: var(--color-primary); font-size: 0.8125rem; font-weight: 700; }
	h1 { margin-top: 0.3rem; font-size: var(--page-title-size); line-height: var(--page-title-line-height); font-weight: var(--page-title-weight); letter-spacing: var(--page-title-tracking); color: var(--color-base-content); text-wrap: balance; }
	.description { margin-top: 0.65rem; max-width: var(--reading-width); font-size: var(--body-copy-size); line-height: var(--body-copy-line-height); color: color-mix(in oklab, var(--color-base-content) 75%, transparent); }
	.metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: calc(var(--page-header-space) - 1rem); border-block: 1px solid var(--color-base-300); }
	.metric { padding: 1rem 0.75rem 1rem 0; min-width: 0; }
	dt { font-size: 0.8125rem; color: color-mix(in oklab, var(--color-base-content) 72%, transparent); }
	dd { margin-top: 0.35rem; font-size: clamp(1.3rem, 2.5vw, 1.75rem); font-weight: 750; line-height: 1.2; font-variant-numeric: tabular-nums; color: var(--color-base-content); }
	.metric p { margin-top: 0.3rem; font-size: 0.8125rem; line-height: 1.45; color: color-mix(in oklab, var(--color-base-content) 68%, transparent); }
	@media (min-width: 768px) { .metrics { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
</style>
