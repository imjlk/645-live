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
		eyebrow = "645.live 세부 통계",
		title,
		description,
		metrics = [],
		freshness = null,
	}: Props = $props();
</script>

<section class="stats-page-hero">
	<div class="stats-page-hero__copy">
		<p class="stats-page-hero__eyebrow">{eyebrow}</p>
		<h1 class="stats-page-hero__title">{title}</h1>
		<p class="stats-page-hero__description">{description}</p>
		{#if freshness}
			<div class="stats-page-hero__freshness">
				<StatsFreshnessNotice {freshness} />
			</div>
		{/if}
	</div>

	{#if metrics.length > 0}
		<div class="stats-page-hero__metrics">
			{#each metrics as metric (metric.label)}
				<div class="stats-page-hero__metric stats-page-hero__metric--{metric.tone ?? 'default'}">
					<p class="stats-page-hero__metric-label">{metric.label}</p>
					<p class="stats-page-hero__metric-value">{metric.value}</p>
					{#if metric.note}
						<p class="stats-page-hero__metric-note">{metric.note}</p>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</section>

<style>
	.stats-page-hero {
		display: grid;
		gap: 1rem;
		border: 1px solid color-mix(in oklab, oklch(var(--b3)) 72%, white);
		background:
			radial-gradient(circle at top left, rgba(244, 114, 182, 0.1), transparent 34%),
			radial-gradient(circle at 90% 0%, rgba(59, 130, 246, 0.12), transparent 30%),
			linear-gradient(180deg, color-mix(in oklab, oklch(var(--b1)) 95%, white), color-mix(in oklab, oklch(var(--b1)) 90%, white));
		border-radius: 1.9rem;
		padding: 1.2rem;
		box-shadow: 0 18px 48px rgba(15, 23, 42, 0.06);
	}

	.stats-page-hero__copy {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.stats-page-hero__eyebrow {
		font-size: 0.76rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: color-mix(in oklab, oklch(var(--p)) 74%, oklch(var(--bc)));
	}

	.stats-page-hero__title {
		font-size: clamp(2rem, 3vw, 3.2rem);
		line-height: 0.96;
		font-weight: 800;
		letter-spacing: -0.045em;
		text-wrap: balance;
		color: oklch(var(--bc));
	}

	.stats-page-hero__description {
		max-width: 62ch;
		font-size: 0.98rem;
		line-height: 1.8;
		color: color-mix(in oklab, oklch(var(--bc)) 72%, white);
	}

	.stats-page-hero__freshness {
		margin-top: 0.25rem;
		max-width: 52rem;
	}

	.stats-page-hero__metrics {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.stats-page-hero__metric {
		border-radius: 1.2rem;
		border: 1px solid color-mix(in oklab, oklch(var(--b3)) 72%, white);
		background: color-mix(in oklab, oklch(var(--b1)) 93%, white);
		padding: 0.95rem 1rem;
		box-shadow: 0 12px 32px rgba(15, 23, 42, 0.05);
	}

	.stats-page-hero__metric--primary {
		background: linear-gradient(180deg, rgba(59, 130, 246, 0.08), rgba(255, 255, 255, 0.92));
	}

	.stats-page-hero__metric--secondary {
		background: linear-gradient(180deg, rgba(16, 185, 129, 0.08), rgba(255, 255, 255, 0.92));
	}

	.stats-page-hero__metric--accent {
		background: linear-gradient(180deg, rgba(245, 158, 11, 0.08), rgba(255, 255, 255, 0.92));
	}

	.stats-page-hero__metric-label {
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: color-mix(in oklab, oklch(var(--bc)) 50%, white);
	}

	.stats-page-hero__metric-value {
		margin-top: 0.4rem;
		font-size: 1.4rem;
		line-height: 1.15;
		font-weight: 700;
		color: oklch(var(--bc));
	}

	.stats-page-hero__metric-note {
		margin-top: 0.35rem;
		font-size: 0.86rem;
		line-height: 1.5;
		color: color-mix(in oklab, oklch(var(--bc)) 62%, white);
	}

	@media (min-width: 1024px) {
		.stats-page-hero {
			grid-template-columns: minmax(0, 1.25fr) minmax(18rem, 0.75fr);
			padding: 1.6rem;
		}

		.stats-page-hero__metrics {
			align-self: stretch;
		}
	}

	@media (max-width: 640px) {
		.stats-page-hero {
			border-radius: 1.5rem;
			padding: 1rem;
		}

		.stats-page-hero__metrics {
			grid-template-columns: 1fr;
		}
	}
</style>
