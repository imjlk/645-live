<script lang="ts">
import { JsonLd } from "svelte-meta-tags";
import { resolve } from "$app/paths";
import {
	AUTO_NEWS_AUTHOR_PATH,
	createBreadcrumbSchema,
	DATA_SOURCES_PATH,
	EDITORIAL_POLICY_PATH,
	formatVisibleDateTime,
	getAutoNewsAuthorUrl,
	getCanonicalNewsOgUrl,
	getSiteLogoUrl,
	isAbsoluteHttpUrl,
	SITE_NAME,
	SITE_ORIGIN,
	toIsoDateTime,
} from "$lib/seo/index.js";
import NewsLayout from "../../../../content/news/+layout.svelte";

let { data } = $props();

const postTitle = $derived(data.meta?.title || "로또 분석 기사");
const summary = $derived(
	data.meta?.summary || data.meta?.description || "로또 당첨 결과 해설",
);
const description = $derived(
	data.meta?.seoDescription || data.meta?.description || summary,
);
const round = $derived(data.slug.match(/^lotto-(\d+)$/)?.[1]);
const resultsPath = $derived(
	round ? (`/history?round=${round}` as const) : "/history",
);
const storesPath = $derived(
	round ? (`/winning-stores?round=${round}` as const) : "/winning-stores",
);
const canonicalUrl = $derived(`${SITE_ORIGIN}/news/posts/${data.slug}`);
const imageUrl = $derived.by(() =>
	typeof data.meta?.thumbnail === "string" &&
	isAbsoluteHttpUrl(data.meta.thumbnail)
		? data.meta.thumbnail
		: getCanonicalNewsOgUrl(data.slug, {
				date: data.meta?.date,
				publishedAt: data.meta?.publishedAt,
				updatedAt: data.meta?.updatedAt,
			}),
);
const datePublished = $derived(
	data.meta?.publishedAt || data.meta?.date || undefined,
);
const dateModified = $derived(
	data.meta?.updatedAt || datePublished || undefined,
);
const datePublishedIso = $derived(toIsoDateTime(datePublished));
const dateModifiedIso = $derived(toIsoDateTime(dateModified));
const publishedLabel = $derived(formatVisibleDateTime(datePublished));
const modifiedLabel = $derived(formatVisibleDateTime(dateModified));
const isGeneratedOgImage = $derived(
	imageUrl.startsWith(`${SITE_ORIGIN}/og/news/`),
);
const authorName = $derived(data.meta?.author || "645.live 자동뉴스");
const authorUrl = $derived(getAutoNewsAuthorUrl());
const breadcrumbSchema = $derived(
	createBreadcrumbSchema([
		{ name: "홈", path: "/" },
		{ name: "로또 뉴스", path: "/news" },
		{ name: postTitle, path: `/news/posts/${encodeURIComponent(data.slug)}` },
	]),
);
const articleJsonLd = $derived.by(() => ({
	"@context": "https://schema.org",
	"@type": "NewsArticle",
	headline: postTitle,
	description,
	datePublished: datePublishedIso,
	dateModified: dateModifiedIso,
	articleSection: data.meta?.category || undefined,
	mainEntityOfPage: canonicalUrl,
	thumbnailUrl: imageUrl,
	image: [
		{
			"@type": "ImageObject",
			url: imageUrl,
			width: 1200,
			height: 630,
		},
	],
	keywords: Array.isArray(data.meta?.tags)
		? data.meta.tags.join(", ")
		: undefined,
	author: {
		"@type": "Organization",
		name: authorName,
		url: authorUrl,
	},
	publisher: {
		"@type": "Organization",
		name: SITE_NAME,
		logo: {
			"@type": "ImageObject",
			url: getSiteLogoUrl(),
		},
	},
}));
const Content = $derived(data.content);
</script>

