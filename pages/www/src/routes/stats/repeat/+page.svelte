<script lang="ts">
import { RecentAnalysisInput, StatsPageHero } from "$lib/components/stats";
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";
import LinkButton from "$lib/ui/LinkButton.svelte";
import { JsonLd, MetaTags } from "svelte-meta-tags";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();

// Breadcrumbs 데이터
const breadcrumbItems = [
	{ label: "홈", href: "/" },
	{ label: "통계", href: "/stats" },
	{ label: "연속번호", href: "/stats/repeat", current: true },
];

// 중복 개수별 라벨
const getRepeatLabel = (count: number): string => {
	const labels = {
		0: "중복 없음",
		1: "1개 중복",
		2: "2개 중복",
		3: "3개 중복",
		4: "4개 중복",
		5: "5개 중복",
		6: "모두 중복",
	};
	return labels[count as keyof typeof labels] || `${count}개 중복`;
};

// 중복 패턴 분석
const getRepeatAnalysis = (
	count: number,
): { type: string; description: string; color: string } => {
	if (count === 0) {
		return {
			type: "완전 새로움",
			description: "이전 회차와 중복 번호 없음",
			color: "text-success",
		};
	}
	if (count === 1 || count === 2) {
		return {
			type: "일반적 중복",
			description: "평범한 수준의 연속성",
			color: "text-info",
		};
	}
	if (count === 3) {
		return {
			type: "높은 중복",
			description: "높은 연속성",
			color: "text-warning",
		};
	}
	return {
		type: "매우 높은 중복",
		description: "매우 높은 연속성 (드문 경우)",
		color: "text-error",
	};
};

</script>

<MetaTags
	title="로또 6/45 연속번호 분석 통계 | 회차간 중복 패턴 분석"
	titleTemplate="%s | 645.live"
	description="로또 6/45 연속 회차 간 중복 번호 패턴을 분석합니다. 이전 회차와의 번호 중복 빈도와 연속성 트렌드를 제공합니다."
	canonical="https://645.live/stats/repeat"
	keywords={["로또", "연속번호", "중복번호", "로또통계", "번호패턴", "연속성분석", "로또예측", "6/45통계", "로또연속성", "번호중복분석"]}
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
		url: 'https://645.live/stats/repeat',
		title: '로또 6/45 연속번호 분석 통계 | 회차간 중복 패턴',
		description: '로또 6/45 연속 회차 간 중복 번호 패턴을 분석합니다. 이전 회차와의 번호 중복 빈도와 연속성 트렌드를 제공합니다.',
		locale: 'ko_KR',
		images: [{
			url: `https://645.live/og?${new URLSearchParams({
				title: encodeURIComponent('로또 6/45 연속번호 분석'),
				description: encodeURIComponent(`평균 중복: ${data.averageRepeatCount}개 | 최대 중복: ${data.maxRepeatCount}개 | 중복없음: ${data.zeroRepeatRate}%`),
				layout: 'minimal',
				theme: 'dark',
				format: 'svg'
			}).toString()}`,
			width: 1200,
			height: 630,
			alt: '로또 6/45 연속번호 분석 통계',
			type: 'image/svg+xml'
		}],
		siteName: '645.live',
		article: {
			section: '로또 통계',
			tags: ['로또', '연속번호', '중복번호', '로또통계', '번호패턴', '연속성분석', '6/45통계', '로또연속성'],
			publishedTime: '2024-01-01T00:00:00.000Z',
			modifiedTime: new Date().toISOString()
		}
	}}
	twitter={{
		cardType: 'summary_large_image',
		site: '@645live',
		title: '로또 6/45 연속번호 분석 통계',
		description: '회차간 중복 패턴 분석으로 로또 번호 연속성을 파악하세요.',
		image: `https://645.live/og?${new URLSearchParams({
			title: encodeURIComponent('로또 6/45 연속번호 분석'),
			description: encodeURIComponent(`평균 중복 ${data.averageRepeatCount}개 | 중복없음 ${data.zeroRepeatRate}%`),
			layout: 'minimal',
			theme: 'dark',
			format: 'svg'
		}).toString()}`,
		imageAlt: '로또 6/45 연속번호 분석 통계'
	}}
