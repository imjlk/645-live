<script lang="ts">
import { JsonLd } from "svelte-meta-tags";

export interface BreadcrumbItem {
	label: string;
	href?: string;
	current?: boolean;
}

interface Props {
	items?: BreadcrumbItem[];
}

let { items = [] }: Props = $props();

// JSON-LD 스키마 생성
const breadcrumbSchema = $derived({
	"@type": "BreadcrumbList",
	itemListElement: items.map((item, index) => ({
		"@type": "ListItem",
		position: index + 1,
		name: item.label,
		...(item.href && { item: `https://645.live${item.href}` }),
	})),
});
</script>

<!-- JSON-LD 스키마 -->
<JsonLd schema={breadcrumbSchema} />

<!-- Breadcrumbs UI -->
<div class="breadcrumbs text-sm">
	<ul>
		{#each items as item}
			<li>
				{#if item.href && !item.current}
					<a href={item.href} class="hover:text-primary">{item.label}</a>
				{:else}
					<span class="text-base-content/70">{item.label}</span>
				{/if}
			</li>
		{/each}
	</ul>
</div>

<style>
	.breadcrumbs { min-width: 0; max-width: 100%; padding: 0; font-size: 0.8125rem; line-height: 1.6; }
	ul { width: auto; max-width: 100%; flex-wrap: wrap; row-gap: 0.25rem; }
	li, a, span { min-width: 0; }
	a, span { white-space: normal; overflow-wrap: anywhere; }
</style>
