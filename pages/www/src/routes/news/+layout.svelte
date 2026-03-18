<script lang="ts">
	let { children } = $props();
</script>

<!-- News Layout: Nests inside global +layout.svelte -->
<div>
	<div class="bg-base-100 rounded-box shadow-sm p-6 md:p-8">
		{@render children()}
	</div>
</div>