/>

<JsonLd
	schema={{
		'@type': 'Dataset',
		name: '로또 6/45 연속번호 분석 통계',
		description: '로또 6/45 연속 회차 간 중복 번호 패턴을 분석한 통계 데이터입니다.',
		url: 'https://645.live/stats/repeat',
		creator: {
			'@type': 'Organization',
			name: '645.live'
		},
		temporalCoverage: `전체 ${data.totalRounds}회차`,
		spatial: {
			'@type': 'Country',
			name: '대한민국'
		},
		variableMeasured: [
			{
				'@type': 'PropertyValue',
				name: '평균 중복 개수',
				value: data.averageRepeatCount
			},
			{
				'@type': 'PropertyValue',
				name: '최대 중복 개수',
				value: data.maxRepeatCount
			},
			{
				'@type': 'PropertyValue',
				name: '중복 없음 비율',
				value: `${data.zeroRepeatRate}%`
			},
			{
				'@type': 'PropertyValue',
				name: '높은 중복 비율',
				value: `${data.highRepeatRate}%`
			}
		]
	}}
/>

<div class="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 max-sm:px-0">
	<!-- Breadcrumbs -->
	<Breadcrumbs items={breadcrumbItems} />

	<StatsPageHero
		eyebrow="Repeat Pattern"
		title="연속번호 분석 통계"
		description={`연속 회차 사이에 얼마나 많은 번호가 다시 등장하는지 분석합니다. 이전 회차와 현재 회차의 중복 빈도와 연속성을 통해 새 번호 위주의 흐름인지, 반복 출현이 강한 흐름인지 비교할 수 있습니다.`}
		metrics={[
			{
				label: "평균 중복",
				value: `${data.averageRepeatCount}개`,
				note: "회차 간 평균 중복 개수",
				tone: "primary",
			},
			{
				label: "최대 중복",
				value: `${data.maxRepeatCount}개`,
				note: "가장 높은 중복 기록",
				tone: "secondary",
			},
			{
				label: "중복 없음",
				value: `${data.zeroRepeatRate}%`,
				note: "이전 회차와 겹치지 않은 비율",
				tone: "accent",
			},
			{
				label: "높은 중복",
				value: `${data.highRepeatRate}%`,
				note: "3개 이상 중복 비중",
			},
		]}
	/>

	<RecentAnalysisInput maxRounds={data.totalRounds} basePath="/stats/repeat" />

	<!-- 요약 통계 -->
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
		<div class="stat bg-primary text-primary-content rounded-lg p-3 sm:p-6">
			<div class="stat-title text-primary-content/70 text-xs sm:text-sm">평균 중복 개수</div>
			<div class="stat-value text-lg sm:text-2xl">{data.averageRepeatCount}</div>
			<div class="stat-desc text-primary-content/70 text-xs sm:text-sm">전체 {data.totalRecords}회차</div>
		</div>
		
		<div class="stat bg-secondary text-secondary-content rounded-lg p-3 sm:p-6">
			<div class="stat-title text-secondary-content/70 text-xs sm:text-sm">최대 중복 개수</div>
			<div class="stat-value text-lg sm:text-2xl">{data.maxRepeatCount}</div>
			<div class="stat-desc text-secondary-content/70 text-xs sm:text-sm">기록상 최고치</div>
		</div>
		
		<div class="stat bg-accent text-accent-content rounded-lg p-3 sm:p-6">
			<div class="stat-title text-accent-content/70 text-xs sm:text-sm">중복 없음</div>
			<div class="stat-value text-lg sm:text-2xl">{data.zeroRepeatRate}%</div>
			<div class="stat-desc text-accent-content/70 text-xs sm:text-sm">{data.zeroRepeatCount}회 중복 없음</div>
		</div>
		
		<div class="stat bg-info text-info-content rounded-lg p-3 sm:p-6">
			<div class="stat-title text-info-content/70 text-xs sm:text-sm">높은 중복</div>
			<div class="stat-value text-lg sm:text-2xl">{data.highRepeatRate}%</div>
			<div class="stat-desc text-info-content/70 text-xs sm:text-sm">3개 이상 중복</div>
		</div>
	</div>

	<!-- 중복 개수별 분포 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-6">
			<h2 class="card-title text-base sm:text-lg">중복 개수별 분포</h2>
			<p class="text-xs sm:text-sm text-base-content/60 mb-3 sm:mb-4">
				이전 회차와 중복되는 번호의 개수별 분포를 나타냅니다.
			</p>
			
			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-4">
				{#each Object.entries(data.repeatCountDistribution || {}) as [repeatCount, count]}
					{@const percentage = data.totalRecords > 0 ? ((count / data.totalRecords) * 100).toFixed(1) : "0.0"}
					{@const analysis = getRepeatAnalysis(Number(repeatCount))}
					
					<div class="text-center space-y-1 sm:space-y-2 p-2 sm:p-4 bg-base-200 rounded-lg">
						<div class="text-xs text-base-content/70">중복</div>
						<div class="text-lg sm:text-2xl font-bold text-primary">{repeatCount}개</div>
						<div class="text-sm sm:text-lg font-semibold">{count}회</div>
						<div class="text-xs sm:text-sm text-base-content/60">{percentage}%</div>
						<div class="text-xs badge badge-outline {analysis.color.replace('text-', 'badge-')} text-xs whitespace-nowrap">
							{analysis.type}
						</div>
					</div>
				{/each}
			</div>

			<!-- 중복 패턴 분석 -->
			<div class="mt-4 sm:mt-6 p-3 sm:p-4 bg-base-200 rounded-lg">
				<h3 class="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">중복 패턴 분석</h3>
				<div class="grid grid-cols-1 gap-3 sm:gap-4 text-xs sm:text-sm">
					{#each Object.entries(data.repeatCountDistribution || {}) as [repeatCount, count]}
						{@const percentage = data.totalRecords > 0 ? ((count / data.totalRecords) * 100).toFixed(1) : "0.0"}
						{@const analysis = getRepeatAnalysis(Number(repeatCount))}
						
						<div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
							<span class="font-medium">{getRepeatLabel(Number(repeatCount))}:</span>
							<div class="text-left sm:text-right">
								<span class="font-bold {analysis.color}">{percentage}%</span>
								<div class="text-xs text-base-content/60">{analysis.description}</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<!-- 최근 회차별 상세 데이터 -->
	{#if data.recentStats && data.recentStats.length > 0}
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-6">
			<h2 class="card-title text-base sm:text-lg">최근 10회차 중복 데이터</h2>
			
			<div class="overflow-x-auto -mx-3 sm:mx-0">
				<table class="table table-zebra w-full">
					<thead>
						<tr>
							<th class="sticky left-0 bg-base-200 z-10 min-w-[60px] text-xs sm:text-sm">회차</th>
							<th class="min-w-[80px] text-xs sm:text-sm">중복 개수</th>
							<th class="min-w-[80px] text-xs sm:text-sm">연속성</th>
							<th class="min-w-[100px] text-xs sm:text-sm">패턴 유형</th>
						</tr>
					</thead>
					<tbody>
						{#each data.recentStats as stat}
							{@const statRecord = stat as { round: number; repeat_count: number }}
							{@const analysis = getRepeatAnalysis(statRecord.repeat_count)}
							<tr>
								<td class="sticky left-0 bg-base-100 z-10 font-semibold text-xs sm:text-sm">{statRecord.round}회</td>
								<td class="text-center text-xs sm:text-sm font-bold text-primary">{statRecord.repeat_count}개</td>
								<td class="text-center">
									<div class="badge badge-outline text-xs whitespace-nowrap">
										{getRepeatLabel(statRecord.repeat_count)}
									</div>
								</td>
								<td class="text-center">
									<div class="badge {analysis.color.replace('text-', 'badge-')} text-xs whitespace-nowrap">
										{analysis.type}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
	{/if}

	<!-- 전체 중복 데이터 -->
	{#if data.repeatStats && data.repeatStats.length > 0}
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-6">
			<h2 class="card-title text-base sm:text-lg">전체 회차별 중복 데이터</h2>
			
			<div class="overflow-x-auto -mx-3 sm:mx-0">
				<table class="table table-zebra w-full">
					<thead>
						<tr>
							<th class="sticky left-0 bg-base-200 z-10 min-w-[60px] text-xs sm:text-sm">회차</th>
							<th class="min-w-[80px] text-xs sm:text-sm">중복 개수</th>
							<th class="min-w-[100px] text-xs sm:text-sm">연속성 레벨</th>
							<th class="min-w-[120px] text-xs sm:text-sm">설명</th>
						</tr>
					</thead>
					<tbody>
						{#each data.repeatStats as stat}
							{@const statRecord = stat as { round: number; repeat_count: number }}
							{@const analysis = getRepeatAnalysis(statRecord.repeat_count)}
							<tr>
								<td class="sticky left-0 bg-base-100 z-10 font-semibold text-xs sm:text-sm">{statRecord.round}회</td>
								<td class="text-center text-xs sm:text-sm font-bold text-primary">{statRecord.repeat_count}개</td>
								<td class="text-center">
									<div class="badge {analysis.color.replace('text-', 'badge-')} text-xs whitespace-nowrap">
										{analysis.type}
									</div>
								</td>
								<td class="text-xs sm:text-sm text-base-content/70">
									{analysis.description}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
	{/if}


	<!-- 연속 번호 분석 가이드 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-6">
			<h2 class="card-title text-base sm:text-lg">연속 번호 분석 가이드</h2>
			<div class="space-y-2 sm:space-y-3 text-xs sm:text-sm">
				<p>
					연속 회차 간 중복 번호는 로또의 연속성을 파악하는 중요한 지표입니다.
				</p>
				<div class="grid grid-cols-1 gap-3 sm:gap-4">
					<div class="space-y-3">
						<div>
							<h4 class="font-semibold text-primary mb-1 sm:mb-2 text-sm sm:text-base">일반적인 패턴</h4>
							<ul class="list-disc list-inside space-y-1 text-base-content/70">
								<li><strong>중복 없음:</strong> 완전히 새로운 번호 조합</li>
								<li><strong>1-2개 중복:</strong> 가장 일반적인 패턴</li>
								<li><strong>평균 중복:</strong> 약 1-2개 수준</li>
							</ul>
						</div>
						<div>
							<h4 class="font-semibold text-secondary mb-1 sm:mb-2 text-sm sm:text-base">특별한 패턴</h4>
							<ul class="list-disc list-inside space-y-1 text-base-content/70">
								<li><strong>3개 이상 중복:</strong> 높은 연속성 (드문 경우)</li>
								<li><strong>0개 중복:</strong> 완전 새로운 패턴</li>
								<li><strong>4개 이상:</strong> 매우 드문 극단적 연속성</li>
							</ul>
						</div>
					</div>
				</div>
				<div class="mt-3 sm:mt-4 p-2 sm:p-3 bg-info/10 rounded-lg">
					<p class="text-info font-medium text-xs sm:text-sm">
						💡 팁: 대부분의 회차에서 이전 회차와 1-2개 번호가 중복되며, 
						완전히 새로운 조합이나 높은 중복은 상대적으로 드뭅니다.
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
