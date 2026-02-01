<script lang="ts">
	let { children } = $props();
</script>

<div class="prose prose-lg max-w-none">
	<!-- Article Header -->
	<div class="not-prose mb-8 pb-8 border-b border-base-300">
		<nav class="breadcrumbs text-sm mb-4">
			<ul>
				<li><a href="/" class="link link-hover">홈</a></li>
				<li><a href="/news" class="link link-hover">뉴스</a></li>
				<li class="text-base-content/70">분석 기사</li>
			</ul>
		</nav>
	</div>
	
	<!-- MDX Content -->
	<article class="mdx-content">
		{@render children()}
	</article>
	
	<!-- Article Footer -->
	<div class="not-prose mt-12 pt-8 border-t border-base-300">
		<div class="alert alert-info">
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
			</svg>
			<div>
				<h3 class="font-bold">건전한 복권 문화</h3>
				<div class="text-sm">복권은 건전한 오락문화입니다. 과도한 구매는 삼가해주세요.</div>
			</div>
		</div>
		
		<div class="flex justify-center mt-8">
			<a href="/news" class="btn btn-outline">뉴스 목록으로</a>
		</div>
	</div>
</div>

<style>
	/* MDX 컴포넌트 스타일링 */
	:global(.mdx-content) {
        color: var(--color-base-content, #1f2937);
	}
	
	:global(.mdx-content h2) {
		font-size: 1.5rem; /* text-2xl */
		font-weight: 700;
		margin-top: 2rem;
		margin-bottom: 1rem;
		color: var(--color-primary);
	}
	
	:global(.mdx-content h3) {
		font-size: 1.25rem; /* text-xl */
		font-weight: 600;
		margin-top: 1.5rem;
		margin-bottom: 0.75rem;
		color: var(--color-secondary);
	}
	
	:global(.mdx-content .card) {
        background-color: var(--color-base-200);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
	}
	
	:global(.mdx-content .alert) {
		margin-top: 1.5rem;
		margin-bottom: 1.5rem;
	}
	
	:global(.mdx-content table) {
		width: 100%;
        border-collapse: collapse;
	}
	
	:global(.mdx-content .grid) {
		gap: 1rem;
	}
</style>