<svelte:head>
	<title>{postTitle} | 645.live</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonicalUrl} />

	<meta property="og:type" content="article" />
	<meta property="og:title" content={postTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:image" content={imageUrl} />
	<meta property="og:image:secure_url" content={imageUrl} />
	{#if isGeneratedOgImage}
		<meta property="og:image:type" content="image/png" />
		<meta property="og:image:width" content="1200" />
		<meta property="og:image:height" content="630" />
	{/if}
	<meta property="og:image:alt" content={postTitle} />
	<meta property="og:site_name" content={SITE_NAME} />
	{#if datePublishedIso}
		<meta property="article:published_time" content={datePublishedIso} />
	{/if}
	{#if dateModifiedIso}
		<meta property="article:modified_time" content={dateModifiedIso} />
	{/if}
	<meta name="robots" content="index,follow,max-image-preview:large" />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={postTitle} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={imageUrl} />
	<meta name="twitter:image:alt" content={postTitle} />
	{#if Array.isArray(data.meta?.tags) && data.meta.tags.length > 0}
		<meta name="news_keywords" content={data.meta.tags.join(', ')} />
	{/if}
</svelte:head>

<JsonLd schema={articleJsonLd} />
<JsonLd schema={breadcrumbSchema} />

<nav class="article-breadcrumb" aria-label="현재 위치">
	<a href={resolve('/news')}>로또 뉴스</a>
	<span aria-hidden="true">/</span>
	<span>{round ? `제${round}회` : '회차 해설'}</span>
</nav>

<div class="article-layout">
	<article class="article-main">
		<header class="article-heading">
			<p class="article-category">회차별 결과 해설</p>
			<h1>{postTitle}</h1>
			<p class="article-summary">{summary}</p>
			<div class="article-byline">
				<a href={resolve(AUTO_NEWS_AUTHOR_PATH)}>{authorName}</a>
				{#if datePublishedIso && publishedLabel}
					<time datetime={datePublishedIso}>발행 {publishedLabel}</time>
				{/if}
				{#if dateModifiedIso && modifiedLabel && dateModifiedIso !== datePublishedIso}
					<time datetime={dateModifiedIso}>수정 {modifiedLabel}</time>
				{/if}
			</div>
		</header>

		<NewsLayout><Content /></NewsLayout>

		<footer class="article-footer">
			<p>동행복권 공식 발표와 645.live 등록 스캔 집계를 바탕으로 자동 작성한 기사입니다. 과거 결과와 스캔 빈도는 다음 추첨의 당첨 가능성을 높이지 않습니다.</p>
			<div class="source-links">
				<a href={resolve(EDITORIAL_POLICY_PATH)}>편집 원칙</a>
				<a href={resolve(DATA_SOURCES_PATH)}>데이터 출처</a>
				<a href={resolve(AUTO_NEWS_AUTHOR_PATH)}>작성자 소개</a>
			</div>
			<a class="back-link" href={resolve('/news')}><span aria-hidden="true">←</span> 뉴스 목록으로</a>
		</footer>
	</article>

	<aside class="article-aside" aria-label="관련 정보">
		<div class="aside-content">
			<figure>
				<img src={imageUrl} alt={postTitle} width="1200" height="630" loading="lazy" decoding="async" />
			</figure>
			<h2>{round ? `제${round}회 더 보기` : '이어서 살펴보기'}</h2>
			<nav aria-label="관련 결과와 통계">
				<a href={resolve(resultsPath)}>회차별 결과 <span aria-hidden="true">↗</span></a>
				<a href={resolve(storesPath)}>당첨 판매점 <span aria-hidden="true">↗</span></a>
				<a href={resolve('/stats')}>번호별 통계 <span aria-hidden="true">↗</span></a>
				<a href={resolve('/qr-scan')}>내 로또 QR 확인 <span aria-hidden="true">↗</span></a>
			</nav>
			<p class="aside-note">스캔 집계는 이 사이트에 등록된 데이터만 반영합니다.</p>
		</div>
	</aside>
</div>

<style>
	.article-breadcrumb { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; font-size: 0.8125rem; color: color-mix(in oklab, var(--color-base-content) 60%, transparent); }
	.article-breadcrumb a { display: inline-flex; align-items: center; min-height: 32px; color: inherit; text-decoration: none; }
	.article-breadcrumb a:hover { color: var(--color-primary); }
	.article-layout { display: grid; grid-template-columns: minmax(0, 760px) minmax(200px, 256px); gap: 56px; align-items: start; }
	.article-main { min-width: 0; }
	.article-heading { padding-bottom: 28px; }
	.article-category { margin: 0 0 12px; font-size: 0.75rem; font-weight: 700; color: var(--color-primary); }
	h1 { margin: 0; font-size: clamp(1.75rem, 3.5vw, 2.625rem); line-height: 1.35; font-weight: 800; letter-spacing: -0.045em; text-wrap: pretty; }
	.article-summary { margin: 16px 0; font-size: 1.0625rem; line-height: 1.7; color: color-mix(in oklab, var(--color-base-content) 70%, transparent); }
	.article-byline { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 14px; color: color-mix(in oklab, var(--color-base-content) 60%, transparent); font-size: 0.75rem; line-height: 1.7; }
	.article-byline a { color: inherit; text-underline-offset: 3px; }
	.article-aside { align-self: stretch; min-width: 0; }
	.aside-content { position: sticky; top: 100px; padding-top: 4px; }
	figure { margin: 0 0 24px; overflow: hidden; border-radius: 8px; background: var(--color-base-200); }
	figure img { width: 100%; height: auto; aspect-ratio: 1200 / 630; object-fit: cover; }
	.article-aside h2 { font-size: 0.875rem; font-weight: 750; margin: 0 0 12px; }
	.article-aside nav { border-top: 1px solid var(--color-base-300); }
	.article-aside nav a { display: flex; justify-content: space-between; gap: 16px; align-items: center; min-height: 52px; border-bottom: 1px solid var(--color-base-300); color: var(--color-base-content); text-decoration: none; font-size: 0.875rem; transition: color 160ms ease; }
	.article-aside nav a:hover { color: var(--color-primary); }
	.article-aside nav span { color: color-mix(in oklab, var(--color-base-content) 45%, transparent); }
	.aside-note { margin-top: 16px; font-size: 0.75rem; line-height: 1.7; color: color-mix(in oklab, var(--color-base-content) 55%, transparent); }
	.article-footer { margin-top: 36px; padding-top: 24px; border-top: 1px solid var(--color-base-300); }
	.article-footer p { margin: 0; font-size: 0.8125rem; line-height: 1.8; color: color-mix(in oklab, var(--color-base-content) 65%, transparent); }
	.source-links { display: flex; flex-wrap: wrap; gap: 8px 20px; margin-top: 8px; }
	.source-links a { display: inline-flex; align-items: center; min-height: 44px; color: var(--color-primary); font-size: 0.8125rem; text-underline-offset: 4px; }
	.back-link { display: inline-flex; align-items: center; min-height: 44px; gap: 12px; margin-top: 20px; color: var(--color-base-content); font-size: 0.875rem; font-weight: 650; text-decoration: none; }
	.back-link:hover { color: var(--color-primary); }
	@media (max-width: 1023px) {
		.article-layout { grid-template-columns: minmax(0, 760px); gap: 40px; justify-content: center; }
		.aside-content { position: static; padding: 24px 0 0; border-top: 1px solid var(--color-base-300); }
		figure { max-width: 320px; }
		.article-heading { padding-bottom: 24px; }
	}
	@media (max-width: 767px) {
		.article-breadcrumb { margin-bottom: 16px; }
		.article-summary { font-size: 1rem; }
	}
	@media (prefers-reduced-motion: reduce) {
		.article-aside nav a { transition: none; }
	}
</style>
