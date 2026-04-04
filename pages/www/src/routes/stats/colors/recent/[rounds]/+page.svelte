<!-- @ts-nocheck -->
<script lang="ts">
// @ts-nocheck
import { RecentAnalysisInput } from "$lib/components/stats";
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";
import { JsonLd, MetaTags } from "svelte-meta-tags";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();

// 색상별 정보
const colorInfo = {
	yellow: {
		name: "노랑",
		range: "1-10",
		class: "bg-yellow-500",
		bgClass: "bg-yellow-500/20 dark:bg-yellow-400/20",
		textClass: "text-yellow-600 dark:text-yellow-400",
	},
	blue: {
		name: "파랑",
		range: "11-20",
		class: "bg-blue-500",
		bgClass: "bg-blue-500/20 dark:bg-blue-400/20",
		textClass: "text-blue-600 dark:text-blue-400",
	},
	red: {
		name: "빨강",
		range: "21-30",
		class: "bg-red-500",
		bgClass: "bg-red-500/20 dark:bg-red-400/20",
		textClass: "text-red-600 dark:text-red-400",
	},
	grey: {
		name: "회색",
		range: "31-40",
		class: "bg-gray-500",
		bgClass: "bg-gray-500/20 dark:bg-gray-400/20",
		textClass: "text-gray-600 dark:text-gray-400",
	},
	green: {
		name: "초록",
		range: "41-45",
		class: "bg-green-500",
		bgClass: "bg-green-500/20 dark:bg-green-400/20",
		textClass: "text-green-600 dark:text-green-400",
	},
} as const;

// 백분율 계산
const getPercentage = (count: number, total: number): string => {
	return total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
};

// 색상 패턴 정렬 (출현 빈도순)
const sortedPatterns = $derived(
	Object.entries(data.colorStats.summary.distribution)
		.sort(([, a], [, b]) => Number(b) - Number(a))
		.slice(0, 10),
); // 상위 10개만 표시

// Breadcrumbs 데이터
const breadcrumbItems = [
	{ label: "홈", href: "/" },
	{ label: "통계", href: "/stats" },
	{ label: "색상분석", href: "/stats/colors" },
	{ label: "최근 회차 분석", current: true },
];
</script>

<MetaTags
	title={`로또 6/45 색상 분석 (최근 ${data.selectedRounds}회차) | 색상 구간별 상세 분석`}
	titleTemplate="%s | 645.live"
	description={`로또 6/45 최근 ${data.selectedRounds}회차 색상 구간별 상세 분석. 노랑 평균 ${data.colorStats.summary.colorAverages.yellow}개, 파랑 평균 ${data.colorStats.summary.colorAverages.blue}개 등 색상 분포 패턴 및 복잡도 분석을 통한 당첨번호 예측 정보 제공.`}
	canonical={`https://645.live/stats/colors/recent/${data.selectedRounds}`}
	keywords={[`로또 ${data.selectedRounds}회차`, "색상분석", "구간별분석", "색상패턴", "로또통계", "색상분포", "6/45통계", "번호예측"]}
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
		url: `https://645.live/stats/colors/recent/${data.selectedRounds}`,
		title: `로또 6/45 색상 분석 (최근 ${data.selectedRounds}회차) | 상세 통계`,
		description: `최근 ${data.selectedRounds}회차 색상 분석 - 노랑 ${data.colorStats.summary.colorAverages.yellow}개, 파랑 ${data.colorStats.summary.colorAverages.blue}개, 빨강 ${data.colorStats.summary.colorAverages.red}개`,
		locale: 'ko_KR',
		images: [{
			url: `https://645.live/og?${new URLSearchParams({
				title: encodeURIComponent(`색상 분석 (최근 ${data.selectedRounds}회차)`),
				description: encodeURIComponent(`노랑 ${data.colorStats.summary.colorAverages.yellow}개 | 파랑 ${data.colorStats.summary.colorAverages.blue}개 | 빨강 ${data.colorStats.summary.colorAverages.red}개 | 회색 ${data.colorStats.summary.colorAverages.grey}개 | 초록 ${data.colorStats.summary.colorAverages.green}개`),
				layout: 'minimal',
				theme: 'light',
				format: 'svg'
			}).toString()}`,
			width: 1200,
			height: 630,
			alt: `로또 6/45 색상 분석 ${data.selectedRounds}회차 분석`,
			type: 'image/svg+xml'
		}],
		siteName: '645.live',
		article: {
			section: '로또 통계',
			tags: ['로또', '색상분석', '구간별분석', '당첨번호', '통계분석', '6/45', `${data.selectedRounds}회차`],
			publishedTime: '2024-01-01T00:00:00.000Z',
			modifiedTime: new Date().toISOString()
		}
	}}
	twitter={{
		cardType: 'summary_large_image',
		site: '@645live',
		title: `로또 6/45 색상 분석 ${data.selectedRounds}회차 분석`,
		description: `최근 ${data.selectedRounds}회차 색상 분석 - 노랑 ${data.colorStats.summary.colorAverages.yellow}개, 파랑 ${data.colorStats.summary.colorAverages.blue}개, 빨강 ${data.colorStats.summary.colorAverages.red}개`,
		image: `https://645.live/og?${new URLSearchParams({
			title: encodeURIComponent(`색상 분석 (${data.selectedRounds}회차)`),
			description: encodeURIComponent(`5색 구간별 평균 분포 분석`),
			layout: 'minimal',
			theme: 'light',
			format: 'svg'
		}).toString()}`,
		imageAlt: `로또 6/45 색상 분석 ${data.selectedRounds}회차 분석`
	}}
