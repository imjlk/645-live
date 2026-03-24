<script lang="ts">
interface StatItem {
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
}

interface StatsSummaryProps {
	stats: StatItem[];
	columns?: number;
}

let { stats, columns = 4 }: StatsSummaryProps = $props();

const getThemeClass = (theme = "primary"): string => {
	const themeMap: Record<string, string> = {
		primary: "bg-primary text-primary-content",
		secondary: "bg-secondary text-secondary-content",
		accent: "bg-accent text-accent-content",
		info: "bg-info text-info-content",
		success: "bg-success text-success-content",
		warning: "bg-warning text-warning-content",
		error: "bg-error text-error-content",
	};
	return themeMap[theme] || themeMap.primary;
};

const getGridClass = (cols: number): string => {
	const gridMap: Record<number, string> = {
		1: "grid-cols-1",
		2: "grid-cols-2",
		3: "grid-cols-3",
		4: "grid-cols-2 sm:grid-cols-2 md:grid-cols-4",
		5: "grid-cols-1 md:grid-cols-2 lg:grid-cols-5",
		6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
	};
	return gridMap[cols] || "grid-cols-4";
};
</script>

<div class="stats-summary-grid {getGridClass(columns)}">
  {#each stats as stat (stat.title)}
    <div class="stats-summary-card">
      <div class="stats-summary-card__accent {getThemeClass(stat.theme)}"></div>
      <div class="stats-summary-card__body">
        <div class="stats-summary-card__title">{stat.title}</div>
        <div class="stats-summary-card__value">{stat.value}</div>
        {#if stat.description}
          <div class="stats-summary-card__description">{stat.description}</div>
        {/if}
      </div>
    </div>
  {/each}
</div>

<style>
  .stats-summary-grid {
    display: grid;
    gap: 0.85rem;
  }

  .stats-summary-card {
    position: relative;
    overflow: hidden;
    display: flex;
    min-height: 8.5rem;
    border-radius: 1.35rem;
    border: 1px solid color-mix(in oklab, oklch(var(--b3)) 72%, white);
    background:
      linear-gradient(180deg, color-mix(in oklab, oklch(var(--b1)) 96%, white), color-mix(in oklab, oklch(var(--b1)) 92%, white));
    box-shadow: 0 16px 38px rgba(15, 23, 42, 0.05);
  }

  .stats-summary-card__accent {
    width: 0.45rem;
    flex-shrink: 0;
  }

  .stats-summary-card__body {
    padding: 1rem 1rem 0.95rem;
  }

  .stats-summary-card__title {
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: color-mix(in oklab, oklch(var(--bc)) 56%, white);
  }

  .stats-summary-card__value {
    margin-top: 0.55rem;
    font-size: clamp(1.4rem, 2vw, 2.2rem);
    line-height: 1.05;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: oklch(var(--bc));
  }

  .stats-summary-card__description {
    margin-top: 0.45rem;
    font-size: 0.82rem;
    line-height: 1.55;
    color: color-mix(in oklab, oklch(var(--bc)) 62%, white);
  }

  @media (max-width: 640px) {
    .stats-summary-card {
      min-height: 7.8rem;
    }

    .stats-summary-card__body {
      padding: 0.9rem;
    }
  }
</style>
