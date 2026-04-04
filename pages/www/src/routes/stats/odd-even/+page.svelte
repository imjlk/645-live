<script lang="ts">
import { RecentAnalysisInput, StatsPageHero } from "$lib/components/stats";
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";
import { JsonLd, MetaTags } from "svelte-meta-tags";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();

// 홀수 개수별 라벨
const getOddCountLabel = (count: number): string => {
	const labels = {
		0: "모두 짝수",
		1: "홀수 1개",
		2: "홀수 2개",
		3: "홀수 3개",
		4: "홀수 4개",
		5: "홀수 5개",
		6: "모두 홀수",
	};
	return labels[count as keyof typeof labels] || `홀수 ${count}개`;
};

// 홀짝 균형도 분석
const getBalanceAnalysis = (
	count: number,
): { type: string; description: string; color: string } => {
	if (count === 3) {
		return {
			type: "완벽한 균형",
			description: "홀수와 짝수가 3:3으로 균등",
			color: "text-success",
		};
	}
	if (count === 2 || count === 4) {
		return {
			type: "양호한 균형",
			description: "홀수와 짝수가 2:4 또는 4:2",
			color: "text-info",
		};
	}
	if (count === 1 || count === 5) {
		return {
			type: "불균형",
			description: "홀수와 짝수가 1:5 또는 5:1",
			color: "text-warning",
		};
	}
	return {
		type: "극도 불균형",
		description: "모두 홀수 또는 모두 짝수",
		color: "text-error",
	};
};

// 합계 구간 분석
const getSumRangeAnalysis = (range: string): string => {
	const analyses = {
		"60-80": "매우 낮음 - 작은 번호 위주",
		"81-100": "낮음 - 상대적으로 작은 번호",
		"101-120": "보통 - 일반적인 분포",
		"121-140": "보통 - 균형잡힌 분포",
		"141-160": "보통 - 일반적인 분포",
		"161-180": "높음 - 상대적으로 큰 번호",
		"181-200": "매우 높음 - 큰 번호 위주",
		"201-220": "극도로 높음 - 매우 큰 번호",
		"221-240": "최고 - 최대 번호 조합",
	};
	return analyses[range as keyof typeof analyses] || "분석 데이터 없음";
};

// Breadcrumbs 데이터
const breadcrumbItems = [
	{ label: "홈", href: "/" },
	{ label: "통계", href: "/stats" },
	{ label: "홀짝분석", href: "/stats/odd-even", current: true },
];
</script>

<MetaTags
	title="로또 6/45 홀짝 분석 통계 | 홀수/짝수 분포 패턴"
	titleTemplate="%s | 645.live"
	description="로또 6/45 당첨번호의 홀수/짝수 분포와 번호 합계 패턴을 분석합니다. 홀짝 균형도와 트렌드를 통해 번호 선택에 도움을 제공합니다."
	canonical="https://645.live/stats/odd-even"
	keywords={["로또", "홀짝분석", "홀수짝수", "로또통계", "번호합계", "로또패턴", "로또예측", "6/45통계", "홀짝균형", "번호분석"]}
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
		url: 'https://645.live/stats/odd-even',
		title: '로또 6/45 홀짝 분석 통계 | 홀수/짝수 분포 패턴',
		description: '로또 6/45 당첨번호의 홀수/짝수 분포와 번호 합계 패턴을 분석합니다. 홀짝 균형도와 트렌드를 통해 번호 선택에 도움을 제공합니다.',
		locale: 'ko_KR',
		images: [{
			url: `https://645.live/og?${new URLSearchParams({
				title: encodeURIComponent('로또 6/45 홀짝 분석'),
				description: encodeURIComponent(`홀수/짝수 분포 패턴 분석`),
				layout: 'blog',
				theme: 'dark',
				format: 'svg'
			}).toString()}`,
			width: 1200,
			height: 630,
			alt: '로또 6/45 홀짝 분석 통계',
			type: 'image/svg+xml'
		}],
		siteName: '645.live',
		article: {
			section: '로또 통계',
			tags: ['로또', '홀짝분석', '홀수짝수', '로또통계', '번호합계', '로또패턴', '6/45통계', '홀짝균형'],
			publishedTime: '2024-01-01T00:00:00.000Z',
			modifiedTime: new Date().toISOString()
		}
	}}
	twitter={{
		cardType: 'summary_large_image',
		site: '@645live',
		title: '로또 6/45 홀짝 분석 통계',
		description: '홀수/짝수 분포와 번호 합계 패턴 분석으로 로또 번호 선택에 도움을 제공합니다.',
		image: `https://645.live/og?${new URLSearchParams({
			title: encodeURIComponent('로또 6/45 홀짝 분석'),
			description: encodeURIComponent(`홀수/짝수 분포 패턴 분석`),
			layout: 'blog',
			theme: 'dark',
			format: 'svg'
		}).toString()}`,
		imageAlt: '로또 6/45 홀짝 분석 통계'
	}}
