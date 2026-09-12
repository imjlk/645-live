<script lang="ts">
let { children, class: customClass = "" } = $props();
</script>

<!-- Keyboard users need to focus this scrollable table region. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class={`news-table ${customClass}`.trim()} role="region" aria-label="회차 통계 데이터" tabindex="0">
	<table>{@render children?.()}</table>
</div>

<style>
	.news-table { overflow-x: auto; margin-block: 20px 28px; border-top: 1px solid var(--color-base-300); }
	table { width: 100%; border-collapse: collapse; font-size: 0.875rem; line-height: 1.6; font-variant-numeric: tabular-nums; }
	table :global(th) { padding: 12px 10px; text-align: right; font-size: 0.8125rem; font-weight: 650; background: var(--color-base-200); color: color-mix(in oklab, var(--color-base-content) 70%, transparent); white-space: nowrap; }
	table :global(td) { padding: 12px 10px; text-align: right; border-bottom: 1px solid var(--color-base-300); }
	table :global(th:first-child), table :global(td:first-child) { text-align: left; }
	table :global(tbody tr:hover) { background: color-mix(in oklab, var(--color-base-200) 60%, transparent); }
	.news-table:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 4px; }
</style>
