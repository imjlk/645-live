<script lang="ts">
import { JsonLd, MetaTags } from "svelte-meta-tags";
import {
	GuideSection,
	LottoBall,
	StatsPageHero,
	StatsSummary,
	StatsTable,
} from "$lib/components/stats";
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();

// Breadcrumbs 데이터
const breadcrumbItems = [
	{ label: "홈", href: "/" },
	{ label: "통계", href: "/stats" },
	{ label: "번호분석", href: "/stats/numbers", current: true },
];

// 색깔별 CSS 클래스 매핑
const getColorClass = (color: string) => {
	const colorMap: Record<string, string> = {
		yellow: "stats-ball-yellow",
		blue: "stats-ball-blue",
		red: "stats-ball-red",
		grey: "stats-ball-grey",
		green: "stats-ball-green",
	};
	return colorMap[color] || "bg-gray-400";
};

// 편차에 따른 색깔 클래스
const getDeviationClass = (deviation: string) => {
	const dev = Number.parseFloat(deviation);
	if (dev > 10) return "text-red-600 font-bold";
	if (dev > 5) return "text-orange-600";
	if (dev < -10) return "text-blue-600 font-bold";
	if (dev < -5) return "text-blue-500";
	return "text-base-content/70";
};

const maxNumberDrawCount = $derived(
	data.numberStats.length > 0
		? Math.max(...data.numberStats.map((stat) => stat.draw_count))
		: 0,
);

const minNumberDrawCount = $derived(
	data.numberStats.length > 0
		? Math.min(...data.numberStats.map((stat) => stat.draw_count))
		: 0,
);

const numberStatsOgDescription = $derived(
	`총 ${data.totalRounds}회차 데이터 분석 - 최다 ${maxNumberDrawCount}회 - 최소 ${minNumberDrawCount}회`,
);

const pageTitle = $derived(`로또 번호별 출현 횟수와 통계`);
const pageDescription = $derived(
	`로또 6/45 전체 ${data.totalRounds}회차 추첨 결과에서 1번부터 45번까지 본 번호·보너스 출현 횟수와 출현율을 확인하세요. 번호별 빈도와 이론적 기대값의 차이를 비교하고, 원하는 번호를 선택해 최근 추첨 이력과 상세 통계를 살펴볼 수 있습니다.`,
);
</script>

<MetaTags
	title={pageTitle}
	titleTemplate="%s | 645.live"
	description={pageDescription}
	canonical="https://645.live/stats/numbers"
	keywords={["로또번호통계", "로또번호분석", "로또출현빈도", "로또색깔분석", "번호별통계", "로또패턴분석"]}
	openGraph={{
		type: "article",
		url: "https://645.live/stats/numbers",
		title: pageTitle,
		description: pageDescription,
		siteName: "645.live",
		locale: "ko_KR",
		images: [{
			url: `https://645.live/og?title=${encodeURIComponent('로또 6/45 번호별 출현 통계')}&description=${encodeURIComponent(numberStatsOgDescription)}&layout=blog&theme=light`,
			width: 1200,
			height: 630,
			alt: "로또 6/45 번호별 출현 통계",
			type: "image/svg+xml"
		}]
	}}
	twitter={{
		cardType: "summary_large_image",
		site: "@645live",
		title: pageTitle,
		description: pageDescription,
		image: `https://645.live/og?title=${encodeURIComponent('로또 6/45 번호별 출현 통계')}&description=${encodeURIComponent(numberStatsOgDescription)}&layout=blog&theme=light`,
		imageAlt: "로또 6/45 번호별 출현 통계"
	}}
	additionalMetaTags={[
		{
			name: "author", 
			content: "645.live"
		}
	]}
/>

<JsonLd
	schema={{
		"@context": "https://schema.org",
		"@type": "Dataset",
		name: "로또 6/45 번호별 출현 통계",
		description: "로또 6/45 각 번호의 출현 빈도, 색깔별 분포, 구간별 분석 데이터입니다. 전체 회차 기준 번호별 출현 흐름과 보너스 포함 통계를 함께 확인할 수 있습니다.",
		url: "https://645.live/stats/numbers",
		keywords: ["로또번호통계", "로또번호분석", "로또출현빈도", "로또색깔분석"],
		temporalCoverage: "2002-12-07/..",
		creator: {
			"@type": "Organization",
			name: "645.live",
		},
		license: "https://645.live/terms-of-service",
	}}
/>

