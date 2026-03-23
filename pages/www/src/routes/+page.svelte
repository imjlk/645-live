<script lang="ts">
import { browser } from "$app/environment";
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
const pageTitle = "로또 6/45 실시간 스캔 현황 및 통계 분석";
const pageDescription =
	"로또 6/45 실시간 스캔 현황을 확인하세요. 번호별 선택 빈도와 통계 분석으로 다음 당첨번호 흐름을 빠르게 파악할 수 있습니다.";
const ogImage = getGenericOgImage({
	title: "로또 6/45 실시간 스캔 현황",
	description: "번호별 실시간 스캔 현황과 통계 분석",
	layout: "hero",
	theme: "dark",
});

// Request cache cleanup on main page load for fresh data
onMount(() => {
	if (browser && 'serviceWorker' in navigator) {
		navigator.serviceWorker.ready.then((registration) => {
			// Request cache cleanup for fresh data
			registration.active?.postMessage({
				type: 'CLEANUP_CACHES'
			});
		}).catch(console.warn);
	}
});
</script>

<MetaTags
	title={`645.live - ${pageTitle}`}
	description={pageDescription}
	canonical={SITE_ORIGIN}
	keywords={["로또 6/45", "로또 실시간", "로또 통계", "로또 분석", "로또 스캔", "로또 번호", "로또 당첨", "로또 생성기", "동행복권", "로또 확률", "로또 패턴", "로또 예측"]}
	robots="index,follow"
	openGraph={{
		type: "website",
		url: SITE_ORIGIN,
		title: pageTitle,
		description: pageDescription,
		siteName: SITE_NAME,
		locale: "ko_KR",
		images: [ogImage]
	}}
	twitter={{
		cardType: "summary_large_image",
		site: "@645live",
		creator: "@645live",
		title: pageTitle,
		description: pageDescription,
		image: ogImage.url,
		imageAlt: ogImage.alt
	}}
	additionalMetaTags={[
		{
			name: "author",
			content: SITE_NAME
		},
		{
			name: "theme-color",
			content: "#3b82f6"
		}
	]}
/>

<JsonLd
	schema={{
		"@context": "https://schema.org",
		"@type": "WebApplication",
		"name": `${SITE_NAME} 로또 6/45 실시간 스캔 현황`,
		"description": "로또 6/45 실시간 스캔 현황 및 통계 분석 서비스",
		"url": SITE_ORIGIN,
		"isAccessibleForFree": true,
		"publisher": {
			"@type": "Organization",
			"name": SITE_NAME,
			"url": SITE_ORIGIN,
			"logo": {
				"@type": "ImageObject",
				"url": getSiteLogoUrl()
			}
		},
		"applicationCategory": "EntertainmentApplication",
		"operatingSystem": "Web Browser",
		"offers": {
			"@type": "Offer",
			"price": "0",
			"priceCurrency": "KRW"
		}
	}}
/>
<JsonLd schema={createOrganizationSchema()} />
<JsonLd schema={createWebSiteSchema()} />

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
			large: 5
		},
		gridGap: "gap-4"
	}}
/>
