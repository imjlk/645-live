<script lang="ts">
	// News index page - list all news articles
	import { MetaTags } from "svelte-meta-tags";

	let { data } = $props();
	const newsPosts = $derived(data.posts ?? []);
	const pagination = $derived(data.pagination);
	const currentPage = $derived(pagination?.page ?? 1);
	const totalPages = $derived(pagination?.totalPages ?? 1);
	const totalPosts = $derived(pagination?.totalPosts ?? newsPosts.length);
	const pageTitle = $derived(currentPage > 1 ? `로또 뉴스 - ${currentPage}페이지 - 645.live` : '로또 뉴스 - 645.live');
	const canonicalUrl = $derived(currentPage > 1
		? `https://www.645.live/news?page=${currentPage}`
		: 'https://www.645.live/news');

	function hrefForPage(page: number) {
		return page <= 1 ? '/news' : `/news?page=${page}`;
	}

	function hrefForPost(slug: string) {
		return `/news/posts/${encodeURIComponent(slug)}`;
	}

	function getVisiblePages(page: number, pages: number, windowSize = 5) {
		if (pages <= windowSize) return Array.from({ length: pages }, (_, i) => i + 1);
		const half = Math.floor(windowSize / 2);
		let start = Math.max(1, page - half);
		let end = Math.min(pages, start + windowSize - 1);
		start = Math.max(1, end - windowSize + 1);
		return Array.from({ length: end - start + 1 }, (_, i) => start + i);
	}

	const visiblePages = $derived(getVisiblePages(currentPage, totalPages));
</script>

<MetaTags
	title={pageTitle}
	description="최신 로또 당첨 결과 분석과 통계 뉴스를 제공하는 전문 뉴스 사이트"
	canonical={canonicalUrl}
/>

<div class="space-y-8">
	<!-- Page Header -->
	<div class="text-center">
		<h1 class="text-3xl font-bold text-base-content">📰 로또 뉴스</h1>
		<p class="text-base-content/70 mt-2">최신 로또 당첨 결과 분석과 통계 소식</p>
	</div>

	{#if newsPosts.length === 0}
		<!-- Empty State -->
		<div class="alert alert-info">
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
			</svg>
			<span>아직 등록된 뉴스가 없습니다.</span>
		</div>
	{:else}
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each newsPosts as post (post.slug)}
				<article class="card bg-base-200 shadow-lg hover:shadow-xl transition-shadow">
					<!-- Thumbnail -->
					<figure class="aspect-video">
						<img 
							src={post.thumbnail} 
							alt={post.title}
							class="w-full h-full object-cover"
							loading="lazy"
						/>
					</figure>
					
					<div class="card-body">
						<div class="flex items-center gap-2 text-sm text-base-content/70 mb-2">
							<span class="badge badge-primary badge-sm">{post.category}</span>
							<span>{post.date}</span>
						</div>
						
						<h2 class="card-title text-lg">
							<a href={hrefForPost(post.slug)} class="hover:text-primary transition-colors">
								{post.title}
							</a>
						</h2>
						
						<p class="text-base-content/80">{post.description}</p>
						
						<div class="card-actions justify-end">
							<a href={hrefForPost(post.slug)} class="btn btn-primary btn-sm">
								읽기
							</a>
						</div>
					</div>
				</article>
			{/each}
		</div>

		{#if totalPages > 1}
			<div class="mt-8 flex flex-col items-center gap-4">
				<p class="text-sm text-base-content/70">총 {totalPosts}개 기사 · {currentPage}/{totalPages}페이지</p>
					<nav class="join" aria-label="뉴스 페이지네이션">
					{#if pagination?.hasPrev && pagination?.prevPage}
						<a href={hrefForPage(pagination.prevPage)} class="join-item btn btn-outline btn-sm">이전</a>
					{:else}
						<button class="join-item btn btn-outline btn-sm btn-disabled" aria-disabled="true">이전</button>
					{/if}

					{#each visiblePages as page (page)}
						{#if page === currentPage}
							<button class="join-item btn btn-primary btn-sm" aria-current="page">{page}</button>
						{:else}
							<a href={hrefForPage(page)} class="join-item btn btn-outline btn-sm">{page}</a>
						{/if}
					{/each}

					{#if pagination?.hasNext && pagination?.nextPage}
						<a href={hrefForPage(pagination.nextPage)} class="join-item btn btn-outline btn-sm">다음</a>
					{:else}
						<button class="join-item btn btn-outline btn-sm btn-disabled" aria-disabled="true">다음</button>
					{/if}
				</nav>
			</div>
		{/if}
	{/if}
</div>
