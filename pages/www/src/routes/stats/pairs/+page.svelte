<script lang="ts">
import {
	GuideSection,
	RecentAnalysisInput,
	StatsPageHero,
	StatsSummary,
} from "$lib/components/stats";
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";
import { JsonLd, MetaTags } from "svelte-meta-tags";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();

// Breadcrumbs 데이터
const breadcrumbItems = [
	{ label: "홈", href: "/" },
	{ label: "통계", href: "/stats" },
	{ label: "번호쌍분석", href: "/stats/pairs", current: true },
];

// 번호에 따른 색깔 클래스
const getNumberColorClass = (number: number) => {
	const remainder = number % 5;
	switch (remainder) {
		case 1:
			return "bg-yellow-500";
		case 2:
			return "bg-blue-500";
		case 3:
			return "bg-red-500";
		case 4:
			return "bg-gray-500";
		case 0:
			return "bg-green-500";
		default:
			return "bg-gray-400";
	}
};

// 동반 출현 빈도에 따른 등급
const getPairGrade = (pairCount: number) => {
	if (pairCount >= 25) return { grade: "S", class: "bg-red-500 text-white" };
	if (pairCount >= 20) return { grade: "A", class: "bg-orange-500 text-white" };
	if (pairCount >= 15) return { grade: "B", class: "bg-yellow-500 text-white" };
	if (pairCount >= 10) return { grade: "C", class: "bg-green-500 text-white" };
	if (pairCount >= 5) return { grade: "D", class: "bg-blue-500 text-white" };
	return { grade: "E", class: "bg-gray-500 text-white" };
};
</script>

<MetaTags
	title="로또 6/45 번호쌍 분석 통계 | 동반 출현 패턴 분석"
	titleTemplate="%s | 645.live"
	description="🔥 로또 6/45 최강 번호 조합 공개! 가장 많이 함께 나오는 황금 번호 쌍 분석으로 당첨 확률을 높여보세요!"
	canonical="https://645.live/stats/pairs"
	keywords={["로또번호쌍", "로또동반출현", "로또번호조합", "로또쌍분석", "6/45통계", "번호조합분석", "로또번호추천", "로또쌍통계", "동반출현분석", "번호조합패턴"]}
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
		url: 'https://645.live/stats/pairs',
		title: '로또 6/45 번호쌍 분석 통계 | 동반 출현 패턴',
		description: '🔥 로또 6/45 최강 번호 조합 공개! 가장 많이 함께 나오는 황금 번호 쌍 분석으로 당첨 확률을 높여보세요!',
		locale: 'ko_KR',
		images: [{
			url: `https://645.live/og?${new URLSearchParams({
				title: encodeURIComponent('로또 6/45 번호쌍 분석'),
				description: encodeURIComponent(`총 ${data.totalPairs}개 번호쌍 | 최대 동반출현 ${data.maxPairCount}회 | 평균 ${data.averagePairCount || '0.0'}회`),
				layout: 'minimal',
				theme: 'dark',
				format: 'svg'
			}).toString()}`,
			width: 1200,
			height: 630,
			alt: '로또 6/45 번호쌍 분석 통계',
			type: 'image/svg+xml'
		}],
		siteName: '645.live',
		article: {
			section: '로또 통계',
			tags: ['로또', '번호쌍분석', '동반출현', '번호조합', '로또통계', '6/45통계', '로또쌍분석', '번호조합분석'],
			publishedTime: '2024-01-01T00:00:00.000Z',
			modifiedTime: new Date().toISOString()
		}
	}}
	twitter={{
		cardType: 'summary_large_image',
		site: '@645live',
		title: '로또 6/45 번호쌍 분석 통계',
		description: '🔥 로또 6/45 최강 번호 조합 공개! 황금 번호 쌍 분석으로 당첨 확률을 높여보세요!',
		image: `https://645.live/og?${new URLSearchParams({
			title: encodeURIComponent('로또 6/45 번호쌍 분석'),
			description: encodeURIComponent(`${data.totalPairs}개 번호쌍 동반출현 패턴 분석`),
			layout: 'minimal',
			theme: 'dark',
			format: 'svg'
		}).toString()}`,
		imageAlt: '로또 6/45 번호쌍 분석 통계'
	}}
