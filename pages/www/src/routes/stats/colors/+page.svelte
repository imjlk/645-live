<script lang="ts">
import {
	ColorBadge,
	GuideSection,
	RecentAnalysisInput,
	StatsSummary,
} from "$lib/components/stats";
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";
import { JsonLd, MetaTags } from "svelte-meta-tags";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();

// 색상 정보 매핑
const colorInfo = {
	yellow: {
		name: "노랑",
		description: "1-10번",
		bgClass: "bg-yellow-400",
		textClass: "text-yellow-600",
		numbers: "1, 2, 3, 4, 5, 6, 7, 8, 9, 10",
	},
	blue: {
		name: "파랑",
		description: "11-20번",
		bgClass: "bg-blue-400",
		textClass: "text-blue-600",
		numbers: "11, 12, 13, 14, 15, 16, 17, 18, 19, 20",
	},
	red: {
		name: "빨강",
		description: "21-30번",
		bgClass: "bg-red-400",
		textClass: "text-red-600",
		numbers: "21, 22, 23, 24, 25, 26, 27, 28, 29, 30",
	},
	grey: {
		name: "회색",
		description: "31-40번",
		bgClass: "bg-gray-400",
		textClass: "text-gray-600",
		numbers: "31, 32, 33, 34, 35, 36, 37, 38, 39, 40",
	},
	green: {
		name: "초록",
		description: "41-45번",
		bgClass: "bg-green-400",
		textClass: "text-green-600",
		numbers: "41, 42, 43, 44, 45",
	},
};

// 색상별 출현 빈도 분석
const getFrequencyAnalysis = (colorKey: string, average: string): string => {
	const avg = Number.parseFloat(average);
	if (colorKey === "green") {
		// 초록은 5개 번호만 있으므로 기준이 다름
		if (avg >= 1.2) return "높음";
		if (avg >= 0.8) return "보통";
		return "낮음";
	}
	// 다른 색상들은 10개 번호
	if (avg >= 2.5) return "높음";
	if (avg >= 1.5) return "보통";
	return "낮음";
};

// Breadcrumbs 데이터
const breadcrumbItems = [
	{ label: "홈", href: "/" },
	{ label: "통계", href: "/stats" },
	{ label: "색상분석", href: "/stats/colors", current: true },
];
</script>

<MetaTags
	title="로또 6/45 색상 분석 통계 | 번호 구간별 색상 패턴 분석"
	titleTemplate="%s | 645.live"
	description="로또 6/45 전체 {data.totalRounds}회차 색상별 분포와 패턴을 분석합니다. 번호 구간별 색상(노랑, 파랑, 빨강, 회색, 초록) 조합과 출현 빈도를 제공합니다."
	canonical="https://645.live/stats/colors"
	keywords={["로또색상분석", "번호구간분석", "로또통계분석", "색상패턴분석", "로또예측", "색상조합분석", "로또데이터분석", "6/45통계"]}
	robots="index,follow"
	additionalRobotsProps={{
		maxSnippet: 320,
		maxImagePreview: 'large',
		maxVideoPreview: 60
	}}
	additionalMetaTags={[
		{
			name: 'application-name',
			content: '645.live'
		},
		{
			name: 'theme-color',
			content: '#3B82F6'
		},
		{
			name: 'format-detection',
			content: 'telephone=no'
		},
		{
			name: 'author',
			content: '645.live'
		},
		{
			name: 'generator',
			content: 'SvelteKit'
		},
		{
			property: 'article:publisher',
			content: 'https://645.live'
		}
	]}
	openGraph={{
		type: 'article',
		url: 'https://645.live/stats/colors',
		title: `로또 6/45 색상 분석 통계 | 전체 ${data.totalRounds}회차 데이터`,
		description: `로또 6/45 당첨번호의 색상별 분포와 패턴을 분석합니다. 최빈 색상 ${colorInfo[data.mostFrequentColor[0] as keyof typeof colorInfo]?.name}, 평균 ${data.mostFrequentColor[1]}개 등 상세한 통계 정보를 확인하세요.`,
		locale: 'ko_KR',
		images: [{
			url: 'https://645.live/images/lotto-color-stats.png',
			width: 1200,
			height: 630,
			alt: '로또 6/45 색상 분석 통계',
			secureUrl: 'https://645.live/images/lotto-color-stats.png',
			type: 'image/png'
		}],
		siteName: '645.live',
		article: {
			section: '로또 통계',
			tags: ['로또', '색상분석', '번호구간', '당첨번호', '통계분석', '6/45'],
			publishedTime: '2024-01-01T00:00:00.000Z',
			modifiedTime: new Date().toISOString()
		}
	}}
	twitter={{
		cardType: 'summary_large_image',
		site: '@645live',
		title: '로또 6/45 색상 분석 통계',
		description: `전체 ${data.totalRounds}회차 색상 패턴 분석 - 최빈 ${colorInfo[data.mostFrequentColor[0] as keyof typeof colorInfo]?.name}, 평균 ${data.mostFrequentColor[1]}개`,
		image: 'https://645.live/images/lotto-color-stats.png',
		imageAlt: '로또 6/45 색상 분석 통계'
	}}
