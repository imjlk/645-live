<script lang="ts">
	// News index page - list all news articles
	import { createCollectionPageSchema, createItemListSchema, absoluteUrl } from "$lib/seo/index.js";
	import { JsonLd, MetaTags } from "svelte-meta-tags";

	type NewsPost = {
		slug: string;
		title: string;
		date: string;
		description: string;
		category: string;
		thumbnail: string;
	};

	type FeedInsertion = {
		key: string;
		afterPostIndex: number;
		colSpan: 'normal' | 'wide' | 'full';
		label?: string;
	};

	type FeedItem =
		| {
			type: 'post';
			key: string;
			colSpan: 'normal';
			post: NewsPost;
		}
		| {
			type: 'insertion';
			key: string;
			colSpan: 'normal' | 'wide' | 'full';
			label?: string;
		};

	let { data } = $props();
	const newsPosts = $derived((data.posts ?? []) as NewsPost[]);
	const pagination = $derived(data.pagination);
	const currentPage = $derived(pagination?.page ?? 1);
	const totalPages = $derived(pagination?.totalPages ?? 1);
	const totalPosts = $derived(pagination?.totalPosts ?? newsPosts.length);
	const pageTitle = $derived(currentPage > 1 ? `로또 뉴스 - ${currentPage}페이지 - 645.live` : '로또 뉴스 - 645.live');
	const canonicalUrl = $derived(currentPage > 1
		? `https://www.645.live/news?page=${currentPage}`
		: 'https://www.645.live/news');
	const collectionSchema = $derived(
		createCollectionPageSchema({
			path: currentPage > 1 ? `/news?page=${currentPage}` : "/news",
			name: currentPage > 1 ? `로또 뉴스 ${currentPage}페이지` : "로또 뉴스",
			description: "최신 로또 당첨 결과 분석과 통계 소식 모음",
		}),
	);
	const itemListSchema = $derived(
		createItemListSchema(
			currentPage > 1 ? `/news?page=${currentPage}` : "/news",
			newsPosts.map((post, index) => ({
				position: index + 1,
				name: post.title,
				url: absoluteUrl(hrefForPost(post.slug)),
			})),
		),
	);

	function hrefForPage(page: number) {
		return page <= 1 ? '/news' : `/news?page=${page}`;
	}

	function hrefForPost(slug: string) {
		return `/news/posts/${encodeURIComponent(slug)}`;
	}

	function normalizeFeedInsertions(raw: unknown): FeedInsertion[] {
		if (!Array.isArray(raw)) return [];

		return raw
			.map((value, index) => {
				const source = (value ?? {}) as Record<string, unknown>;
				const afterPostIndex = Number.parseInt(String(source['afterPostIndex'] ?? ''), 10);
				const colSpanValue = String(source['colSpan'] ?? 'full');
				const colSpan: FeedInsertion['colSpan'] = colSpanValue === 'normal' || colSpanValue === 'wide' ? colSpanValue : 'full';
				const labelValue = typeof source['label'] === 'string' ? source['label'] : null;
				const normalized: FeedInsertion = {
					key: String(source['key'] ?? `insertion-${index + 1}`),
					afterPostIndex: Number.isFinite(afterPostIndex) ? afterPostIndex : index,
					colSpan
				};
				if (labelValue !== null) {
					normalized.label = labelValue;
				}

				return normalized;
			})
			.filter((item) => item.afterPostIndex >= 0)
			.sort((a, b) => a.afterPostIndex - b.afterPostIndex);
	}

	function buildFeedItems(posts: NewsPost[], insertions: FeedInsertion[]): FeedItem[] {
		const items: FeedItem[] = [];
		const groupedInsertions = new Map<number, FeedInsertion[]>();

		for (const insertion of insertions) {
			const group = groupedInsertions.get(insertion.afterPostIndex) ?? [];
			group.push(insertion);
			groupedInsertions.set(insertion.afterPostIndex, group);
		}

		for (let index = 0; index < posts.length; index += 1) {
			const post = posts[index];
			if (!post) continue;
			items.push({
				type: 'post',
				key: `post-${post.slug}`,
				colSpan: 'normal',
				post
			});

			const pendingInsertions = groupedInsertions.get(index);
			if (!pendingInsertions) continue;

			for (const insertion of pendingInsertions) {
				items.push({
					type: 'insertion',
					key: `insertion-${insertion.key}`,
					colSpan: insertion.colSpan,
					...(insertion.label !== undefined ? { label: insertion.label } : {})
				});
			}
		}

		return items;
	}

	function feedColSpanClass(item: FeedItem): string {
		if (item.colSpan === 'wide') return 'md:col-span-2';
		if (item.colSpan === 'full') return 'md:col-span-2 lg:col-span-3';
		return '';
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
	const feedInsertions = $derived(normalizeFeedInsertions(data.feedInsertions));
	const feedItems = $derived(buildFeedItems(newsPosts, feedInsertions));
</script>

<svelte:head>
	<link rel="alternate" type="application/rss+xml" title="645.live 로또 뉴스 RSS" href="/feed.xml" />
</svelte:head>

<MetaTags
	title={pageTitle}
	description="최신 로또 당첨 결과 분석과 통계 뉴스를 제공하는 전문 뉴스 사이트"
	canonical={canonicalUrl}
	robots="index,follow"
	openGraph={{
		type: "website",
		url: canonicalUrl,
		title: pageTitle,
		description: "최신 로또 당첨 결과 분석과 통계 뉴스를 제공하는 전문 뉴스 사이트",
		siteName: "645.live",
	}}
	twitter={{
		cardType: "summary_large_image",
		site: "@645live",
		title: pageTitle,
		description: "최신 로또 당첨 결과 분석과 통계 뉴스를 제공하는 전문 뉴스 사이트",
	}}
/>

<JsonLd schema={collectionSchema} />
<JsonLd schema={itemListSchema} />

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
			{#each feedItems as item (item.key)}
				{#if item.type === 'post'}
					<article class={`card bg-base-200 shadow-lg hover:shadow-xl transition-shadow ${feedColSpanClass(item)}`}>
						<!-- Thumbnail -->
						<figure class="aspect-video">
							<img 
								src={item.post.thumbnail} 
								alt={item.post.title}
								class="w-full h-full object-cover"
								loading="lazy"
							/>
						</figure>
						
						<div class="card-body">
							<div class="flex items-center gap-2 text-sm text-base-content/70 mb-2">
								<span class="badge badge-primary badge-sm">{item.post.category}</span>
								<span>{item.post.date}</span>
							</div>
							
							<h2 class="card-title text-lg">
								<a href={hrefForPost(item.post.slug)} class="hover:text-primary transition-colors">
									{item.post.title}
								</a>
							</h2>
							
							<p class="text-base-content/80">{item.post.description}</p>
							
							<div class="card-actions justify-end">
								<a href={hrefForPost(item.post.slug)} class="btn btn-primary btn-sm">
									기사 읽기
								</a>
							</div>
						</div>
					</article>
				{:else}
					<section
						class={`card border border-dashed border-base-300 bg-base-100 ${feedColSpanClass(item)}`}
						data-feed-insertion={item.key}
						aria-label="중간 삽입 영역"
					>
						<div class="card-body p-4 sm:p-5">
							<p class="text-sm text-base-content/60">{item.label ?? '추가 컨텐츠 영역'}</p>
						</div>
					</section>
				{/if}
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
