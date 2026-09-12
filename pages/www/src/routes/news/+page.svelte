<script lang="ts">
import { JsonLd, MetaTags } from "svelte-meta-tags";
import { resolve } from "$app/paths";
import AdSlot from "$lib/components/ads/AdSlot.svelte";
import {
	absoluteUrl,
	createBreadcrumbSchema,
	createCollectionPageSchema,
	createItemListSchema,
	DATA_SOURCES_PATH,
	EDITORIAL_POLICY_PATH,
	getGenericOgImage,
} from "$lib/seo/index.js";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();
const posts = $derived(data.posts);
const featured = $derived(posts[0]);
const remainingPosts = $derived(posts.slice(1));
const pagination = $derived(data.pagination);
const currentPage = $derived(pagination.page);
const pageTitle = $derived(
	currentPage > 1
		? `로또 뉴스 ${currentPage}페이지 · 회차별 결과 해설 | 645.live`
		: "로또 뉴스 · 회차별 당첨 결과와 해설 | 645.live",
);
const pagePath = $derived(hrefForPage(currentPage));
const canonicalUrl = $derived(absoluteUrl(pagePath));
const articleRange = $derived(
	`${roundLabel(posts[0]?.slug)}${posts.length > 1 ? `부터 ${roundLabel(posts.at(-1)?.slug)}까지` : ""}`,
);
const pageDescription = $derived(
	currentPage > 1
		? `로또 뉴스 ${currentPage}페이지에서 ${articleRange}의 결과를 확인하세요. 회차별 당첨번호와 1등 당첨금, 당첨자 수, 지역별 판매점 분포를 정리했습니다. 공식 추첨 결과와 645.live 등록 스캔 집계를 구분해 해설합니다.`
		: "로또 6/45 회차별 당첨번호와 1등 당첨금, 당첨자 수, 지역별 판매점 정보를 기사로 확인하세요. 공식 추첨 결과와 645.live 등록 스캔 집계를 구분해 해설하며, 기사마다 발행 시각과 데이터 출처를 안내합니다.",
);
const ogImage = $derived(
	getGenericOgImage({
		title: "로또 뉴스",
		description: "회차별 당첨 결과와 해설",
		alt: "645.live 로또 뉴스",
	}),
);
const collectionSchema = $derived(
	createCollectionPageSchema({
		path: pagePath,
		name: pageTitle,
		description: pageDescription,
	}),
);
const itemListSchema = $derived(
	createItemListSchema(
		pagePath,
		posts.map((post, index) => ({
			position: (currentPage - 1) * pagination.pageSize + index + 1,
			name: post.title,
			url: absoluteUrl(`/news/posts/${encodeURIComponent(post.slug)}`),
		})),
	),
);
const breadcrumbSchema = $derived(
	createBreadcrumbSchema([
		{ name: "홈", path: "/" },
		{ name: "로또 뉴스", path: "/news" },
		...(currentPage > 1
			? [{ name: `${currentPage}페이지`, path: pagePath }]
			: []),
	]),
);
const visiblePages = $derived.by(() => {
	const start = Math.max(
		1,
		Math.min(currentPage - 2, pagination.totalPages - 4),
	);
	return Array.from(
		{ length: Math.min(5, pagination.totalPages) },
		(_, index) => start + index,
	);
});

function hrefForPage(page: number): "/news" | `/news?${string}` {
	return page <= 1 ? "/news" : `/news?page=${page}`;
}

function roundLabel(slug?: string): string {
	const round = slug?.match(/^lotto-(\d+)$/)?.[1];
	return round ? `제${round}회` : "이전 기사";
}

function dateLabel(date: string): string {
	return date.slice(0, 10).replaceAll("-", ".");
}
</script>