/>

<JsonLd
	schema={{
		'@type': 'Dataset',
		name: '로또 6/45 색상 분석 통계 데이터',
		description: `로또 6/45 당첨번호의 색상별 분포와 패턴 분석 데이터. 전체 ${data.totalRounds}회차의 색상 분포와 패턴을 분석합니다.`,
		url: 'https://645.live/stats/colors',
		creator: {
			'@type': 'Organization',
			name: '645.live'
		},
		temporalCoverage: `1회차/${data.totalRounds}회차`,
		spatial: {
			'@type': 'Country',
			name: '대한민국'
		},
		distribution: {
			'@type': 'DataDownload',
			contentUrl: 'https://645.live/stats/colors',
			encodingFormat: 'text/html'
		},
		variableMeasured: [
			{
				'@type': 'PropertyValue',
				name: '노랑 색상 평균',
				value: (data.colorAverages as any)?.yellow || '0.00'
			},
			{
				'@type': 'PropertyValue',
				name: '파랑 색상 평균',
				value: (data.colorAverages as any)?.blue || '0.00'
			},
			{
				'@type': 'PropertyValue',
				name: '빨강 색상 평균',
				value: (data.colorAverages as any)?.red || '0.00'
			},
			{
				'@type': 'PropertyValue',
				name: '회색 색상 평균',
				value: (data.colorAverages as any)?.grey || '0.00'
			},
			{
				'@type': 'PropertyValue',
				name: '초록 색상 평균',
				value: (data.colorAverages as any)?.green || '0.00'
			}
		],
		mainEntity: {
			'@type': 'StatisticalPopulation',
			name: '로또 6/45 당첨번호',
			populationSize: data.totalRounds
		}
	}}
/>

