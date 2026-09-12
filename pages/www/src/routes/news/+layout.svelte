<script lang="ts">
let { children } = $props();
</script>

<div class="content-page news-page">
	{@render children()}
</div>

<style>
	.news-page {
		width: 100%;
		min-width: 0;
		color: var(--color-base-content);
	}

</style>
