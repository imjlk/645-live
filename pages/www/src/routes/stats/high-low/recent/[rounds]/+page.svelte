<script lang="ts">
import { JsonLd, MetaTags } from "svelte-meta-tags";
import { RecentAnalysisInput } from "$lib/components/stats";
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();

// Breadcrumbs 데이터
const breadcrumbItems = [
	{ label: "홈", href: "/" },
	{ label: "통계", href: "/stats" },
	{ label: "고저분석", href: "/stats/high-low" },
	{
		label: "최근 회차 분석",
		current: true,
	},
];

// 백분율 계산
const getPercentage = (count: number, total: number): string => {
	return total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
};

// 고저 패턴 정렬 (출현 빈도순)
const sortedPatterns = $derived(
	Object.entries(data.highLowStats.summary.distribution).sort(
		([, a], [, b]) => Number(b) - Number(a),
	),
);

// 고저 균형 계산
const totalNumbers = $derived(data.highLowStats.summary.totalDraws * 6);
const lowPercentage = $derived(
	getPercentage(data.highLowStats.summary.lowCount, totalNumbers),
);
const highPercentage = $derived(
	getPercentage(data.highLowStats.summary.highCount, totalNumbers),
);

const pageTitle = $derived(
	`최근 ${data.selectedRounds}회 로또 고저 분포와 회차별 기록`,
);
const pageDescription = $derived(
	`로또 6/45 최근 ${data.selectedRounds}회차 추첨 결과에서 저구간 1~22와 고구간 23~45의 출현 분포를 확인하세요. 회차당 평균 개수와 고저 비율, 자주 나타난 조합을 비교하고 기간을 선택해 회차별 당첨번호의 분포를 살펴볼 수 있습니다.`,
);
</script>

<MetaTags
	title={pageTitle}
	titleTemplate="%s | 645.live"
	description={pageDescription}
	canonical={`https://645.live/stats/high-low/recent/${data.selectedRounds}`}
	keywords={["로또", "고저분석", "번호분포", "로또통계", "고저패턴", "번호균형", "6/45통계", "고저별통계", "번호고저분석"]}
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
		url: `https://645.live/stats/high-low/recent/${data.selectedRounds}`,
		title: pageTitle,
		description: pageDescription,
		locale: 'ko_KR',
		images: [{
			url: `https://645.live/og?${new URLSearchParams({
				title: encodeURIComponent(`고저 분석 (최근 ${data.selectedRounds}회차)`),
				description: encodeURIComponent(`저구간 평균 ${data.highLowStats.summary.lowAverage}개 | 고구간 평균 ${data.highLowStats.summary.highAverage}개 | 저구간 ${lowPercentage}% | 고구간 ${highPercentage}%`),
				layout: 'minimal',
				theme: 'dark',
				format: 'svg'
			}).toString()}`,
			width: 1200,
			height: 630,
			alt: '로또 6/45 고저 분석 통계',
			type: 'image/svg+xml'
		}],
		siteName: '645.live',
		article: {
			section: '로또 통계',
			tags: ['로또', '고저분석', '번호분포', '로또통계', '고저패턴', '번호균형', '6/45통계', '고저별통계'],
		}
	}}
	twitter={{
		cardType: 'summary_large_image',
		site: '@645live',
		title: pageTitle,
		description: pageDescription,
		image: `https://645.live/og?${new URLSearchParams({
			title: encodeURIComponent(`고저 분석 (${data.selectedRounds}회차)`),
			description: encodeURIComponent(`저구간 ${lowPercentage}% | 고구간 ${highPercentage}%`),
			layout: 'minimal',
			theme: 'dark',
			format: 'svg'
		}).toString()}`,
		imageAlt: '로또 6/45 고저 분석 통계'
	}}
/>

<JsonLd
	schema={{
		'@type': 'Dataset',
		name: `로또 6/45 고저 분석 통계 (최근 ${data.selectedRounds}회차)`,
		description: `로또 6/45 고저 번호 분포를 분석한 통계 데이터입니다 (최근 ${data.selectedRounds}회차). 최근 회차 기준 저구간과 고구간의 균형 변화와 출현 패턴을 함께 확인할 수 있습니다.`,
		url: `https://645.live/stats/high-low/recent/${data.selectedRounds}`,
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
				name: '저구간 평균',
				value: data.highLowStats.summary.lowAverage
			},
			{
				'@type': 'PropertyValue',
				name: '고구간 평균',
				value: data.highLowStats.summary.highAverage
			},
			{
				'@type': 'PropertyValue',
				name: '저구간 비율',
				value: `${lowPercentage}%`
			},
			{
				'@type': 'PropertyValue',
				name: '고구간 비율',
				value: `${highPercentage}%`
			}
		]
	}}