<div class="stats-page">
	<!-- Breadcrumbs -->
	<Breadcrumbs items={breadcrumbItems} />

	<StatsPageHero
		eyebrow="공식 추첨 통계"
		title="로또 6/45 번호별 출현 통계"
		description={`총 ${data.totalRounds}회차 데이터를 기준으로, 1번부터 45번까지 어떤 번호가 자주 나왔고 어떤 번호가 상대적으로 적게 나왔는지 전체 흐름을 한눈에 비교합니다.`}
		freshness={data.freshness}
		metrics={[
			{
				label: "분석 회차",
				value: `${data.totalRounds}회`,
				note: `최신 ${data.latestRound}회차 기준`,
				tone: "primary",
			},
			{
				label: "평균 출현",
				value: Math.round((data.totalRounds * 6) / 45),
				note: "번호당 기대 출현 횟수",
				tone: "secondary",
			},
			{
				label: "최다 출현",
				value: `${maxNumberDrawCount}회`,
				note: "가장 많이 등장한 번호 기준",
				tone: "accent",
			},
			{
				label: "최소 출현",
				value: `${minNumberDrawCount}회`,
				note: "가장 적게 등장한 번호 기준",
			},
		]}
	/>

	<!-- 요약 통계 -->
	<StatsSummary
		stats={[
			{
				title: "전체 번호",
				value: 45,
				description: "번호",
				theme: "primary"
			},
			{
				title: "평균 출현", 
				value: Math.round(data.totalRounds * 6 / 45),
				description: "횟수",
				theme: "secondary"
			},
			{
				title: "최다 출현",
				value: maxNumberDrawCount,
				description: "횟수", 
				theme: "accent"
			},
			{
				title: "최소 출현",
				value: minNumberDrawCount,
				description: "횟수",
				theme: "info"
			}
		]}
		columns={4}
	/>

	<!-- 번호별 상세 통계 테이블 -->
	<StatsTable
		title="번호별 상세 통계"
		columns={[
			{
				key: "number",
				title: "번호", 
				sticky: true,
				minWidth: "60px",
				render: (value, row) => `
					<div class="flex items-center">
						<a href="/stats/numbers/${row.number}" class="inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs ${getColorClass(row.color)} hover:scale-110 transition-transform duration-200 cursor-pointer">
							${row.number}
						</a>
					</div>
				`
			},
			{
				key: "color",
				title: "색깔",
				minWidth: "60px", 
				render: (value, row) => `
					<span class="badge badge-sm ${getColorClass(row.color)}">
						${row.color}
					</span>
				`
			},
			{
				key: "section",
				title: "구간",
				minWidth: "80px",
				render: (value, row) => `
					<div class="text-xs sm:text-sm">
						${row.section}구간 
						<span class="text-xs opacity-60">
							(${(row.section - 1) * 10 + 1}-${Math.min(row.section * 10, 45)})
						</span>
					</div>
				`
			},
			{
				key: "draw_count",
				title: "출현 횟수",
				minWidth: "80px",
				render: (value: any, row: any) => `
					<div class="text-xs sm:text-sm font-medium">${row.draw_count}</div>
					<div class="text-xs opacity-60">순위</div>
				`
			},
			{
				key: "bonus_count", 
				title: "보너스 횟수",
				minWidth: "80px"
			},
			{
				key: "average_frequency",
				title: "출현률",
				minWidth: "70px",
				render: (value) => `${value}%`
			},
			{
				key: "deviation",
				title: "편차", 
				minWidth: "60px",
				render: (value) => `
					<span class="${getDeviationClass(value)}">
						${Number(value) > 0 ? '+' : ''}${value}
					</span>
				`
			},
			{
				key: "last_draw_round",
				title: "마지막 출현",
				minWidth: "90px",
				render: (value) => value ? `${value}회차` : '-'
			}
		]}
		data={data.numberStats.map((stat, index) => ({ ...stat, index }))}
	/>

	<!-- 분석 가이드 -->
	<GuideSection
		title="분석 가이드"
		guides={[
			{
				title: "통계 해석",
				items: [
					"<strong>출현률</strong>: 해당 번호가 전체 회차에서 출현한 비율",
					"<strong>편차</strong>: 기댓값 대비 실제 출현 횟수 차이", 
					"<strong>양의 편차</strong>: 평균보다 많이 출현한 번호",
					"<strong>음의 편차</strong>: 평균보다 적게 출현한 번호"
				]
			},
			{
				title: "색깔별 분포",
				items: [
					'<span class="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-1"></span><strong>노랑</strong>: 1~10번',
					'<span class="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1"></span><strong>파랑</strong>: 11~20번',
					'<span class="inline-block w-3 h-3 rounded-full bg-red-500 mr-1"></span><strong>빨강</strong>: 21~30번',
					'<span class="inline-block w-3 h-3 rounded-full bg-gray-500 mr-1"></span><strong>회색</strong>: 31~40번',
					'<span class="inline-block w-3 h-3 rounded-full bg-green-500 mr-1"></span><strong>초록</strong>: 41~45번'
				]
			}
		]}
		theme="info"
	/>
</div>

<!-- Styles removed - using components -->
