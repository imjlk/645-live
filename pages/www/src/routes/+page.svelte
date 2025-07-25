<script lang="ts">
import ScanStatusGrid from "$lib/modules/lotto/components/ScanStatusGrid.svelte";
import { JsonLd, MetaTags } from "svelte-meta-tags";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();
</script>

<MetaTags
	title="645.live - 로또 6/45 실시간 스캔 현황 및 통계 분석"
	description="로또 6/45 실시간 스캔 현황을 확인하세요. 번호별 선택 빈도와 통계 분석으로 다음 당첨번호를 예측해보세요."
	canonical="https://645.live"
	keywords={["로또 6/45", "로또 실시간", "로또 통계", "로또 분석", "로또 스캔", "로또 번호", "로또 당첨", "로또 생성기", "동행복권", "로또 확률", "로또 패턴", "로또 예측"]}
	robots="index,follow"
	openGraph={{
		type: "website",
		url: "https://645.live",
		title: "로또 6/45 실시간 스캔 현황 및 통계 분석",
		description: "로또 6/45 실시간 스캔 현황을 확인하세요. 번호별 선택 빈도와 통계 분석으로 다음 당첨번호를 예측해보세요.",
		siteName: "645.live",
		locale: "ko_KR",
		images: [
			{
				url: `https://www.645.live/og?title=${encodeURIComponent('로또 6/45 실시간 스캔 현황')}&description=${encodeURIComponent('번호별 실시간 스캔 현황')}&layout=hero&theme=dark`,
				width: 1200,
				height: 630,
				alt: "로또 6/45 실시간 스캔 현황",
				type: "image/svg+xml"
			}
		]
	}}
	twitter={{
		cardType: "summary_large_image",
		site: "@645live",
		creator: "@645live",
		title: "로또 6/45 실시간 스캔 현황 및 통계 분석",
		description: "로또 6/45 실시간 스캔 현황을 확인하세요. 번호별 선택 빈도와 통계 분석으로 다음 당첨번호를 예측해보세요.",
		image: `https://www.645.live/og?title=${encodeURIComponent('로또 6/45 실시간 스캔 현황')}&description=${encodeURIComponent('번호별 실시간 스캔 현황')}&layout=hero&theme=dark`,
		imageAlt: "로또 6/45 실시간 스캔 현황"
	}}
	additionalMetaTags={[
		{
			name: "robots",
			content: "index,follow"
		},
		{
			name: "author",
			content: "645.live"
		},
		{
			name: "theme-color",
			content: "#3b82f6"
		},
		{
			property: "og:locale:alternate",
			content: "en_US"
		}
	]}
/>

<JsonLd
	schema={{
		"@context": "https://schema.org",
		"@type": "WebSite",
		"name": "645.live",
		"description": "로또 6/45 실시간 스캔 현황 및 통계 분석 서비스",
		"url": "https://645.live",
		"potentialAction": {
			"@type": "SearchAction",
			"target": "https://645.live/n/{search_term_string}",
			"query-input": "required name=search_term_string"
		},
		"publisher": {
			"@type": "Organization",
			"name": "645.live",
			"url": "https://645.live"
		},
		"mainEntity": {
			"@type": "WebApplication",
			"name": "로또 6/45 스캔 현황",
			"description": "로또 번호별 실시간 스캔 현황 및 통계 분석",
			"applicationCategory": "Entertainment",
			"operatingSystem": "Web Browser",
			"offers": {
				"@type": "Offer",
				"price": "0",
				"priceCurrency": "KRW"
			}
		}
	}}
/>

<ScanStatusGrid 
	initialRound={data.displayRound || data.latestRound}
	latestRound={data.latestRound}
	enableNavigation={true}
	showHeader={true}
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
