<script lang="ts">
interface StatItem {
  title: string;
  value: string | number;
  description?: string;
  theme?: "primary" | "secondary" | "accent" | "info" | "success" | "warning" | "error";
}

interface StatsSummaryProps {
  stats: StatItem[];
  columns?: number;
}

let { stats, columns = 4 }: StatsSummaryProps = $props();

const getThemeClass = (theme: string = "primary"): string => {
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

<div class="grid {getGridClass(columns)} gap-3 sm:gap-4">
  {#each stats as stat}
    <div class="stat {getThemeClass(stat.theme)} rounded-lg p-3 sm:p-4">
      <div class="stat-title text-xs sm:text-sm opacity-70">{stat.title}</div>
      <div class="stat-value text-xl sm:text-2xl">{stat.value}</div>
      {#if stat.description}
        <div class="stat-desc text-xs opacity-70">{stat.description}</div>
      {/if}
    </div>
  {/each}
</div>