/>

<JsonLd
	schema={{
		'@type': 'Dataset',
		name: '로또 6/45 홀짝 분석 통계',
		description: '로또 6/45 당첨번호의 홀수/짝수 분포와 번호 합계 패턴을 분석한 통계 데이터입니다. 전체 회차 기준 홀짝 균형도와 합계 구간 흐름을 함께 확인할 수 있습니다.',
		url: 'https://645.live/stats/odd-even',
		creator: {
			'@type': 'Organization',
			name: '645.live'
		},
		license: 'https://645.live/terms-of-service',
		temporalCoverage: `전체 ${data.totalRounds}회차`,
		spatial: {
			'@type': 'Country',
			name: '대한민국'
		},
		variableMeasured: [
			{
				'@type': 'PropertyValue',
				name: '홀수 개수별 분포',
				value: Object.keys(data.oddEvenDistribution).length
			},
			{
				'@type': 'PropertyValue',
				name: '번호 합계 구간별 분포',
				value: Object.keys(data.sumDistribution).length
			},
			{
				'@type': 'PropertyValue',
				name: '균형잡힌 조합 비율',
				value: `${data.balancedRate}%`
			},
			{
				'@type': 'PropertyValue',
				name: '극단적 조합 비율',
				value: `${data.extremeRate}%`
			}
		]
	}}
/>