/>

<JsonLd
	schema={{
		'@type': 'Dataset',
		name: '로또 6/45 번호쌍 분석 통계',
		description: '로또 6/45 당첨번호의 동반 출현 패턴 및 번호 쌍 분석 데이터입니다.',
		url: 'https://645.live/stats/pairs',
		creator: {
			'@type': 'Organization',
			name: '645.live'
		},
		temporalCoverage: '전체 회차',
		spatial: {
			'@type': 'Country',
			name: '대한민국'
		},
		variableMeasured: [
			{
				'@type': 'PropertyValue',
				name: '번호쌍 개수',
				value: data.totalPairs
			},
			{
				'@type': 'PropertyValue',
				name: '최대 동반 출현 횟수',
				value: data.maxPairCount
			},
			{
				'@type': 'PropertyValue',
				name: '평균 동반 출현 횟수',
				value: data.averagePairCount
			}
		],
		mainEntity: {
			'@type': 'StatisticalPopulation',
			name: '로또 6/45 번호쌍',
			populationSize: data.totalPairs
		}
	}}
/>

<div class="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 max-sm:px-0">
	<!-- Breadcrumbs -->
	<Breadcrumbs items={breadcrumbItems} />

	<StatsPageHero
		eyebrow="Pair Correlation"
		title="번호쌍 분석 통계"
		description={`로또 6/45 당첨번호의 동반 출현 패턴을 분석합니다. 어떤 번호쌍이 함께 자주 등장하는지, 전체 ${data.totalPairs}개 번호쌍의 결합 흐름을 한 화면에서 읽을 수 있습니다.`}
		metrics={[
			{
				label: "총 번호쌍",
				value: data.totalPairs,
				note: "전체 조합 수",
				tone: "primary",
			},
			{
				label: "평균 동반 출현",
				value: data.averagePairCount,
				note: "번호쌍당 평균 횟수",
				tone: "secondary",
			},
			{
				label: "최대 기록",
				value: `${data.maxPairCount}회`,
				note: "가장 강한 번호쌍",
				tone: "accent",
			},
			{
				label: "최소 기록",
				value: `${data.minPairCount}회`,
				note: "최저 동반 출현",
			},
		]}
	/>

	<!-- 최근 회차 분석 -->
	<RecentAnalysisInput 
		maxRounds={data.totalRounds || 0}
		basePath="/stats/pairs"
	/>

	<!-- 통계 요약 -->
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
		<div class="stat bg-primary text-primary-content rounded-lg p-3 sm:p-4">
			<div class="stat-title text-xs sm:text-sm text-primary-content/70">총 번호 쌍</div>
			<div class="stat-value text-lg sm:text-xl lg:text-2xl">{data.totalPairs}</div>
			<div class="stat-desc text-xs sm:text-sm text-primary-content/70">전체 조합</div>
		</div>
		<div class="stat bg-secondary text-secondary-content rounded-lg p-3 sm:p-4">
			<div class="stat-title text-xs sm:text-sm text-secondary-content/70">평균 동반 출현</div>
			<div class="stat-value text-lg sm:text-xl lg:text-2xl">{data.averagePairCount}</div>
			<div class="stat-desc text-xs sm:text-sm text-secondary-content/70">회</div>
		</div>
		<div class="stat bg-accent text-accent-content rounded-lg p-3 sm:p-4">
			<div class="stat-title text-xs sm:text-sm text-accent-content/70">최대 동반 출현</div>
			<div class="stat-value text-lg sm:text-xl lg:text-2xl">{data.maxPairCount}</div>
			<div class="stat-desc text-xs sm:text-sm text-accent-content/70">최고 기록</div>
		</div>
		<div class="stat bg-info text-info-content rounded-lg p-3 sm:p-4">
			<div class="stat-title text-xs sm:text-sm text-info-content/70">최소 동반 출현</div>
			<div class="stat-value text-lg sm:text-xl lg:text-2xl">{data.minPairCount}</div>
			<div class="stat-desc text-xs sm:text-sm text-info-content/70">최저 기록</div>
		</div>
	</div>

	<!-- 동반 출현 분포 및 활발한 번호 -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
		<div class="card bg-base-100 shadow-sm">
			<div class="card-body p-4 sm:p-6">
				<h2 class="card-title text-lg sm:text-xl">동반 출현 횟수 분포</h2>
				<div class="space-y-2 sm:space-y-3">
					{#each Object.entries(data.pairCountDistribution) as [range, count]}
						{@const maxCount = Math.max(...Object.values(data.pairCountDistribution))}
						<div class="flex items-center justify-between">
							<span class="text-xs sm:text-sm font-medium">{range}회</span>
							<div class="flex items-center">
								<span class="text-xs sm:text-sm text-base-content/70 mr-2 w-8 sm:w-12 text-right">{count}</span>
								<div class="w-20 sm:w-32 bg-base-300 rounded-full h-2">
									<div 
										class="bg-primary h-2 rounded-full" 
										style="width: {maxCount > 0 ? (count / maxCount) * 100 : 0}%"
									></div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<div class="card bg-base-100 shadow-sm">
			<div class="card-body p-4 sm:p-6">
				<h2 class="card-title text-lg sm:text-xl">가장 활발한 번호 <span class="text-sm font-normal text-base-content/70">(총 동반 출현 횟수)</span></h2>
				{#if data.topNumbersByPairCount && data.topNumbersByPairCount.length > 0}
					<div class="space-y-2">
						{#each data.topNumbersByPairCount as [number, totalPairCount], index}
							<div class="flex items-center justify-between">
								<div class="flex items-center">
									<span class="text-xs sm:text-sm text-base-content/70 mr-2 w-4 sm:w-6">{index + 1}.</span>
									<a href="/n/{number}" class="lotto-ball-mobile {getNumberColorClass(number)} hover:scale-110 transition-transform">{number}</a>
								</div>
								<span class="text-xs sm:text-sm font-medium text-base-content">{totalPairCount.toLocaleString()}회</span>
							</div>
						{/each}
					</div>
				{:else}
					<div class="text-center py-4">
						<p class="text-sm text-base-content/60">데이터를 불러오는 중...</p>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- 번호 쌍 상세 통계 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-4 sm:p-6">
			<h2 class="card-title text-lg sm:text-xl">번호 쌍 상세 통계</h2>
			<p class="text-xs sm:text-sm text-base-content/60 mb-3 sm:mb-4">동반 출현 횟수별로 정렬된 번호 쌍 목록</p>
			
			<div class="overflow-x-auto -mx-3 sm:mx-0">
				<table class="table table-zebra w-full">
					<thead>
						<tr>
							<th class="sticky left-0 bg-base-200 z-10 min-w-[60px] text-xs sm:text-sm">순위</th>
							<th class="min-w-[140px] text-xs sm:text-sm">번호 쌍</th>
							<th class="min-w-[80px] text-xs sm:text-sm">동반 출현</th>
							<th class="min-w-[60px] text-xs sm:text-sm">등급</th>
						</tr>
					</thead>
					<tbody>
						{#each data.pairStats as stat, index}
							{@const statRecord = stat as { id: number; number_a: number; number_b: number; pair_count: number }}
							{@const grade = getPairGrade(statRecord.pair_count)}
							{@const rank = index + 1}
							<tr>
								<td class="sticky left-0 bg-base-100 z-10">
										<div class="text-xs sm:text-sm font-medium">
											{#if rank <= 3}
												<span class="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full {rank === 1 ? 'bg-yellow-400' : rank === 2 ? 'bg-gray-400' : 'bg-amber-600'} text-white text-xs font-bold">
													{rank}
												</span>
											{:else}
												{rank}
											{/if}
										</div>
									</td>
									<td>
										<div class="flex items-center space-x-1 sm:space-x-2">
											<a href="/n/{statRecord.number_a}" class="lotto-ball-mobile {getNumberColorClass(statRecord.number_a)} hover:scale-110 transition-transform">
												{statRecord.number_a}
											</a>
											<span class="text-base-content/40 text-xs sm:text-sm">+</span>
											<a href="/n/{statRecord.number_b}" class="lotto-ball-mobile {getNumberColorClass(statRecord.number_b)} hover:scale-110 transition-transform">
												{statRecord.number_b}
											</a>
										</div>
									</td>
								<td class="text-center">
									<div class="text-xs sm:text-sm font-medium">{statRecord.pair_count}회</div>
								</td>
								<td class="text-center">
									<span class="inline-flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full text-xs font-bold {grade.class}">
										{grade.grade}
									</span>
								</td>
								</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>

	<!-- 분석 가이드 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-4 sm:p-6">
			<h2 class="card-title text-lg sm:text-xl">👥 번호 쌍 분석 가이드</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 text-xs sm:text-sm">
				<div>
					<h4 class="font-semibold mb-2 sm:mb-3 text-primary text-sm sm:text-base">동반 출현 등급</h4>
					<ul class="space-y-1 sm:space-y-2 text-base-content/70">
						<li class="flex items-center">• <span class="inline-block w-4 h-4 bg-red-500 text-white text-xs text-center rounded mr-2 flex-shrink-0">S</span><strong>S등급</strong>: 25회 이상 (매우 높음)</li>
						<li class="flex items-center">• <span class="inline-block w-4 h-4 bg-orange-500 text-white text-xs text-center rounded mr-2 flex-shrink-0">A</span><strong>A등급</strong>: 20-24회 (높음)</li>
						<li class="flex items-center">• <span class="inline-block w-4 h-4 bg-yellow-500 text-white text-xs text-center rounded mr-2 flex-shrink-0">B</span><strong>B등급</strong>: 15-19회 (보통)</li>
						<li class="flex items-center">• <span class="inline-block w-4 h-4 bg-green-500 text-white text-xs text-center rounded mr-2 flex-shrink-0">C</span><strong>C등급</strong>: 10-14회 (낮음)</li>
						<li class="flex items-center">• <span class="inline-block w-4 h-4 bg-blue-500 text-white text-xs text-center rounded mr-2 flex-shrink-0">D</span><strong>D등급</strong>: 5-9회 (매우 낮음)</li>
					</ul>
				</div>
				<div>
					<h4 class="font-semibold mb-2 sm:mb-3 text-secondary text-sm sm:text-base">번호 쌍 활용법</h4>
					<ul class="space-y-1 sm:space-y-2 text-base-content/70">
						<li>• 상위 등급 번호 쌍은 함께 선택 고려</li>
						<li>• 동반 출현이 낮은 쌍도 미래에 나올 가능성 존재</li>
						<li>• 연속 번호보다 간격이 있는 번호 쌍이 더 자주 출현</li>
						<li>• 한 번호가 여러 번호와 자주 동반 출현할 수 있음</li>
					</ul>
				</div>
			</div>
			<div class="mt-3 sm:mt-4 p-3 sm:p-4 bg-info/10 rounded-lg">
				<p class="text-info font-medium text-xs sm:text-sm leading-relaxed">
					💡 팁: 전체 {data.totalPairs}개의 번호 쌍 중 평균 {data.averagePairCount}회 동반 출현합니다. 
					상위 등급 번호 쌍을 참고하여 번호 선택에 활용해보세요.
				</p>
			</div>
		</div>
	</div>
</div>

<style>
	.lotto-ball {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		color: white;
		font-weight: bold;
		font-size: 0.875rem;
	}

	.lotto-ball-mobile {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 50%;
		color: white;
		font-weight: bold;
		font-size: 0.75rem;
	}

	@media (min-width: 640px) {
		.lotto-ball-mobile {
			width: 2rem;
			height: 2rem;
			font-size: 0.875rem;
		}
	}

	.pagination-link {
		position: relative;
		display: inline-flex;
		align-items: center;
		padding: 0.5rem 1rem;
		border: 1px solid #d1d5db;
		background-color: white;
		font-size: 0.875rem;
		font-weight: 500;
		color: #6b7280;
	}
	
	.pagination-link:hover {
		background-color: #f9fafb;
	}
	
	.pagination-link.active {
		z-index: 10;
		background-color: #eff6ff;
		border-color: #3b82f6;
		color: #2563eb;
	}
</style>