<svelte:head>
	<link rel="alternate" type="application/rss+xml" title="645.live 로또 뉴스 RSS" href="/feed.xml" />
	{#if pagination.prevPage}<link rel="prev" href={absoluteUrl(hrefForPage(pagination.prevPage))} />{/if}
	{#if pagination.nextPage}<link rel="next" href={absoluteUrl(hrefForPage(pagination.nextPage))} />{/if}
</svelte:head>

<MetaTags
	title={pageTitle}
	description={pageDescription}
	canonical={canonicalUrl}
	robots="index,follow,max-image-preview:large"
	openGraph={{ type: 'website', url: canonicalUrl, title: pageTitle, description: pageDescription, siteName: '645.live', images: [ogImage] }}
	twitter={{ cardType: 'summary_large_image', site: '@645live', title: pageTitle, description: pageDescription, image: ogImage.url, imageAlt: ogImage.alt }}
/>
<JsonLd schema={collectionSchema} />
<JsonLd schema={itemListSchema} />
<JsonLd schema={breadcrumbSchema} />

<header class="page-heading page-header">
	<div>
		<p class="eyebrow">회차별 결과 해설</p>
		<h1 class="page-title">로또 뉴스</h1>
		<p class="intro">당첨번호와 당첨금, 지역별 판매점 정보를 함께 살펴보세요.</p>
	</div>
	<a class="text-link" href={resolve('/history')}>회차별 결과 <span aria-hidden="true">→</span></a>
</header>

{#if featured}
	<article class="featured-story">
		<a class="feature-image" href={resolve('/news/posts/[slug]', { slug: featured.slug })} aria-label={featured.title}>
			<img src={featured.thumbnail} alt="" width="1200" height="630" fetchpriority="high" decoding="async" />
		</a>
		<div class="feature-copy">
			<div class="story-meta">
				<span>{currentPage === 1 ? '최근 발행' : `${currentPage}페이지`}</span>
				<time datetime={featured.publishedAt || featured.date}>{dateLabel(featured.publishedAt || featured.date)}</time>
			</div>
			<h2><a href={resolve('/news/posts/[slug]', { slug: featured.slug })}>{featured.title}</a></h2>
			<p>{featured.summary}</p>
			<a class="text-link" href={resolve('/news/posts/[slug]', { slug: featured.slug })} aria-label={`${featured.title} 기사 읽기`}>기사 읽기 <span aria-hidden="true">→</span></a>
		</div>
	</article>

	{#if remainingPosts.length > 0}
	<div class="section-heading">
		<h2>회차별 기사</h2>
		<span>총 {pagination.totalPosts}개</span>
	</div>
	<div class="story-list">
		{#each remainingPosts as post, index (post.slug)}
			<article class="story-row">
				<a class="story-image" href={resolve('/news/posts/[slug]', { slug: post.slug })} aria-label={post.title}>
					<img src={post.thumbnail} alt="" width="1200" height="630" loading="lazy" decoding="async" />
				</a>
				<div class="story-copy">
					<div class="story-meta">
						<span>{roundLabel(post.slug)}</span>
						<time datetime={post.publishedAt || post.date}>{dateLabel(post.publishedAt || post.date)}</time>
					</div>
					<h3><a href={resolve('/news/posts/[slug]', { slug: post.slug })}>{post.title}</a></h3>
					<p>{post.summary}</p>
				</div>
				<a class="row-arrow" href={resolve('/news/posts/[slug]', { slug: post.slug })} aria-label={`${post.title} 기사 읽기`}>↗</a>
			</article>
			{#if index === 3}<AdSlot placement="news-inline" format="horizontal" />{/if}
		{/each}
	</div>

	{/if}

	{#if pagination.totalPages > 1}
		<nav class="pagination" aria-label="뉴스 페이지">
			{#if pagination.prevPage}
				<a class="page-direction" href={resolve(hrefForPage(pagination.prevPage))} rel="prev">이전</a>
			{:else}<span class="page-direction disabled" aria-disabled="true">이전</span>{/if}
			<div class="page-numbers">
				{#each visiblePages as page (page)}
					<a href={resolve(hrefForPage(page))} class:current={page === currentPage} aria-current={page === currentPage ? 'page' : undefined} aria-label={`${page}페이지`}>{page}</a>
				{/each}
			</div>
			{#if pagination.nextPage}
				<a class="page-direction" href={resolve(hrefForPage(pagination.nextPage))} rel="next">다음</a>
			{:else}<span class="page-direction disabled" aria-disabled="true">다음</span>{/if}
		</nav>
	{/if}
{:else}
	<section class="empty-state">
		<h2>아직 발행된 기사가 없어요</h2>
		<p>회차별 당첨 결과와 번호 통계는 바로 확인할 수 있습니다.</p>
		<a class="text-link" href={resolve('/stats')}>번호 통계 보기 <span aria-hidden="true">→</span></a>
	</section>
{/if}

<footer class="editorial-footer">
	<p>공식 추첨 결과와 이 사이트에 등록된 스캔 집계를 구분해 작성합니다.</p>
	<nav aria-label="뉴스 작성 안내">
		<a href={resolve(EDITORIAL_POLICY_PATH)}>편집 원칙</a>
		<a href={resolve(DATA_SOURCES_PATH)}>데이터 출처</a>
	</nav>
</footer>

<style>
	.page-heading { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: end; gap: 16px 24px; margin-bottom: 0; padding-bottom: var(--page-header-space); border-bottom: 1px solid var(--color-base-300); }
	.eyebrow { margin: 0 0 8px; color: var(--color-primary); font-size: 0.75rem; font-weight: 700; letter-spacing: 0.04em; }
	.page-heading > div, .feature-copy, .story-copy { min-width: 0; }
	.intro { margin: 0.6rem 0 0; color: var(--text-muted); font-size: var(--body-copy-size); line-height: var(--body-copy-line-height); }
	.text-link { display: inline-flex; align-items: center; min-height: 44px; gap: 12px; font-size: 0.875rem; font-weight: 650; color: var(--color-primary); text-decoration: none; white-space: nowrap; }
	.text-link:hover { text-decoration: underline; text-underline-offset: 5px; }
	.text-link span { transition: transform 160ms ease; }
	.text-link:hover span { transform: translateX(3px); }
	.featured-story { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: clamp(1.5rem, 3vw, 2.25rem); align-items: center; padding-block: var(--page-header-space) var(--section-space); }
	.feature-image, .story-image { display: block; overflow: hidden; border-radius: 8px; background: var(--color-base-200); }
	img { width: 100%; height: auto; aspect-ratio: 1200 / 630; object-fit: cover; transition: transform 240ms ease; }
	.feature-image:hover img, .story-image:hover img { transform: scale(1.025); }
	.story-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px; color: color-mix(in oklab, var(--color-base-content) 60%, transparent); font-size: 0.75rem; font-variant-numeric: tabular-nums; }
	.story-meta > span { color: var(--color-primary); font-weight: 650; }
	h2, h3 { color: var(--color-base-content); font-weight: 750; }
	h2 a, h3 a { color: inherit; text-decoration: none; }
	h2 a:hover, h3 a:hover { color: var(--color-primary); }
	.feature-copy h2 { margin: 12px 0; font-size: clamp(1.25rem, 2.2vw, 1.625rem); line-height: 1.4; letter-spacing: -0.04em; text-wrap: pretty; }
	.feature-copy p { margin: 0 0 16px; font-size: 0.9375rem; line-height: 1.7; color: color-mix(in oklab, var(--color-base-content) 70%, transparent); }
	.section-heading { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 8px 16px; margin-bottom: 0; padding-block: 0 16px; border-bottom: 2px solid var(--color-base-content); }
	.section-heading h2 { margin: 0; font-size: var(--section-title-size); }
	.section-heading span { color: color-mix(in oklab, var(--color-base-content) 55%, transparent); font-size: 0.8125rem; }
	.story-row { display: grid; grid-template-columns: 190px minmax(0, 1fr) 44px; gap: 28px; align-items: center; padding-block: 24px; border-bottom: 1px solid var(--color-base-300); }
	.story-copy h3 { margin: 8px 0; font-size: 1.1875rem; letter-spacing: -0.025em; line-height: 1.5; }
	.story-copy p { margin: 0; color: color-mix(in oklab, var(--color-base-content) 65%, transparent); font-size: 0.875rem; line-height: 1.65; }
	.row-arrow { display: grid; place-items: center; min-width: 44px; min-height: 44px; color: color-mix(in oklab, var(--color-base-content) 55%, transparent); font-size: 1.5rem; text-decoration: none; border-radius: 50%; transition: background 160ms ease, color 160ms ease; }
	.row-arrow:hover { background: var(--color-base-200); color: var(--color-primary); }
	.pagination { display: flex; align-items: center; justify-content: center; gap: 24px; margin-top: var(--page-header-space); font-size: 0.875rem; }
	.page-numbers { display: flex; gap: 4px; }
	.pagination a, .page-direction { display: grid; place-items: center; min-width: 44px; min-height: 44px; color: inherit; text-decoration: none; border-radius: 6px; }
	.pagination a:hover { background: var(--color-base-200); }
	.pagination a.current { background: var(--color-primary); color: var(--color-primary-content); font-weight: 700; }
	.disabled { opacity: 0.35; }
	.editorial-footer { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 24px; margin-top: var(--section-space); padding-top: var(--page-header-space); border-top: 1px solid var(--color-base-300); color: color-mix(in oklab, var(--color-base-content) 60%, transparent); font-size: 0.8125rem; line-height: 1.7; }
	.editorial-footer p { margin: 0; }
	.editorial-footer nav { display: flex; flex-wrap: wrap; gap: 8px 20px; }
	.editorial-footer a { display: inline-flex; align-items: center; min-height: 32px; text-decoration: none; color: inherit; }
	.editorial-footer a:hover { color: var(--color-primary); text-decoration: underline; }
	.empty-state { padding-block: 64px; }
	.empty-state h2 { font-size: 1.375rem; margin-bottom: 12px; }
	.empty-state p { color: color-mix(in oklab, var(--color-base-content) 65%, transparent); }
	@media (max-width: 767px) {
		.page-heading { gap: 16px; align-items: start; }
		.page-heading > .text-link { align-self: start; }
		.featured-story { grid-template-columns: 1fr; gap: 20px; padding-block: 24px 32px; }
		.feature-copy h2 { font-size: 1.25rem; }
		.feature-copy p { margin-bottom: 8px; }
		.story-row { grid-template-columns: minmax(0, 1fr) 96px; gap: 16px; padding-block: 20px; align-items: start; }
		.story-image { grid-column: 2; grid-row: 1; margin-top: 4px; }
		.story-copy { grid-column: 1; grid-row: 1; }
		.story-copy h3 { font-size: 1rem; margin-bottom: 0; }
		.story-copy p, .row-arrow { display: none; }
		.pagination { gap: 8px; }
	}
	@media (max-width: 479px) {
		.pagination { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
		.page-numbers { grid-column: 1 / -1; grid-row: 1; justify-content: center; flex-wrap: wrap; }
		.page-direction { grid-row: 2; }
		.page-direction:first-child { justify-self: start; }
		.page-direction:last-child { justify-self: end; }
	}
	@media (prefers-reduced-motion: reduce) {
		img, .text-link span, .row-arrow { transition: none; }
	}
</style>
