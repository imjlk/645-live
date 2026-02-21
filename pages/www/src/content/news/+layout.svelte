<script lang="ts">
	import LottoNumbers from '$lib/components/news/LottoNumbers.svelte';
	import Card from '$lib/ui/Card.svelte';
	import Alert from '$lib/components/news/Alert.svelte';
	import Table from '$lib/components/news/Table.svelte';
	import Chart from '$lib/components/news/Chart.svelte';
	import RegionalMap from '$lib/components/news/RegionalMap.svelte';
	import Tabs from '$lib/components/news/Tabs.svelte';
	import TabsList from '$lib/components/news/TabsList.svelte';
	import TabsTrigger from '$lib/components/news/TabsTrigger.svelte';
	import TabsContent from '$lib/components/news/TabsContent.svelte';

	export { LottoNumbers, Card, Alert, Table, Chart, RegionalMap, Tabs, TabsList, TabsTrigger, TabsContent };

	let { children } = $props();
</script>

<!-- 기본 뉴스 기사 레이아웃 -->
<div class="prose prose-lg max-w-none">
	{@render children()}
</div>

<style>
	:global(.prose) {
		max-width: none;
		color: var(--color-base-content, #1f2937);
	}
	
	:global(.prose h1) {
		font-size: 1.875rem; /* text-3xl */
		line-height: 2.25rem;
		font-weight: 700;
		color: var(--color-primary); /* text-primary */
		margin-bottom: 1.5rem;
	}
	
	:global(.prose h2) {
		font-size: 1.5rem; /* text-2xl */
		line-height: 2rem;
		font-weight: 700;
		color: var(--color-primary);
		margin-top: 2rem;
		margin-bottom: 1rem;
	}
	
	:global(.prose h3) {
		font-size: 1.25rem; /* text-xl */
		line-height: 1.75rem;
		font-weight: 600;
		color: var(--color-secondary);
		margin-top: 1.5rem;
		margin-bottom: 0.75rem;
	}
	
	:global(.prose h4) {
		font-size: 1.125rem; /* text-lg */
		line-height: 1.75rem;
		font-weight: 600;
		color: var(--color-base-content);
		margin-top: 1rem;
		margin-bottom: 0.5rem;
	}
	
	:global(.prose p) {
		margin-bottom: 1rem;
		line-height: 1.625;
	}
	
	:global(.prose ul) {
		list-style-type: disc;
		list-style-position: inside;
		margin-bottom: 1rem;
	}
	
	:global(.prose ol) {
		list-style-type: decimal;
		list-style-position: inside;
		margin-bottom: 1rem;
	}
	
	:global(.prose li) {
		margin-bottom: 0.25rem;
	}
	
	:global(.prose blockquote) {
		border-left-width: 4px;
		border-color: var(--color-primary);
		padding-left: 1rem;
		font-style: italic;
		color: var(--color-base-content);
		opacity: 0.8;
		margin-top: 1rem;
		margin-bottom: 1rem;
	}
	
	:global(.prose code) {
		background-color: var(--color-base-200, #e5e7eb);
		padding: 0.125rem 0.25rem;
		border-radius: 0.25rem;
		font-size: 0.875rem;
	}
	
	:global(.prose pre) {
		background-color: var(--color-base-200, #e5e7eb);
		padding: 1rem;
		border-radius: 0.5rem;
		overflow-x: auto;
		margin-top: 1rem;
		margin-bottom: 1rem;
	}
	
	:global(.prose pre code) {
		background-color: transparent;
		padding: 0;
	}
	
	:global(.prose table) {
		width: 100%;
		margin-top: 1.5rem;
		margin-bottom: 1.5rem;
		border-collapse: collapse;
	}
	
	:global(.prose th) {
		background-color: var(--color-base-300, #d1d5db);
		padding: 0.75rem;
		text-align: left;
	}

    :global(.prose td) {
        padding: 0.75rem;
        border-bottom-width: 1px;
        border-color: var(--color-base-200);
    }
	
	:global(.prose img) {
		border-radius: 0.5rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		margin-top: 1rem;
		margin-bottom: 1rem;
	}
</style>
