<script lang="ts">
let {
	color,
	count,
	size = "normal",
}: {
	color: "yellow" | "blue" | "red" | "grey" | "green";
	count: number | string;
	size?: "small" | "normal" | "large";
} = $props();
const labels = {
	yellow: "노랑",
	blue: "파랑",
	red: "빨강",
	grey: "회색",
	green: "초록",
};
</script>

<span class="color-badge {size}" aria-label={`${labels[color]} ${count}`} style={`background: var(--lotto-${color}); color: var(--lotto-${color}-content)`}>{count}</span>

<style>
	.color-badge { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 50%; font-weight: 700; font-variant-numeric: tabular-nums; width: 1.5rem; height: 1.5rem; font-size: 0.75rem; }
	.small { width: 1.25rem; height: 1.25rem; font-size: 0.7rem; }
	.large { width: 2rem; height: 2rem; font-size: 0.875rem; }
</style>
