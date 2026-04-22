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
			: "로또 6/45 실시간 스캔, QR 확인, 통계 플랫폼",
	);
	const pageDescription =
		"645.live는 로또 6/45 실시간 스캔 현황, QR 당첨 확인, 번호 통계, 회원 스캔 이력을 한 곳에서 확인할 수 있는 플랫폼입니다.";
	const canonicalUrl = $derived(
		data.agentMode ? `${SITE_ORIGIN}?mode=agent` : SITE_ORIGIN,
	);
	const ogImage = $derived(
		getGenericOgImage({
			title: data.agentMode
				? "645.live agent view"
				: "로또 6/45 실시간 스캔과 통계",
			description:
				data.agentMode
					? "Recent draw lookup, TrailBase-backed statistics, QR checking guidance, and agent discovery surfaces."
					: pageDescription,
			layout: "hero",
			theme: "dark",
		}),
	);

	const homepageFaq = [
		{
			question: "645.live에서는 무엇을 볼 수 있나요?",
			answer:
				"645.live에서는 최신 회차 당첨번호, 실시간 스캔 현황, QR 당첨 확인, 번호별 통계와 회원 스캔 이력을 함께 볼 수 있습니다.",
		},
		{
			question: "메인 화면의 실시간 스캔 현황은 무엇을 보여주나요?",
			answer:
				"최신 표시 회차 기준으로 어떤 번호가 얼마나 스캔됐는지 빠르게 확인할 수 있고, 각 번호를 눌러 더 자세한 번호별 통계 페이지로 이동할 수 있습니다.",
		},
		{
			question: "QR 당첨 확인과 스캔 이력 저장도 지원하나요?",
			answer:
				"네. QR 스캔으로 당첨 여부를 확인할 수 있고, 로그인한 경우 회원 스캔 이력과 동기화 흐름까지 함께 사용할 수 있습니다.",
		},
		{
			question: "API나 에이전트 연동용 정보도 제공하나요?",
			answer:
				"공개 조회 API, OpenAPI 문서, MCP 엔드포인트 같은 연동 정보는 메인 소개문 대신 별도 문서와 에이전트용 화면에서 확인할 수 있습니다.",
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
		"로또 6/45",
		"한국 로또",
		"로또 실시간 스캔",
		"로또 QR 확인",
		"로또 통계",
		"로또 분석",
		"번호별 통계",
		"로또 당첨 확인",
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
		"name": `${SITE_NAME} 로또 6/45 통계 플랫폼`,
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
		name: "645.live 로또 6/45 통계 서비스",
		description: pageDescription,
		serviceType: "로또 통계 및 결과 확인",
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
	<section class="home-page-summary sr-only">
		<h1>{pageTitle}</h1>
		<p>{pageDescription}</p>
	</section>

	<section class="space-y-4 px-6 pb-6">
		<div class="rounded-[2rem] border border-base-300/70 bg-base-100/85 p-6 shadow-sm">
			<p class="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/45">실시간 스캔 현황</p>
			<h2 class="mt-2 text-2xl font-bold text-base-content">최신 회차 로또 6/45 스캔 보드</h2>
			<p class="sr-only">{pageDescription}</p>
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
			<p class="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/45">자주 묻는 질문</p>
			<h2 class="mt-2 text-2xl font-bold text-base-content">645.live 자주 묻는 질문</h2>
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
