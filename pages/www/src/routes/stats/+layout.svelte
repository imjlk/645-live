<script lang="ts">
import type { Snippet } from "svelte";

let { children }: { children: Snippet } = $props();
</script>

<div class="content-page stats-area">
	{@render children()}
</div>

<style>
	.stats-area { min-width: 0; }
	.stats-area :global(.stats-page) { display: grid; gap: 0; min-width: 0; }
	.stats-area :global(.stats-page > *) { min-width: 0; }
	.stats-area :global(.stats-page > * + *) { margin-top: var(--section-space); }
	.stats-area :global(.stats-page > .breadcrumbs + header), .stats-area :global(.stats-page > .breadcrumb + header) { margin-top: 0.75rem; }
	.stats-area :global(.grid > *), .stats-area :global(.card-body > *) { min-width: 0; }
	.stats-area :global(.card) { border-radius: 0; border: 0; border-top: 1px solid var(--color-base-300); background: transparent; box-shadow: none; }
	.stats-area :global(.card-body) { gap: 1rem; padding: var(--page-header-space) 0 0; min-width: 0; }
	.stats-area :global(.card-title) { flex-wrap: wrap; gap: 0.35rem 0.75rem; font-size: var(--section-title-size); line-height: 1.4; font-weight: 750; letter-spacing: -0.02em; }
	.stats-area :global(.stat) { min-width: 0; min-height: auto; padding: 1rem; border: 1px solid var(--color-base-300); border-radius: 0.75rem; background: var(--color-base-100); color: var(--color-base-content); }
	.stats-area :global(.stat-title), .stats-area :global(.stat-desc) { color: color-mix(in oklab, var(--color-base-content) 72%, transparent); white-space: normal; }
	.stats-area :global(.stat-value) { color: var(--color-base-content); font-variant-numeric: tabular-nums; }
	.stats-area :global(.overflow-x-auto) { min-width: 0; max-width: 100%; margin-inline: 0; }
	.stats-area :global(.table) { font-variant-numeric: tabular-nums; }
	.stats-area :global(.table th), .stats-area :global(.table td) { padding: 0.8rem; font-size: 0.875rem; }
	.stats-area :global(.table th) { color: color-mix(in oklab, var(--color-base-content) 78%, transparent); }
	.stats-area :global(.table-zebra tbody tr:nth-child(even)) { background: var(--color-base-200); }
	.stats-area :global(.stats-recent-heading) { display: grid; gap: 0.65rem; text-align: left; }
	.stats-area :global(.stats-recent-heading > *) { margin: 0; }
	.stats-area :global(.stats-recent-heading h1) { padding: 0; color: var(--color-base-content); font-size: var(--page-title-size); line-height: var(--page-title-line-height); font-weight: var(--page-title-weight); letter-spacing: var(--page-title-tracking); text-wrap: balance; }
	.stats-area :global(.stats-recent-heading > p) { max-width: var(--reading-width); color: color-mix(in oklab, var(--color-base-content) 75%, transparent); font-size: var(--body-copy-size); line-height: var(--body-copy-line-height); }

	.stats-area :global(.text-blue-600), .stats-area :global(.text-blue-500) { color: var(--color-primary); }
	.stats-area :global(.text-red-600), .stats-area :global(.text-rose-600) { color: var(--color-error); }
	.stats-area :global(.text-green-600), .stats-area :global(.text-emerald-600) { color: var(--color-success); }
	.stats-area :global(.text-yellow-600), .stats-area :global(.text-orange-600) { color: var(--color-warning); }
	.stats-area :global(.stats-ball-yellow), .stats-area :global(.bg-yellow-500.text-white) { background: var(--lotto-yellow); color: var(--lotto-yellow-content); }
	.stats-area :global(.stats-ball-blue), .stats-area :global(.bg-blue-500.text-white) { background: var(--lotto-blue); color: var(--lotto-blue-content); }
	.stats-area :global(.stats-ball-red), .stats-area :global(.bg-red-500.text-white) { background: var(--lotto-red); color: var(--lotto-red-content); }
	.stats-area :global(.stats-ball-grey), .stats-area :global(.bg-gray-500.text-white) { background: var(--lotto-grey); color: var(--lotto-grey-content); }
	.stats-area :global(.stats-ball-green), .stats-area :global(.bg-green-500.text-white) { background: var(--lotto-green); color: var(--lotto-green-content); }
	.stats-area :global(.bg-orange-500.text-white) { background: color-mix(in oklab, var(--color-orange-500) 20%, var(--color-base-100)); color: var(--color-base-content); }
	.stats-area :global(.bg-purple-500.text-white) { background: color-mix(in oklab, var(--color-purple-500) 20%, var(--color-base-100)); color: var(--color-base-content); }
	.stats-area :global(.bg-pink-500.text-white) { background: color-mix(in oklab, var(--color-pink-500) 20%, var(--color-base-100)); color: var(--color-base-content); }
	.stats-area :global(.bg-indigo-500.text-white) { background: color-mix(in oklab, var(--color-indigo-500) 20%, var(--color-base-100)); color: var(--color-base-content); }
	.stats-area :global(.bg-teal-500.text-white) { background: color-mix(in oklab, var(--color-teal-500) 20%, var(--color-base-100)); color: var(--color-base-content); }
	@media (max-width: 640px) {
		.stats-area :global(.btn-sm), .stats-area :global(.input-sm) { min-height: 2.75rem; }
	}
</style>
