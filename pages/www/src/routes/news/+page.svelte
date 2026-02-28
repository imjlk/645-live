<script lang="ts">
	// News index page - list all news articles
	import { MetaTags } from "svelte-meta-tags";
    
    let { data } = $props();
    const newsPosts = data.posts;
</script>

<MetaTags
	title="로또 뉴스 - 645.live"
	description="최신 로또 당첨 결과 분석과 통계 뉴스를 제공하는 전문 뉴스 사이트"
	canonical="https://www.645.live/news"
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
			{#each newsPosts as post}
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
							<a href="/news/posts/{post.slug}" class="hover:text-primary transition-colors">
								{post.title}
							</a>
						</h2>
						
						<p class="text-base-content/80">{post.description}</p>
						
						<div class="card-actions justify-end">
							<a href="/news/posts/{post.slug}" class="btn btn-primary btn-sm">
								읽기
							</a>
						</div>
					</div>
				</article>
			{/each}
		</div>
	{/if}
</div>
