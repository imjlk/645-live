<script lang="ts">
	import { browser } from "$app/environment";
	import StructuredAgentPage from "$lib/components/agent/StructuredAgentPage.svelte";
	import ScanStatusGrid from "$lib/modules/lotto/components/ScanStatusGrid.svelte";
	import {
		SITE_NAME,
		SITE_ORIGIN,
		createOrganizationSchema,
		createWebSiteSchema,
		getGenericOgImage,
		getSiteLogoUrl,
	} from "$lib/seo/index.js";
	import { JsonLd, MetaTags } from "svelte-meta-tags";
	import { onMount } from "svelte";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	const pageTitle = $derived(
		data.agentMode
			? "645.live agent view"
			: "645.live is a Korean Lotto 6/45 real-time scan, QR checking, and statistics platform.",
	);
	const pageDescription =
		"645.live is a Korean Lotto 6/45 real-time scan, QR checking, and statistics platform with public read APIs, TrailBase-backed analysis, and signed-in member scan workflows.";
	const canonicalUrl = $derived(
		data.agentMode ? `${SITE_ORIGIN}?mode=agent` : SITE_ORIGIN,
	);
	const ogImage = $derived(
		getGenericOgImage({
			title: data.agentMode
				? "645.live agent view"
				: "Korean Lotto 6/45 statistics and scan insights",
			description:
				"Recent draw lookup, TrailBase-backed statistics, QR checking guidance, and agent discovery surfaces.",
			layout: "hero",
			theme: "dark",
		}),
	);

	const homepageFaq = [
		{
			question: "What is 645.live?",
			answer:
				"645.live is a Korean Lotto 6/45 statistics and scan platform that combines official draw snapshots with TrailBase-backed analysis and member scan workflows.",
		},
		{
			question: "Does 645.live expose agent-friendly APIs?",
			answer:
				"Yes. Phase 1 adds public read APIs, OpenAPI, markdown negotiation, an RFC 9727 API catalog, same-domain MCP discovery, and browser-side WebMCP registration.",
		},
		{
			question: "How does authentication work today?",
			answer:
				"Public reads are anonymous. Signed-in member scan actions use the existing Better Auth session cookie flow. OAuth discovery is planned for a later phase.",
		},
	];

	onMount(() => {
		if (browser && "serviceWorker" in navigator) {
			navigator.serviceWorker.ready
				.then((registration) => {
					registration.active?.postMessage({
						type: "CLEANUP_CACHES",
					});
				})
				.catch(console.warn);
		}
	});
</script>

<MetaTags
	title={`645.live - ${pageTitle}`}
	description={pageDescription}
	canonical={canonicalUrl}
	keywords={[
		"645.live",
		"Korean Lotto 6/45",
		"lottery number statistics",
		"frequency analysis",
		"QR checking",
		"developer API",
		"로또 6/45",
		"로또 통계",
		"로또 분석",
		"로또 QR",
	]}
	robots="index,follow"
	openGraph={{
		type: "website",
		url: canonicalUrl,
		title: pageTitle,
		description: pageDescription,
		siteName: SITE_NAME,
		locale: "ko_KR",
		images: [ogImage],
	}}
	twitter={{
		cardType: "summary_large_image",
		site: "@645live",
		creator: "@645live",
		title: pageTitle,
		description: pageDescription,
		image: ogImage.url,
		imageAlt: ogImage.alt,
	}}
	additionalMetaTags={[
		{
			name: "author",
			content: SITE_NAME,
		},
		{
			name: "theme-color",
			content: "#3b82f6",
		},
	]}
/>

<JsonLd
	schema={{
		"@context": "https://schema.org",
		"@type": "WebApplication",
		"name": `${SITE_NAME} Korean Lotto 6/45 statistics platform`,
		"description": pageDescription,
		"url": SITE_ORIGIN,
		"isAccessibleForFree": true,
		"publisher": {
			"@type": "Organization",
			"name": SITE_NAME,
			"url": SITE_ORIGIN,
			"logo": {
				"@type": "ImageObject",
				"url": getSiteLogoUrl(),
			},
		},
		"applicationCategory": "EntertainmentApplication",
		"operatingSystem": "Web Browser",
		"speakable": {
			"@type": "SpeakableSpecification",
			"cssSelector": [".home-page-summary", ".home-page-faq"],
		},
		"offers": {
			"@type": "Offer",
			"price": "0",
			"priceCurrency": "KRW",
		},
	}}
/>
<JsonLd schema={createOrganizationSchema()} />
<JsonLd schema={createWebSiteSchema()} />
<JsonLd
	schema={{
		"@context": "https://schema.org",
		"@type": "Service",
		name: "645.live Korean Lotto 6/45 statistics service",
		description: pageDescription,
		serviceType: "Lottery statistics and result checking",
		areaServed: "KR",
		url: SITE_ORIGIN,
		provider: {
			"@type": "Organization",
			name: SITE_NAME,
			url: SITE_ORIGIN,
		},
	}}
/>
<JsonLd
	schema={{
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: homepageFaq.map((item) => ({
			"@type": "Question",
			name: item.question,
			acceptedAnswer: {
				"@type": "Answer",
				text: item.answer,
			},
		})),
	}}
/>

{#if data.agentMode}
	<StructuredAgentPage page={data.agentPage} />
{:else}
	<div class="home-page-summary">
		<StructuredAgentPage page={data.landingPage} />
	</div>

	<section class="space-y-4 px-6 pb-6">
		<div class="rounded-[2rem] border border-base-300/70 bg-base-100/85 p-6 shadow-sm">
			<p class="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/45">Live scan board</p>
			<h2 class="mt-2 text-2xl font-bold text-base-content">Real-time scan visibility for the latest Korean Lotto 6/45 round</h2>
			<p class="mt-3 max-w-3xl text-sm leading-7 text-base-content/78">
				The live scan board below keeps the existing 645.live experience intact. It shows the latest display round, highlights when scan data is still warming up, and links every ball to deeper number-level analysis. This remains backed by the current TrailBase-connected application logic rather than a parallel agent-only data source.
			</p>
		</div>

		<ScanStatusGrid
			initialRound={data.displayRound || data.latestRound}
			latestRound={data.latestRound}
			headlineRound={data.displayRound || data.latestRound}
			latestRoundHasScanData={data.latestRoundHasScanData}
			allowFallbackPreview={false}
			enableNavigation={true}
			showHeader={true}
			forceClientRefresh={true}
			{...{
				gridColumns: {
					mobile: 5,
					tablet: 5,
					desktop: 5,
					large: 5,
				},
				gridGap: "gap-4",
			}}
		/>
	</section>

	<section class="home-page-faq space-y-4 px-6 pb-8">
		<div class="rounded-[2rem] border border-base-300/70 bg-base-100/85 p-6 shadow-sm">
			<p class="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/45">FAQ</p>
			<h2 class="mt-2 text-2xl font-bold text-base-content">Questions agents and humans usually ask first</h2>
			<div class="mt-4 grid gap-4 lg:grid-cols-3">
				{#each homepageFaq as item (item.question)}
					<article class="rounded-3xl border border-base-300/70 bg-base-200/60 p-5">
						<h3 class="text-lg font-semibold text-base-content">{item.question}</h3>
						<p class="mt-3 text-sm leading-7 text-base-content/75">{item.answer}</p>
					</article>
				{/each}
			</div>
		</div>
	</section>
{/if}