<div class="p-3 sm:p-6 space-y-4 sm:space-y-6 max-sm:px-0">
	<!-- Breadcrumbs -->
	<Breadcrumbs items={breadcrumbItems} />

	<!-- 페이지 헤더 -->
	<div class="text-center space-y-2">
		<h1 class="text-xl sm:text-2xl lg:text-3xl font-bold text-primary">로또 6/45 색상 분석 통계</h1>
		<p class="text-base-content/70">
			<strong>색상 분석</strong>은 로또 번호를 구간별로 나누어 분석하는 핵심 지표입니다.<br />
			전체 <strong>{data.totalRounds}회차</strong> 데이터를 기반으로 당첨번호 패턴을 분석하여 
			다음 당첨번호 예측에 도움이 되는 통계 정보를 제공합니다.
		</p>
		<div class="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4 text-xs sm:text-sm text-base-content/60 mt-4">
			<span>📊 최빈 색상: <strong class="text-primary">{colorInfo[data.mostFrequentColor[0] as keyof typeof colorInfo]?.name}</strong></span>
			<span>🎯 평균 개수: <strong class="text-secondary">{data.mostFrequentColor[1]}개</strong></span>
			<span>📈 분석 회차: <strong class="text-accent">{data.totalRounds}회</strong></span>
		</div>
	</div>

	<!-- 최근 회차 분석 -->
	<RecentAnalysisInput 
		maxRounds={data.totalRounds}
		basePath="/stats/colors"
	/>

	<!-- 요약 통계 -->
	<StatsSummary
		stats={Object.entries(data.colorAverages).map(([colorKey, average]) => ({
			title: colorInfo[colorKey as keyof typeof colorInfo]?.name || colorKey,
			value: average,
			description: "평균 개수",
			theme: "primary"
		}))}
		columns={5}
	/>

	<!-- 색상별 구간 정보 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-6">
			<h2 class="card-title text-lg sm:text-xl">로또 번호 색상 구간</h2>
			<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mt-4">
				{#each Object.entries(colorInfo) as [colorKey, info]}
					<div class="text-center p-3 sm:p-4 rounded-lg border border-base-300">
						<div class="w-6 h-6 sm:w-8 sm:h-8 {info.bgClass} rounded-full mx-auto mb-2"></div>
						<div class="font-semibold text-sm sm:text-lg {info.textClass}">{info.name}</div>
						<div class="text-xs sm:text-sm text-base-content/70">{info.description}</div>
						<div class="text-xs text-base-content/60 mt-1 hidden sm:block">{info.numbers}</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- 색상별 평균 출현 횟수 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-6">
			<h2 class="card-title text-lg sm:text-xl">색상별 평균 출현 횟수</h2>
			<p class="text-sm text-base-content/60 mb-4">
				각 회차당 색상별로 평균 몇 개의 번호가 선택되는지 보여줍니다.
			</p>
			
			<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
				{#each Object.entries(data.colorAverages) as [colorKey, average]}
					{@const info = colorInfo[colorKey as keyof typeof colorInfo]}
					{@const frequency = getFrequencyAnalysis(colorKey, average)}
					
					<div class="stat bg-base-200 rounded-lg text-center p-3 sm:p-4">
						<div class="flex items-center justify-center gap-2 mb-2">
							<div class="w-3 h-3 sm:w-4 sm:h-4 {info.bgClass} rounded-full"></div>
							<div class="stat-title text-xs sm:text-sm">{info.name}</div>
						</div>
						<div class="stat-value text-lg sm:text-2xl {info.textClass}">{average}</div>
						<div class="stat-desc text-xs">평균 개수</div>
						<div class="badge badge-outline mt-1 text-xs">{frequency}</div>
					</div>
				{/each}
			</div>

			<!-- 색상 균형 분석 -->
			<div class="mt-4 sm:mt-6 p-3 sm:p-4 bg-base-200 rounded-lg">
				<h3 class="font-semibold mb-2 text-sm sm:text-base">색상 균형 분석</h3>
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
					<div>
						<span class="font-medium text-primary">적은 출현 (0-1개):</span>
						<span class="ml-2">{data.lowComplexityRate}%</span>
						<p class="text-xs text-base-content/60 mt-1">특정 색상에서 거의 선택되지 않음</p>
					</div>
					<div>
						<span class="font-medium text-secondary">많은 출현 (4-6개):</span>
						<span class="ml-2">{data.highComplexityRate}%</span>
						<p class="text-xs text-base-content/60 mt-1">특정 색상에 집중된 번호 조합</p>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- 색상별 개수 분포 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-6">
			<h2 class="card-title text-lg sm:text-xl">색상별 개수 분포</h2>
			<p class="text-sm text-base-content/60 mb-4">
				각 색상이 0개~6개 나타난 횟수를 보여줍니다.
			</p>

			{#each Object.entries(data.colorCountDistribution) as [colorKey, distribution]}
				{@const info = colorInfo[colorKey as keyof typeof colorInfo]}
				
				<div class="mb-4 sm:mb-6">
					<div class="flex items-center gap-2 mb-3">
						<div class="w-4 h-4 sm:w-5 sm:h-5 {info.bgClass} rounded-full"></div>
						<h3 class="font-semibold text-base sm:text-lg {info.textClass}">{info.name} ({info.description})</h3>
					</div>
					
					<div class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
						{#each Object.entries(distribution) as [count, frequency]}
							{@const percentage = data.totalRecords > 0 ? ((frequency / data.totalRecords) * 100).toFixed(1) : "0.0"}
							
							<div class="text-center p-2 sm:p-3 bg-base-200 rounded-lg">
								<div class="text-xs sm:text-sm text-base-content/70">{count}개</div>
								<div class="text-sm sm:text-lg font-bold {info.textClass}">{frequency}회</div>
								<div class="text-xs text-base-content/60">{percentage}%</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- 최근 10회차 색상 분포 -->
	{#if data.recentStats.length > 0}
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-6">
			<h2 class="card-title text-lg sm:text-xl">최근 10회차 색상 분포 추이</h2>
			
			<div class="overflow-x-auto -mx-3 sm:mx-0">
				<table class="table table-zebra w-full">
					<thead>
						<tr>
							<th class="sticky left-0 bg-base-200 z-10 min-w-[60px] text-xs sm:text-sm">회차</th>
							<th class="text-yellow-600 text-xs sm:text-sm min-w-[50px]">노랑</th>
							<th class="text-blue-600 text-xs sm:text-sm min-w-[50px]">파랑</th>
							<th class="text-red-600 text-xs sm:text-sm min-w-[50px]">빨강</th>
							<th class="text-gray-600 text-xs sm:text-sm min-w-[50px]">회색</th>
							<th class="text-green-600 text-xs sm:text-sm min-w-[50px]">초록</th>
							<th class="text-xs sm:text-sm min-w-[80px]">색상 조합</th>
						</tr>
					</thead>
					<tbody>
						{#each data.recentStats as stat}
							{@const colorCounts = [
								stat.yellow_count,
								stat.blue_count,
								stat.red_count,
								stat.grey_count,
								stat.green_count
							]}
							{@const hasAllColors = colorCounts.every(count => count > 0)}
							
							<tr>
								<td class="sticky left-0 bg-base-100 z-10 font-semibold text-xs sm:text-sm">{stat.round}회</td>
								<td class="text-center">
									<span class="badge badge-sm whitespace-nowrap {stat.yellow_count > 0 ? 'badge-warning' : 'badge-ghost'}">
										{stat.yellow_count}
									</span>
								</td>
								<td class="text-center">
									<span class="badge badge-sm whitespace-nowrap {stat.blue_count > 0 ? 'badge-info' : 'badge-ghost'}">
										{stat.blue_count}
									</span>
								</td>
								<td class="text-center">
									<span class="badge badge-sm whitespace-nowrap {stat.red_count > 0 ? 'badge-error' : 'badge-ghost'}">
										{stat.red_count}
									</span>
								</td>
								<td class="text-center">
									<span class="badge badge-sm whitespace-nowrap {stat.grey_count > 0 ? 'badge-neutral' : 'badge-ghost'}">
										{stat.grey_count}
									</span>
								</td>
								<td class="text-center">
									<span class="badge badge-sm whitespace-nowrap {stat.green_count > 0 ? 'badge-success' : 'badge-ghost'}">
										{stat.green_count}
									</span>
								</td>
								<td>
									{#if hasAllColors}
										<span class="badge badge-sm whitespace-nowrap badge-success">완전 분산</span>
									{:else if colorCounts.filter(c => c > 0).length >= 4}
										<span class="badge badge-sm whitespace-nowrap badge-info">균형</span>
									{:else if colorCounts.filter(c => c > 0).length >= 3}
										<span class="badge badge-sm whitespace-nowrap badge-warning">부분 편중</span>
									{:else}
										<span class="badge badge-sm whitespace-nowrap badge-error">심한 편중</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
	{/if}


	<!-- 색상 분석 가이드 -->
	<GuideSection
		title="색상 분석 완벽 가이드"
		description="색상 분석은 로또 번호를 구간별로 나누어 분석하는 지표로, 번호 선택의 균형성과 패턴을 측정합니다. 이 지표를 통해 당첨번호의 특성을 분석하고 향후 번호 선택 전략을 수립할 수 있습니다."
		guides={[
			{
				title: "🔸 균형잡힌 조합",
				items: [
					"<strong>고른 분산</strong> - 모든 색상에서 최소 1개씩",
					"<strong>적절한 집중</strong> - 특정 색상에 3개 이상 집중 안함",
					"<strong>초록색 고려</strong> - 1-2개가 일반적",
					`전체 ${data.totalRounds}회차 중 대부분의 당첨번호가 이 패턴을 따름`
				]
			},
			{
				title: "🔹 편중된 조합", 
				items: [
					"<strong>극단 집중</strong> - 특정 색상에 4개 이상",
					"<strong>제한적 분산</strong> - 2-3개 색상에서만 선택",
					"<strong>초록색 과다</strong> - 3개 이상 (매우 드문)",
					`전체 ${data.totalRounds}회차 중 소수의 당첨번호가 이 패턴을 따름`
				]
			},
			{
				title: "💡 색상 분석 활용 전략",
				items: [
					"<strong>균형 조합:</strong> 모든 색상 구간에서 최소 1개씩 선택하는 전략",
					"<strong>통계적 접근:</strong> 평균 색상별 개수를 참고한 조합 선택", 
					"<strong>패턴 분석:</strong> 최근 당첨번호의 색상 분포 추이를 확인하여 다음 회차 예측",
					`<strong>최빈값 활용:</strong> 가장 자주 나오는 색상 ${colorInfo[data.mostFrequentColor[0] as keyof typeof colorInfo]?.name} 참고`
				]
			}
		]}
		theme="info"
	/>
</div>