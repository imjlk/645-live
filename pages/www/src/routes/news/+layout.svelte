<script lang="ts">
	import { page } from "$app/stores";
	
	let { children } = $props();
</script>

<!-- News Layout: Nests inside global +layout.svelte -->
<div class="flex flex-col gap-6">
	<!-- News Header Section -->
	<header class="text-center py-8">
		<h1 class="text-4xl font-bold text-primary mb-2">로또 뉴스</h1>
		<p class="text-base-content/70">최신 로또 당첨 결과 분석과 통계 뉴스를 제공합니다</p>
	</header>
	
	<!-- Content Wrapper -->
	<div class="bg-base-100 rounded-box shadow-sm p-6 md:p-8">
		{@render children()}
	</div>
</div>