<script lang="ts">
	import NewsLayout from '../../../../content/news/+layout.svelte';
	let { data } = $props();
</script>

<NewsLayout>
	<svelte:component this={data.content} />
</NewsLayout>