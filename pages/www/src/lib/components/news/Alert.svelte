<script lang="ts">
let { type = "info", children, class: customClass = "" } = $props();
</script>

<aside class={`news-note ${customClass}`.trim()} data-type={type} role="note">
	{@render children?.()}
</aside>

<style>
	.news-note { padding: 16px 20px; margin-block: 24px; background: var(--color-base-200); border-left: 3px solid var(--color-base-300); border-radius: 0 6px 6px 0; color: color-mix(in oklab, var(--color-base-content) 75%, transparent); font-size: 0.875rem; line-height: 1.75; }
	.news-note[data-type='warning'], .news-note[data-type='error'] { border-left-color: var(--color-primary); }
</style>