/>

<JsonLd
	schema={{
		'@type': 'Dataset',
		name: `로또 6/45 색상 분석 ${data.selectedRounds}회차 분석 데이터`,
		description: `로또 6/45 최근 ${data.selectedRounds}회차의 색상 구간별 상세 분석 데이터. 노랑 평균 ${data.colorStats.summary.colorAverages.yellow}개, 분포 패턴 및 통계 정보를 제공합니다.`,
		url: `https://645.live/stats/colors/recent/${data.selectedRounds}`,
		creator: {
			'@type': 'Organization',
			name: '645.live'
		},
		license: 'https://645.live/terms-of-service',
		temporalCoverage: `최근 ${data.selectedRounds}회차`,
		spatial: {
			'@type': 'Country',
			name: '대한민국'
		},
		variableMeasured: [
			{
				'@type': 'PropertyValue',
				name: '노랑 색상 평균',
				value: data.colorStats.summary.colorAverages.yellow
			},
			{
				'@type': 'PropertyValue',
				name: '파랑 색상 평균',
				value: data.colorStats.summary.colorAverages.blue
			},
			{
				'@type': 'PropertyValue',
				name: '빨강 색상 평균',
				value: data.colorStats.summary.colorAverages.red
			},
			{
				'@type': 'PropertyValue',
				name: '회색 색상 평균',
				value: data.colorStats.summary.colorAverages.grey
			},
			{
				'@type': 'PropertyValue',
				name: '초록 색상 평균',
				value: data.colorStats.summary.colorAverages.green
			},
			{
				'@type': 'PropertyValue',
				name: '분석 회차수',
				value: data.selectedRounds
			}
		],
		mainEntity: {
			'@type': 'StatisticalPopulation',
			name: '로또 6/45 당첨번호',
			populationSize: data.selectedRounds
		}
	}}
/>

