<script lang="ts">
let { children } = $props();
</script>

<div class="news-page">
	{@render children()}
</div>

<style>
	.news-page {
		width: 100%;
		max-width: 1200px;
		min-width: 0;
		margin-inline: auto;
		padding: 24px 16px 48px;
		color: var(--color-base-content);
	}

	@media (min-width: 768px) {
		.news-page { padding: 40px 32px 64px; }
	}
</style>
