<script lang="ts">
	import NewsLayout from '../../../../content/news/+layout.svelte';

	let { data } = $props();

	const siteUrl = 'https://www.645.live';
	const postTitle = $derived(data.meta?.title || '로또 분석 기사');
	const description = $derived(
		data.meta?.description || '로또 당첨 결과 분석 기사',
	);
	const canonicalUrl = $derived(`${siteUrl}/news/posts/${data.slug}`);
	const imageUrl = $derived.by(() =>
		data.meta?.thumbnail
			? (String(data.meta.thumbnail).startsWith('http')
				? data.meta.thumbnail
				: `${siteUrl}${data.meta.thumbnail}`)
			: `${siteUrl}/og/news/${data.slug}`,
	);
	const datePublished = $derived(data.meta?.date || undefined);
	const articleJsonLd = $derived.by(() => ({
		'@context': 'https://schema.org',
		'@type': 'NewsArticle',
		headline: postTitle,
		description,
		datePublished,
		dateModified: datePublished,
		mainEntityOfPage: canonicalUrl,
		image: [imageUrl],
		keywords: Array.isArray(data.meta?.tags)
			? data.meta.tags.join(', ')
			: undefined,
		author: {
			'@type': 'Organization',
			name: data.meta?.author || '645.live'
		},
		publisher: {
			'@type': 'Organization',
			name: '645.live',
			logo: {
				'@type': 'ImageObject',
				url: `${siteUrl}/favicon.png`
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
	<meta property="og:site_name" content="645.live" />
	{#if datePublished}
		<meta property="article:published_time" content={datePublished} />
	{/if}
	<meta name="robots" content="index,follow,max-image-preview:large" />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={postTitle} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={imageUrl} />

	<script type="application/ld+json">
		{JSON.stringify(articleJsonLd)}
	</script>
</svelte:head>

<NewsLayout>
	<header class="not-prose mb-8 rounded-xl border border-base-300 bg-base-100 p-6">
		<div class="flex flex-wrap items-center gap-2 text-sm text-base-content/70">
			{#if data.meta?.category}
				<span class="badge badge-primary badge-outline">{data.meta.category}</span>
			{/if}
			{#if datePublished}
				<time datetime={datePublished}>발행일 {datePublished}</time>
			{/if}
			{#if data.meta?.author}
				<span>작성 {data.meta.author}</span>
			{/if}
		</div>

		<h1 class="mt-3 text-3xl font-bold leading-tight text-base-content">{postTitle}</h1>

		{#if Array.isArray(data.meta?.tags) && data.meta.tags.length > 0}
			<div class="mt-4 flex flex-wrap gap-2">
				{#each data.meta.tags as tag (tag)}
					<span class="badge badge-outline">{tag}</span>
				{/each}
			</div>
		{/if}
	</header>

	<Content />
</NewsLayout>
