<script lang="ts">
	import { resolve } from '$app/paths';
	import NewsLayout from '../../../../content/news/+layout.svelte';
	import {
		AUTO_NEWS_AUTHOR_PATH,
		DATA_SOURCES_PATH,
		EDITORIAL_POLICY_PATH,
		SITE_NAME,
		SITE_ORIGIN,
		createBreadcrumbSchema,
		getAutoNewsAuthorUrl,
		getCanonicalNewsOgUrl,
		getSiteLogoUrl,
		isAbsoluteHttpUrl,
		formatVisibleDateTime,
		toIsoDateTime,
	} from '$lib/seo/index.js';

	let { data } = $props();

	const postTitle = $derived(data.meta?.title || '로또 분석 기사');
	const description = $derived(
		data.meta?.description || '로또 당첨 결과 분석 기사',
	);
	const canonicalUrl = $derived(`${SITE_ORIGIN}/news/posts/${data.slug}`);
	const imageUrl = $derived.by(() =>
		typeof data.meta?.thumbnail === 'string' && isAbsoluteHttpUrl(data.meta.thumbnail)
			? data.meta.thumbnail
			: getCanonicalNewsOgUrl(data.slug, {
				date: data.meta?.date,
				publishedAt: data.meta?.publishedAt,
				updatedAt: data.meta?.updatedAt,
			}),
	);
	const datePublished = $derived(data.meta?.publishedAt || data.meta?.date || undefined);
	const dateModified = $derived(data.meta?.updatedAt || datePublished || undefined);
	const datePublishedIso = $derived(toIsoDateTime(datePublished));
	const dateModifiedIso = $derived(toIsoDateTime(dateModified));
	const publishedLabel = $derived(formatVisibleDateTime(datePublished));
	const modifiedLabel = $derived(formatVisibleDateTime(dateModified));
	const isGeneratedOgImage = $derived(imageUrl.startsWith(`${SITE_ORIGIN}/og/news/`));
	const authorName = $derived(data.meta?.author || '645.live 자동뉴스');
	const authorUrl = $derived(getAutoNewsAuthorUrl());
	const breadcrumbSchema = $derived(
		createBreadcrumbSchema([
			{ name: '홈', path: '/' },
			{ name: '로또 뉴스', path: '/news' },
			{ name: postTitle, path: `/news/posts/${encodeURIComponent(data.slug)}` },
		]),
	);
	const articleJsonLd = $derived.by(() => ({
		'@context': 'https://schema.org',
		'@type': 'NewsArticle',
		headline: postTitle,
		description,
		datePublished: datePublishedIso,
		dateModified: dateModifiedIso,
		articleSection: data.meta?.category || undefined,
		mainEntityOfPage: canonicalUrl,
		thumbnailUrl: imageUrl,
		image: [
			{
				'@type': 'ImageObject',
				url: imageUrl,
				width: 1200,
				height: 630
			}
		],
		keywords: Array.isArray(data.meta?.tags)
			? data.meta.tags.join(', ')
			: undefined,
		author: {
			'@type': 'Organization',
			name: authorName,
			url: authorUrl
		},
		publisher: {
			'@type': 'Organization',
			name: SITE_NAME,
			logo: {
				'@type': 'ImageObject',
				url: getSiteLogoUrl()
			}
		}
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
	<link rel="preload" as="image" href={imageUrl} />

	<script type="application/ld+json">
		{JSON.stringify(articleJsonLd)}
	</script>
	<script type="application/ld+json">
		{JSON.stringify(breadcrumbSchema)}
	</script>
</svelte:head>

<NewsLayout>
	<header class="not-prose mb-8 rounded-xl border border-base-300 bg-base-100 p-6">
		<div class="flex flex-wrap items-center gap-2 text-sm text-base-content/70">
			{#if data.meta?.category}
				<span class="badge badge-primary badge-outline">{data.meta.category}</span>
			{/if}
			{#if datePublishedIso && publishedLabel}
				<time datetime={datePublishedIso}>발행 {publishedLabel}</time>
			{/if}
			{#if dateModifiedIso && modifiedLabel && dateModifiedIso !== datePublishedIso}
				<time datetime={dateModifiedIso}>수정 {modifiedLabel}</time>
			{/if}
			{#if authorName}
				<span>
					작성
					<a class="link link-primary" href={resolve(AUTO_NEWS_AUTHOR_PATH)}>{authorName}</a>
				</span>
			{/if}
		</div>

		<h1 class="mt-3 text-3xl font-bold leading-tight text-base-content">{postTitle}</h1>
		<p class="mt-3 max-w-3xl text-base text-base-content/75">{description}</p>

		<div class="mt-4 rounded-xl border border-base-300 bg-base-200/60 p-4 text-sm text-base-content/75">
			이 기사는 동행복권 공식 발표와 645.live 내부 스캔 데이터를 바탕으로 자동 생성되었습니다.
			<a class="link link-primary ml-1" href={resolve(EDITORIAL_POLICY_PATH)}>편집 원칙</a>
			와
			<a class="link link-primary ml-1" href={resolve(DATA_SOURCES_PATH)}>데이터 출처</a>
			를 함께 확인할 수 있습니다.
		</div>

		{#if Array.isArray(data.meta?.tags) && data.meta.tags.length > 0}
			<div class="mt-4 flex flex-wrap gap-2">
				{#each data.meta.tags as tag (tag)}
					<span class="badge badge-outline">{tag}</span>
				{/each}
			</div>
		{/if}
	</header>

	<figure class="not-prose mb-8 overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">
		<img
			src={imageUrl}
			alt={postTitle}
			class="aspect-[1200/630] w-full object-cover"
			loading="eager"
			decoding="async"
			fetchpriority="high"
		/>
	</figure>

	<Content />

	<section class="not-prose mt-10 rounded-2xl border border-base-300 bg-base-200/60 p-5">
		<h2 class="text-lg font-semibold text-base-content">이 기사와 함께 보면 좋은 정보</h2>
		<p class="mt-2 text-sm text-base-content/70">
			공식 발표와 645.live 자체 데이터를 함께 읽을 수 있도록 관련 안내 페이지와 통계를 묶었습니다.
		</p>
		<div class="mt-4 grid gap-3 md:grid-cols-2">
			<a class="rounded-xl border border-base-300 bg-base-100 p-4 no-underline transition hover:-translate-y-0.5 hover:shadow-md" href={resolve(EDITORIAL_POLICY_PATH)}>
				<div class="text-sm font-semibold text-base-content">편집 원칙</div>
				<div class="mt-1 text-sm text-base-content/70">자동 생성 기사 작성 기준과 검수 원칙을 확인할 수 있습니다.</div>
			</a>
			<a class="rounded-xl border border-base-300 bg-base-100 p-4 no-underline transition hover:-translate-y-0.5 hover:shadow-md" href={resolve(DATA_SOURCES_PATH)}>
				<div class="text-sm font-semibold text-base-content">데이터 출처</div>
				<div class="mt-1 text-sm text-base-content/70">동행복권 공식 발표와 645.live 집계 데이터의 사용 범위를 설명합니다.</div>
			</a>
			<a class="rounded-xl border border-base-300 bg-base-100 p-4 no-underline transition hover:-translate-y-0.5 hover:shadow-md" href={resolve(AUTO_NEWS_AUTHOR_PATH)}>
				<div class="text-sm font-semibold text-base-content">작성자 소개</div>
				<div class="mt-1 text-sm text-base-content/70">645.live 자동뉴스가 어떤 원칙으로 로또 기사를 생성하는지 확인할 수 있습니다.</div>
			</a>
			<a class="rounded-xl border border-base-300 bg-base-100 p-4 no-underline transition hover:-translate-y-0.5 hover:shadow-md" href={resolve('/stats')}>
				<div class="text-sm font-semibold text-base-content">관련 통계 보기</div>
				<div class="mt-1 text-sm text-base-content/70">번호 통계, 반복 패턴, 당첨점 분포를 이어서 확인할 수 있습니다.</div>
			</a>
		</div>
	</section>
</NewsLayout>