<div class="p-3 sm:p-6 space-y-4 sm:space-y-6 max-sm:px-0">
	<!-- Breadcrumbs -->
	<Breadcrumbs items={breadcrumbItems} />

	<!-- 페이지 헤더 -->
	<div class="text-center space-y-2">
		<h1 class="text-xl sm:text-2xl lg:text-3xl font-bold text-primary">로또 6/45 색상 분석 상세 분석</h1>
		<p class="text-base-content/70">
			최근 <strong class="text-primary">{data.selectedRounds}회차</strong>의 <strong>색상 구간별 분포</strong>와 패턴을 상세히 분석합니다.<br />
			노랑 평균 <strong class="text-secondary">{data.colorStats.summary.colorAverages.yellow}개</strong>, 파랑 평균 <strong class="text-accent">{data.colorStats.summary.colorAverages.blue}개</strong>의 색상 분포 분석을 통해 
			당첨번호 패턴을 파악해보세요.
		</p>
		<div class="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4 text-xs sm:text-sm text-base-content/60 mt-4">
			<span>📊 최빈 색상: <strong class="text-primary">{colorInfo[data.colorStats.summary.mostFrequentColor[0] as keyof typeof colorInfo]?.name}</strong></span>
			<span>📈 분석 회차: <strong class="text-secondary">{data.selectedRounds}회</strong></span>
			<span>🎯 평균 개수: <strong class="text-accent">{data.colorStats.summary.mostFrequentColor[1]}개</strong></span>
		</div>
	</div>

	<!-- 최근 회차 분석 -->
	<RecentAnalysisInput
		maxRounds={data.totalRounds}
		basePath="/stats/colors"
		selectedRounds={data.selectedRounds}
		returnHref="/stats/colors"
		buttonText="다른 최근 구간 보기"
	/>

	<!-- 요약 통계 -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
		{#each Object.entries(data.colorStats.summary.colorAverages) as [colorKey, average]}
			{@const info = colorInfo[colorKey as keyof typeof colorInfo]}
			
			<div class="stat bg-primary text-primary-content rounded-lg">
				<div class="stat-title text-primary-content/70">{info.name}</div>
				<div class="stat-value text-2xl">{average}</div>
				<div class="stat-desc text-primary-content/70">평균 개수</div>
			</div>
		{/each}
	</div>

	<!-- 색상 구간별 통계 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-6">
			<h2 class="card-title text-lg sm:text-xl">색상 구간별 출현 빈도</h2>
			<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
				{#each Object.entries(colorInfo) as [key, info]}
					{@const count = Number(data.colorStats.summary.colorCounts[key as keyof typeof data.colorStats.summary.colorCounts]) || 0}
					{@const totalNumbers = data.colorStats.summary.totalDraws * 6}
					<div class="p-3 sm:p-4 rounded-lg border {info.bgClass}">
						<div class="flex items-center mb-2">
							<div class="w-3 h-3 sm:w-4 sm:h-4 rounded-full {info.class} mr-2"></div>
							<span class="font-semibold text-sm sm:text-base {info.textClass}">{info.name}</span>
						</div>
						<div class="text-xs text-gray-600 mb-2">{info.range}</div>
						<div class="text-sm sm:text-lg font-bold {info.textClass} mb-1">{count}</div>
						<div class="text-xs {info.textClass} mb-2">
							{getPercentage(count, totalNumbers)}%
						</div>
						<div class="w-full bg-white/50 rounded-full h-1.5 sm:h-2">
							<div
								class="{info.class} h-1.5 sm:h-2 rounded-full transition-all duration-300"
								style="width: {getPercentage(count, totalNumbers)}%"
							></div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- 자주 나오는 색상 패턴 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-6">
			<h2 class="card-title text-lg sm:text-xl">자주 나오는 색상 패턴 (상위 10개)</h2>
			<div class="space-y-2 sm:space-y-3">
				{#each sortedPatterns as [pattern, count]}
					{@const colors = pattern.split('-')}
					<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 sm:p-3 bg-base-200 rounded-lg">
						<div class="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
							<div class="flex items-center space-x-1 flex-wrap">
								{#each colors as colorCount, index}
									{@const colorKey = Object.keys(colorInfo)[index] as keyof typeof colorInfo}
									{@const info = colorInfo[colorKey]}
									<div class="flex items-center">
										<div class="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full {info.class}"></div>
										<span class="text-xs sm:text-sm font-medium ml-1">{colorCount}</span>
									</div>
								{/each}
							</div>
							<div class="text-xs sm:text-sm text-base-content/60 hidden sm:block">
								({colors.map((c, i) => `${colorInfo[Object.keys(colorInfo)[i] as keyof typeof colorInfo].name} ${c}개`).join(', ')})
							</div>
						</div>
						<div class="flex items-center space-x-2 mt-2 sm:mt-0">
							<span class="font-semibold text-sm sm:text-base">{count}회</span>
							<span class="text-xs sm:text-sm text-base-content/60">
								({getPercentage(Number(count), data.colorStats.summary.totalDraws)}%)
							</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- 추첨 결과 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-6">
			<h2 class="card-title text-lg sm:text-xl">추첨 결과 ({data.selectedRounds}회차)</h2>
			
			<div class="overflow-x-auto -mx-3 sm:mx-0">
				<table class="table table-zebra w-full">
					<thead>
						<tr>
							<th class="sticky left-0 bg-base-200 z-10 text-xs sm:text-sm min-w-[60px]">회차</th>
							<th class="text-yellow-600 min-w-[50px] text-center text-xs sm:text-sm">노랑</th>
							<th class="text-blue-600 min-w-[50px] text-center text-xs sm:text-sm">파랑</th>
							<th class="text-red-600 min-w-[50px] text-center text-xs sm:text-sm">빨강</th>
							<th class="text-gray-600 min-w-[50px] text-center text-xs sm:text-sm">회색</th>
							<th class="text-green-600 min-w-[50px] text-center text-xs sm:text-sm">초록</th>
							<th class="min-w-[80px] text-center text-xs sm:text-sm">색상 조합</th>
						</tr>
					</thead>
					<tbody>
						{#each data.colorStats.records as record}
							{@const colorCounts = [
								record.yellow_count,
								record.blue_count,
								record.red_count,
								record.grey_count,
								record.green_count
							]}
							{@const hasAllColors = colorCounts.every(count => count > 0)}
							
							<tr>
								<td class="sticky left-0 bg-base-100 z-10 font-semibold text-xs sm:text-sm">{record.round}회</td>
								<td class="text-center">
									<span class="badge badge-sm whitespace-nowrap {record.yellow_count > 0 ? 'badge-warning' : 'badge-ghost'}">
										{record.yellow_count}
									</span>
								</td>
								<td class="text-center">
									<span class="badge badge-sm whitespace-nowrap {record.blue_count > 0 ? 'badge-info' : 'badge-ghost'}">
										{record.blue_count}
									</span>
								</td>
								<td class="text-center">
									<span class="badge badge-sm whitespace-nowrap {record.red_count > 0 ? 'badge-error' : 'badge-ghost'}">
										{record.red_count}
									</span>
								</td>
								<td class="text-center">
									<span class="badge badge-sm whitespace-nowrap {record.grey_count > 0 ? 'badge-neutral' : 'badge-ghost'}">
										{record.grey_count}
									</span>
								</td>
								<td class="text-center">
									<span class="badge badge-sm whitespace-nowrap {record.green_count > 0 ? 'badge-success' : 'badge-ghost'}">
										{record.green_count}
									</span>
								</td>
								<td class="text-center">
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

	<!-- 색상 분석 요약 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-6">
			<h2 class="card-title text-lg sm:text-xl">색상 분석 요약</h2>
			<div class="space-y-3 sm:space-y-4 text-xs sm:text-sm">
				<p class="text-base leading-relaxed">
					최근 <strong class="text-primary">{data.selectedRounds}회차</strong>의 색상 구간별 분포를 분석한 결과입니다. 
					노랑 평균 <strong class="text-secondary">{data.colorStats.summary.colorAverages.yellow}개</strong>, 
					파랑 평균 <strong class="text-accent">{data.colorStats.summary.colorAverages.blue}개</strong> 등의 분포를 보이고 있습니다.
				</p>
				
				<div class="bg-info/5 p-3 sm:p-4 rounded-lg">
					<h3 class="font-semibold text-info mb-2 text-sm sm:text-base">💡 이 분석으로 알 수 있는 것</h3>
					<ul class="list-disc list-inside space-y-1 text-base-content/70">
						<li><strong>색상 분포 패턴:</strong> 번호 구간별 색상 조합의 균형성</li>
						<li><strong>출현 빈도:</strong> 각 색상 구간의 출현 횟수와 비율</li>
						<li><strong>트렌드 분석:</strong> 최근 {data.selectedRounds}회차의 색상 분포 변화 추이</li>
						<li><strong>예측 참고:</strong> 통계적 패턴을 통한 향후 번호 선택 가이드</li>
					</ul>
				</div>
			</div>
		</div>
	</div>
</div>