<div class="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 max-sm:px-0">
	<!-- Breadcrumbs -->
	<Breadcrumbs items={breadcrumbItems} />

	<StatsPageHero
		eyebrow="Odd Even Pattern"
		title="홀짝 분석 통계"
		description={`로또 6/45 당첨번호의 홀수·짝수 분포를 분석합니다. 전체 ${data.totalRounds}회차를 기준으로 균형형 조합과 극단 조합이 얼마나 자주 나왔는지 한눈에 비교할 수 있습니다.`}
		metrics={[
			{
				label: "균형 조합",
				value: `${data.balancedRate}%`,
				note: "3:3 또는 2:4 / 4:2 중심",
				tone: "primary",
			},
			{
				label: "극단 조합",
				value: `${data.extremeRate}%`,
				note: "0:6 또는 6:0 비중",
				tone: "secondary",
			},
			{
				label: "합계 구간",
				value: Object.keys(data.sumDistribution).length,
				note: "번호 합계 분포 범위",
				tone: "accent",
			},
			{
				label: "분석 회차",
				value: `${data.totalRounds}회`,
				note: "전체 회차 기준",
			},
		]}
	/>

	<!-- 최근 회차 분석 -->
	<RecentAnalysisInput 
		maxRounds={data.totalRounds}
		basePath="/stats/odd-even"
	/>

	<!-- 홀수 개수별 분포 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-6">
			<h2 class="card-title text-lg sm:text-xl">홀수 개수별 분포</h2>
			<p class="text-xs sm:text-sm text-base-content/60 mb-3 sm:mb-4">
				6개 번호 중 홀수의 개수에 따른 분포를 나타냅니다.
			</p>
			
			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-4">
				{#each Object.entries(data.oddEvenDistribution) as [oddCount, count]}
					{@const percentage = data.totalRecords > 0 ? ((Number(count) / data.totalRecords) * 100).toFixed(1) : "0.0"}
					{@const balance = getBalanceAnalysis(Number(oddCount))}
					
					<div class="text-center space-y-1 sm:space-y-2 p-2 sm:p-4 bg-base-200 rounded-lg">
						<div class="text-xs text-base-content/70">홀수</div>
						<div class="text-lg sm:text-2xl font-bold text-primary">{oddCount}개</div>
						<div class="text-sm sm:text-lg font-semibold">{count}회</div>
						<div class="text-xs sm:text-sm text-base-content/60">{percentage}%</div>
						<div class="text-xs badge badge-outline {balance.color.replace('text-', 'badge-')} badge-sm whitespace-nowrap">
							{balance.type}
						</div>
					</div>
				{/each}
			</div>

			<!-- 홀짝 균형도 분석 -->
			<div class="mt-4 sm:mt-6 p-3 sm:p-4 bg-base-200 rounded-lg">
				<h3 class="text-sm sm:text-base font-semibold mb-2 sm:mb-3">홀짝 균형도 분석</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
					{#each Object.entries(data.oddEvenDistribution) as [oddCount, count]}
						{@const percentage = data.selectedRounds > 0 ? ((Number(count) / data.selectedRounds) * 100).toFixed(1) : "0.0"}
						{@const balance = getBalanceAnalysis(Number(oddCount))}
						
						<div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
							<span class="font-medium">{getOddCountLabel(Number(oddCount))}:</span>
							<div class="sm:text-right">
								<span class="font-bold {balance.color}">{percentage}%</span>
								<div class="text-xs text-base-content/60">{balance.description}</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<!-- 번호 합계 분포 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-6">
			<h2 class="card-title text-lg sm:text-xl">번호 합계 구간별 분포</h2>
			<p class="text-xs sm:text-sm text-base-content/60 mb-3 sm:mb-4">
				6개 당첨번호의 합계를 구간별로 분석한 분포입니다.
			</p>
			
			<div class="overflow-x-auto -mx-3 sm:mx-0">
				<div class="min-w-full inline-block align-middle">
					<table class="table table-zebra w-full text-xs sm:text-sm">
						<thead>
							<tr class="text-xs sm:text-sm">
								<th class="sticky left-0 bg-base-200 z-10 min-w-[80px] font-semibold">합계 구간</th>
								<th class="min-w-[70px] text-center">출현 횟수</th>
								<th class="min-w-[70px] text-center">출현 비율</th>
								<th class="min-w-[120px]">분석</th>
							</tr>
						</thead>
						<tbody>
							{#each Object.entries(data.sumDistribution) as [range, count]}
								{@const percentage = data.selectedRounds > 0 ? ((Number(count) / data.selectedRounds) * 100).toFixed(1) : "0.0"}
								<tr>
									<td class="sticky left-0 bg-base-100 z-10 font-semibold text-sm sm:text-lg">{range}</td>
									<td class="text-center">{count}회</td>
									<td class="font-medium text-primary text-center">{percentage}%</td>
									<td class="text-xs sm:text-sm text-base-content/70">
										{getSumRangeAnalysis(range)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			<!-- 합계 분석 요약 -->
			<div class="mt-3 sm:mt-4 p-3 sm:p-4 bg-base-200 rounded-lg">
				<h3 class="text-sm sm:text-base font-semibold mb-2">합계 분포 특징</h3>
				<div class="text-xs sm:text-sm space-y-1">
					<p>• <strong>가장 일반적인 구간:</strong> 121-140 (균형잡힌 번호 분포)</p>
					<p>• <strong>이론적 평균:</strong> 138.5 (1+2+...+45의 평균값 × 6)</p>
					<p>• <strong>극단적 조합:</strong> 60-80 및 200+ 구간은 매우 드문 경우</p>
				</div>
			</div>
		</div>
	</div>

	<!-- 최근 회차별 상세 데이터 -->
	{#if data.oddEvenStats.length > 0}
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-6">
			<h2 class="card-title text-lg sm:text-xl">최근 회차별 홀짝 데이터</h2>
			
			<div class="overflow-x-auto -mx-3 sm:mx-0">
				<div class="min-w-full inline-block align-middle">
					<table class="table table-zebra w-full text-xs sm:text-sm">
						<thead>
							<tr class="text-xs sm:text-sm">
								<th class="sticky left-0 bg-base-200 z-10 min-w-[60px] font-semibold">회차</th>
								<th class="min-w-[70px] text-center">홀수 개수</th>
								<th class="min-w-[100px] text-center">홀짝 구성</th>
								<th class="min-w-[70px] text-center">번호 합계</th>
								<th class="min-w-[80px] text-center">균형도</th>
							</tr>
						</thead>
						<tbody>
							{#each data.oddEvenStats as stat}
								{@const statRecord = stat as unknown as { round: number; odd_count: number; numbers_sum: number }}
								{@const balance = getBalanceAnalysis(statRecord.odd_count)}
								<tr>
									<td class="sticky left-0 bg-base-100 z-10 font-semibold">{statRecord.round}회</td>
									<td class="text-sm sm:text-lg font-bold text-primary text-center">{statRecord.odd_count}개</td>
									<td class="text-center">
										<span class="badge badge-outline badge-sm whitespace-nowrap">
											홀수 {statRecord.odd_count} : 짝수 {6 - statRecord.odd_count}
										</span>
									</td>
									<td class="font-medium text-center">{statRecord.numbers_sum}</td>
									<td class="text-center">
										<div class="badge {balance.color.replace('text-', 'badge-')} badge-sm whitespace-nowrap">
											{balance.type}
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>
	{/if}


	<!-- 홀짝 분석 가이드 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-6">
			<h2 class="card-title text-lg sm:text-xl">홀짝 분석 가이드</h2>
			<div class="space-y-2 sm:space-y-3 text-xs sm:text-sm">
				<p>
					홀수와 짝수의 분포는 로또 번호 선택 시 중요한 고려사항입니다.
				</p>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
					<div>
						<h4 class="text-sm sm:text-base font-semibold text-primary mb-2">일반적인 패턴</h4>
						<ul class="list-disc list-inside space-y-1 text-base-content/70">
							<li><strong>홀수 3개:</strong> 가장 균형잡힌 조합</li>
							<li><strong>홀수 2-4개:</strong> 일반적으로 나타나는 범위</li>
							<li><strong>번호 합계:</strong> 120-160 구간이 일반적</li>
						</ul>
					</div>
					<div>
						<h4 class="text-sm sm:text-base font-semibold text-secondary mb-2">극단적인 패턴</h4>
						<ul class="list-disc list-inside space-y-1 text-base-content/70">
							<li><strong>모두 홀수/짝수:</strong> 매우 드문 경우</li>
							<li><strong>홀수 1개/5개:</strong> 불균형한 조합</li>
							<li><strong>합계 60-80/200+:</strong> 극단적인 분포</li>
						</ul>
					</div>
				</div>
				<div class="mt-3 sm:mt-4 p-3 bg-info/10 rounded-lg">
					<p class="text-info font-medium text-xs sm:text-sm">
						💡 팁: 대부분의 당첨번호는 홀수 2-4개 범위에서 나타나며, <br class="hidden sm:block" />
						<span class="block sm:inline">완전히 홀수만 또는 짝수만 나오는 경우는 매우 드뭅니다.</span>
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
