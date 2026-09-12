<script lang="ts">
let { children } = $props();
</script>

<div class="article-prose">
	{@render children()}
</div>

<style>
	.article-prose { min-width: 0; max-width: var(--reading-width); color: var(--color-base-content); font-size: var(--body-copy-size); line-height: var(--body-copy-line-height); overflow-wrap: anywhere; }
	.article-prose > :global(h2) { margin: var(--section-space) 0 16px; font-size: var(--section-title-size); line-height: 1.45; font-weight: 750; letter-spacing: -0.025em; color: var(--color-base-content); }
	.article-prose > :global(h3) { margin: 28px 0 12px; font-size: 1rem; line-height: 1.5; font-weight: 700; }
	.article-prose > :global(p) { margin: 0 0 20px; color: color-mix(in oklab, var(--color-base-content) 85%, transparent); }
	.article-prose > :global(ul), .article-prose > :global(ol) { margin: 0 0 24px; padding-left: 1.3em; }
	.article-prose > :global(ul) { list-style-type: disc; }
	.article-prose > :global(ol) { list-style-type: decimal; }
	.article-prose > :global(ul li), .article-prose > :global(ol li) { padding-left: 3px; margin-bottom: 10px; }
	.article-prose > :global(blockquote) { padding-left: 20px; margin: 24px 0; border-left: 3px solid var(--color-primary); color: color-mix(in oklab, var(--color-base-content) 70%, transparent); }
	.article-prose > :global(p a), .article-prose > :global(ul a) { color: var(--color-primary); text-decoration: underline; text-underline-offset: 4px; }
	.article-prose > :global(pre) { padding: 16px; margin-block: 24px; border-radius: 8px; background: var(--color-base-200); overflow-x: auto; }
	.article-prose :global(table) { display: block; max-width: 100%; overflow-x: auto; }
	.article-prose :global(img) { max-width: 100%; height: auto; }
	.article-prose :global(.news-data-note) { font-size: 0.875rem; color: color-mix(in oklab, var(--color-base-content) 65%, transparent); margin-block: 16px 24px; }
	.article-prose :global(.news-related-links) { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 24px; border-top: 1px solid var(--color-base-300); margin-block: 20px 28px; }
	.article-prose :global(.news-related-link) { display: flex; gap: 16px; justify-content: space-between; align-items: start; padding-block: 16px; border-bottom: 1px solid var(--color-base-300); color: var(--color-base-content); text-decoration: none; line-height: 1.65; }
	.article-prose :global(.news-related-link strong) { display: block; font-size: 0.9375rem; font-weight: 650; }
	.article-prose :global(.news-related-link small) { display: block; margin-top: 4px; font-size: 0.8125rem; color: color-mix(in oklab, var(--color-base-content) 65%, transparent); }
	.article-prose :global(.news-related-link:hover strong) { color: var(--color-primary); }
	.article-prose :global(.news-related-link > span:last-child) { color: var(--color-primary); }
	@media (max-width: 600px) { .article-prose :global(.news-related-links) { grid-template-columns: 1fr; } }
</style>
