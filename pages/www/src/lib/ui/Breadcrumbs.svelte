<script lang="ts">
import { JsonLd } from 'svelte-meta-tags';

export interface BreadcrumbItem {
	label: string;
	href?: string;
	current?: boolean;
}

export let items: BreadcrumbItem[] = [];
export let siteName = "645.live";

// JSON-LD 스키마 생성
$: breadcrumbSchema = {
	'@type': 'BreadcrumbList',
	itemListElement: items.map((item, index) => ({
		'@type': 'ListItem',
		position: index + 1,
		name: item.label,
		...(item.href && { item: `https://645.live${item.href}` })
	}))
};
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