/>

<div class="stats-page">
	<!-- Breadcrumbs -->
	<Breadcrumbs items={breadcrumbItems} />

	<!-- 페이지 헤더 -->
	<header class="stats-recent-heading space-y-2">
		<h1 class="font-bold">최근 {data.selectedRounds}회 고저 분포</h1>
		<p>저구간 1~22와 고구간 23~45의 출현 개수를 비교하세요.</p>
	</header>

	<RecentAnalysisInput
		maxRounds={data.totalRounds}
		basePath="/stats/high-low"
		selectedRounds={data.selectedRounds}
		returnHref="/stats/high-low"
		buttonText="다른 최근 구간 보기"
	/>

	<!-- 요약 통계 -->
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
		<div class="stat bg-primary text-primary-content rounded-lg p-3 sm:p-4">
			<div class="stat-title text-primary-content/70 text-xs sm:text-sm">저구간 (1-22)</div>
			<div class="stat-value text-xl sm:text-2xl">{data.highLowStats.summary.lowAverage}</div>
			<div class="stat-desc text-primary-content/70 text-xs">평균 개수</div>
		</div>
		
		<div class="stat bg-secondary text-secondary-content rounded-lg p-3 sm:p-4">
			<div class="stat-title text-secondary-content/70 text-xs sm:text-sm">고구간 (23-45)</div>
			<div class="stat-value text-xl sm:text-2xl">{data.highLowStats.summary.highAverage}</div>
			<div class="stat-desc text-secondary-content/70 text-xs">평균 개수</div>
		</div>
	</div>

	<!-- 고저 균형 요약 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-4 md:p-6">
			<h2 class="card-title text-base sm:text-lg">고저 균형 요약</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
				<!-- 저 (1-22) -->
				<div class="p-3 sm:p-4 bg-blue-500/10 dark:bg-blue-400/10 rounded-lg">
					<div class="flex items-center justify-between mb-2">
						<h3 class="text-base sm:text-lg font-semibold text-blue-600 dark:text-blue-400">저 (1-22)</h3>
						<div class="text-xl sm:text-2xl font-bold text-blue-600">{data.highLowStats.summary.lowCount}</div>
					</div>
					<div class="text-sm text-blue-600 dark:text-blue-400 mb-3">{lowPercentage}%</div>
					<div class="w-full bg-blue-500/20 dark:bg-blue-400/20 rounded-full h-2 sm:h-3">
						<div
							class="bg-blue-600 h-2 sm:h-3 rounded-full transition-all duration-300"
							style="width: {lowPercentage}%"
						></div>
					</div>
				</div>

				<!-- 고 (23-45) -->
				<div class="p-3 sm:p-4 bg-red-500/10 dark:bg-red-400/10 rounded-lg">
					<div class="flex items-center justify-between mb-2">
						<h3 class="text-base sm:text-lg font-semibold text-red-600 dark:text-red-400">고 (23-45)</h3>
						<div class="text-xl sm:text-2xl font-bold text-red-600">{data.highLowStats.summary.highCount}</div>
					</div>
					<div class="text-sm text-red-600 dark:text-red-400 mb-3">{highPercentage}%</div>
					<div class="w-full bg-red-500/20 dark:bg-red-400/20 rounded-full h-2 sm:h-3">
						<div
							class="bg-red-600 h-2 sm:h-3 rounded-full transition-all duration-300"
							style="width: {highPercentage}%"
						></div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- 고저 패턴 분포 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-4 md:p-6">
			<h2 class="card-title text-base sm:text-lg">고저 패턴 분포</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
				{#each sortedPatterns as [pattern, count] (pattern)}
					{@const [low, high] = pattern.split(':').map(num => Number(num) || 0)}
					<div class="p-3 sm:p-4 rounded-lg border bg-base-200">
						<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-1 sm:gap-0">
							<span class="font-semibold text-sm sm:text-base">저 {low}개 : 고 {high}개</span>
							<span class="text-xs sm:text-sm font-medium">{count}회</span>
						</div>
						<div class="text-xs text-base-content/60 mb-2">
							{getPercentage(Number(count), data.highLowStats.summary.totalDraws)}%
						</div>
						<div class="flex space-x-1 justify-start">
							<!-- 저 구간 표시 -->
							{#each Array(Math.min(Math.max(low || 0, 0), 6)) as _, index (index)}
								<div class="w-3 h-3 sm:w-4 sm:h-4 bg-blue-500 rounded"></div>
							{/each}
							<!-- 고 구간 표시 -->
							{#each Array(Math.min(Math.max(high || 0, 0), 6)) as _, index (index)}
								<div class="w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded"></div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- 추첨 결과 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-4 md:p-6">
			<h2 class="card-title text-base sm:text-lg">추첨 결과 ({data.selectedRounds}회차)</h2>
			
			<div class="overflow-x-auto -mx-3 sm:mx-0">
				<div class="min-w-full inline-block align-middle">
					<table class="table table-zebra w-full text-xs sm:text-sm">
						<thead>
							<tr class="text-xs sm:text-sm">
								<th class="sticky left-0 bg-base-200 z-10 min-w-[60px] font-semibold">회차</th>
								<th class="text-blue-600 min-w-[70px] text-center">저구간</th>
								<th class="text-red-600 min-w-[70px] text-center">고구간</th>
								<th class="min-w-[80px] text-center">고저 비율</th>
							</tr>
						</thead>
						<tbody>
							{#each data.highLowStats.records as record (record.round)}
								{@const isBalanced = Math.abs(record.low_count - record.high_count) <= 1}
								
								<tr>
									<td class="sticky left-0 bg-base-100 z-10 font-semibold">{record.round}회</td>
									<td class="text-center">
										<span class="badge badge-sm whitespace-nowrap {record.low_count > 0 ? 'badge-info' : 'badge-ghost'}">
											{record.low_count}개
										</span>
									</td>
									<td class="text-center">
										<span class="badge badge-sm whitespace-nowrap {record.high_count > 0 ? 'badge-error' : 'badge-ghost'}">
											{record.high_count}개
										</span>
									</td>
									<td class="text-center">
										{#if isBalanced}
											<span class="badge badge-success badge-sm">균형</span>
										{:else if record.low_count > record.high_count}
											<span class="badge badge-info badge-sm">Low</span>
										{:else}
											<span class="badge badge-error badge-sm">High</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>

	<!-- 고저 분석 요약 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-4 md:p-6">
			<h2 class="card-title text-base sm:text-lg">고저 분석 요약</h2>
			<div class="space-y-3 sm:space-y-4 text-xs sm:text-sm">
				<p class="text-sm sm:text-base leading-relaxed">
					최근 <strong class="text-primary">{data.selectedRounds}회차</strong>의 고저 분포를 분석한 결과입니다. 
					저구간 평균 <strong class="text-secondary">{data.highLowStats.summary.lowAverage}개</strong>, 
					고구간 평균 <strong class="text-accent">{data.highLowStats.summary.highAverage}개</strong>의 분포를 보이고 있습니다.
				</p>
				
				<div class="bg-info/5 p-3 sm:p-4 rounded-lg">
					<h3 class="font-semibold text-info mb-2 text-sm sm:text-base">💡 이 분석으로 알 수 있는 것</h3>
					<ul class="list-disc list-inside space-y-1 text-base-content/70">
						<li><strong>고저 분포 균형:</strong> 저구간과 고구간의 균형성</li>
						<li><strong>출현 패턴:</strong> 저구간이나 고구간에 집중되는 경향</li>
						<li><strong>트렌드 분석:</strong> 최근 {data.selectedRounds}회차의 고저 분포 변화 추이</li>
						<li><strong>해석 기준:</strong> 과거 출현 분포는 다음 추첨의 개별 번호 확률을 높이지 않습니다.</li>
					</ul>
				</div>
				
				<div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mt-3">
					<div class="flex items-center p-2 bg-base-200 rounded">
						<div class="w-3 h-3 sm:w-4 sm:h-4 bg-blue-500 rounded mr-2"></div>
						<span class="text-xs sm:text-sm font-medium">저 구간 (1-22)</span>
					</div>
					<div class="flex items-center p-2 bg-base-200 rounded">
						<div class="w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded mr-2"></div>
						<span class="text-xs sm:text-sm font-medium">고 구간 (23-45)</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
