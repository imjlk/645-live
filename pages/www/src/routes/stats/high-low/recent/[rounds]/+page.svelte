<script lang="ts">
import { goto } from "$app/navigation";
import { page } from "$app/state";
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";
import LinkButton from "$lib/ui/LinkButton.svelte";
import { JsonLd, MetaTags } from "svelte-meta-tags";
import type { PageData } from "./$types";

export let data: PageData;

// 사용자 입력 상태
let inputValue = String(data.selectedRounds);

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

// 입력값 유효성 검사
const validateInput = (value: string): boolean => {
	const str = String(value || "");
	if (str.trim() === "") return false;
	const num = Number(str);
	return !Number.isNaN(num) && num > 0 && num <= data.totalRounds;
};

// 분석 페이지로 이동
const navigateToAnalysis = async () => {
	const inputStr = String(inputValue || "");

	if (inputStr.trim() === "") {
		alert("분석할 회차 수를 입력해주세요.");
		return;
	}

	if (validateInput(inputStr)) {
		const rounds = Number(inputStr);
		try {
			await goto(`/stats/high-low/recent/${rounds}`);
		} catch (error) {
			console.error("Navigation error:", error);
			alert("페이지 이동 중 오류가 발생했습니다.");
		}
	} else {
		alert(`1부터 ${data.totalRounds}까지의 숫자를 입력해주세요.`);
	}
};

// Enter 키 처리
const handleKeydown = (event: KeyboardEvent) => {
	if (event.key === "Enter") {
		navigateToAnalysis();
	}
};

// 백분율 계산
const getPercentage = (count: number, total: number): string => {
	return total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
};

// 고저 패턴 정렬 (출현 빈도순)
$: sortedPatterns = Object.entries(data.highLowStats.summary.distribution).sort(
	([, a], [, b]) => Number(b) - Number(a),
);

// 고저 균형 계산
$: totalNumbers = data.highLowStats.summary.totalDraws * 6;
$: lowPercentage = getPercentage(
	data.highLowStats.summary.lowCount,
	totalNumbers,
);
$: highPercentage = getPercentage(
	data.highLowStats.summary.highCount,
	totalNumbers,
);
</script>

<MetaTags
	title="로또 6/45 고저 분석 통계 | 고저 번호 분포 분석"
	titleTemplate="%s | 645.live"
	description={`로또 6/45 고저 번호 분포를 분석합니다 (최근 ${data.selectedRounds}회차). 저구간(1-22), 고구간(23-45)의 분포 패턴과 균형성을 제공합니다.`}
	canonical={`https://645.live/stats/high-low/recent/${data.selectedRounds}`}
	keywords={["로또", "고저분석", "번호분포", "로또통계", "고저패턴", "번호균형", "로또예측", "6/45통계", "고저별통계", "번호고저분석"]}
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
		url: `https://645.live/stats/high-low/recent/${data.selectedRounds}`,
		title: `로또 6/45 고저 분석 통계 | 번호 분포 패턴 (최근 ${data.selectedRounds}회차)`,
		description: `로또 6/45 고저 번호 분포를 분석합니다 (최근 ${data.selectedRounds}회차). 저구간과 고구간의 균형성과 분포 패턴을 제공합니다.`,
		locale: 'ko_KR',
		images: [{
			url: 'https://645.live/images/lotto-high-low-stats.png',
			width: 1200,
			height: 630,
			alt: '로또 6/45 고저 분석 통계',
			secureUrl: 'https://645.live/images/lotto-high-low-stats.png',
			type: 'image/png'
		}],
		siteName: '645.live',
		article: {
			section: '로또 통계',
			tags: ['로또', '고저분석', '번호분포', '로또통계', '고저패턴', '번호균형', '6/45통계', '고저별통계'],
			publishedTime: '2024-01-01T00:00:00.000Z',
			modifiedTime: new Date().toISOString()
		}
	}}
	twitter={{
		cardType: 'summary_large_image',
		site: '@645live',
		title: `로또 6/45 고저 분석 통계 (최근 ${data.selectedRounds}회차)`,
		description: '고저 번호 분포 분석으로 로또 번호 균형성을 파악하세요.',
		image: 'https://645.live/images/lotto-high-low-stats.png',
		imageAlt: '로또 6/45 고저 분석 통계'
	}}
/>

<JsonLd
	schema={{
		'@type': 'Dataset',
		name: `로또 6/45 고저 분석 통계 (최근 ${data.selectedRounds}회차)`,
		description: `로또 6/45 고저 번호 분포를 분석한 통계 데이터입니다 (최근 ${data.selectedRounds}회차).`,
		url: `https://645.live/stats/high-low/recent/${data.selectedRounds}`,
		creator: {
			'@type': 'Organization',
			name: '645.live'
		},
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

<div class="p-6 space-y-6">
	<!-- Breadcrumbs -->
	<Breadcrumbs items={breadcrumbItems} />

	<!-- 페이지 헤더 -->
	<div class="text-center space-y-2">
		<h1 class="text-3xl font-bold text-primary">로또 6/45 고저 분석 상세 분석</h1>
		<p class="text-base-content/70">
			최근 <strong class="text-primary">{data.selectedRounds}회차</strong>의 <strong>고저 번호 분포</strong>와 패턴을 상세히 분석합니다.<br />
			저구간 평균 <strong class="text-secondary">{data.highLowStats.summary.lowAverage}개</strong>, 고구간 평균 <strong class="text-accent">{data.highLowStats.summary.highAverage}개</strong>의 고저 분포 분석을 통해 
			당첨번호 패턴을 파악해보세요.
		</p>
		<div class="flex justify-center gap-4 text-sm text-base-content/60 mt-4">
			<span>📊 저구간 비율: <strong class="text-primary">{lowPercentage}%</strong></span>
			<span>📈 분석 회차: <strong class="text-secondary">{data.selectedRounds}회</strong></span>
			<span>🎯 고구간 비율: <strong class="text-accent">{highPercentage}%</strong></span>
		</div>
	</div>

	<!-- 최근 회차 분석 변경 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-4">
			<h2 class="card-title text-lg">최근 회차 분석</h2>
			<div class="flex items-center gap-4 flex-wrap">
				<div class="flex items-center gap-2">
					<label for="rounds-input" class="text-sm font-medium">최근:</label>
					<input
						id="rounds-input"
						type="text"
						inputmode="numeric"
						pattern="[0-9]*"
						bind:value={inputValue}
						on:keydown={handleKeydown}
						class="input input-bordered input-sm w-24 text-center"
						placeholder="100"
					/>
					<span class="text-sm opacity-60">회차 (최대 {data.totalRounds})</span>
				</div>
				<button
					type="button"
					on:click={navigateToAnalysis}
					class="btn btn-primary btn-sm"
				>
					분석하기
				</button>
				<LinkButton
					href="/stats/high-low"
					class="btn btn-outline btn-sm"
				>
					전체 회차 보기
				</LinkButton>
			</div>
			<p class="text-sm text-base-content/60">
				현재 최근 <span class="font-semibold text-primary">{data.selectedRounds}회차</span> 데이터를 분석 중입니다. 다른 회차 수를 입력하여 비교 분석해보세요.
			</p>
		</div>
	</div>

	<!-- 요약 통계 -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<div class="stat bg-primary text-primary-content rounded-lg">
			<div class="stat-title text-primary-content/70">저구간 (1-22)</div>
			<div class="stat-value text-2xl">{data.highLowStats.summary.lowAverage}</div>
			<div class="stat-desc text-primary-content/70">평균 개수</div>
		</div>
		
		<div class="stat bg-secondary text-secondary-content rounded-lg">
			<div class="stat-title text-secondary-content/70">고구간 (23-45)</div>
			<div class="stat-value text-2xl">{data.highLowStats.summary.highAverage}</div>
			<div class="stat-desc text-secondary-content/70">평균 개수</div>
		</div>
	</div>

	<!-- 고저 균형 요약 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">고저 균형 요약</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<!-- 저 (1-22) -->
				<div class="p-4 bg-blue-500/10 dark:bg-blue-400/10 rounded-lg">
					<div class="flex items-center justify-between mb-2">
						<h3 class="text-lg font-semibold text-blue-600 dark:text-blue-400">저 (1-22)</h3>
						<div class="text-2xl font-bold text-blue-600">{data.highLowStats.summary.lowCount}</div>
					</div>
					<div class="text-sm text-blue-600 dark:text-blue-400 mb-3">{lowPercentage}%</div>
					<div class="w-full bg-blue-500/20 dark:bg-blue-400/20 rounded-full h-3">
						<div
							class="bg-blue-600 h-3 rounded-full transition-all duration-300"
							style="width: {lowPercentage}%"
						></div>
					</div>
				</div>

				<!-- 고 (23-45) -->
				<div class="p-4 bg-red-500/10 dark:bg-red-400/10 rounded-lg">
					<div class="flex items-center justify-between mb-2">
						<h3 class="text-lg font-semibold text-red-600 dark:text-red-400">고 (23-45)</h3>
						<div class="text-2xl font-bold text-red-600">{data.highLowStats.summary.highCount}</div>
					</div>
					<div class="text-sm text-red-600 dark:text-red-400 mb-3">{highPercentage}%</div>
					<div class="w-full bg-red-500/20 dark:bg-red-400/20 rounded-full h-3">
						<div
							class="bg-red-600 h-3 rounded-full transition-all duration-300"
							style="width: {highPercentage}%"
						></div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- 고저 패턴 분포 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">고저 패턴 분포</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each sortedPatterns as [pattern, count]}
					{@const [low, high] = pattern.split(':').map(Number)}
					<div class="p-4 rounded-lg border bg-base-200">
						<div class="flex items-center justify-between mb-2">
							<span class="font-semibold">저 {low}개 : 고 {high}개</span>
							<span class="text-sm font-medium">{count}회</span>
						</div>
						<div class="text-xs text-base-content/60 mb-2">
							{getPercentage(Number(count), data.highLowStats.summary.totalDraws)}%
						</div>
						<div class="flex space-x-1">
							<!-- 저 구간 표시 -->
							{#each Array(low) as _}
								<div class="w-4 h-4 bg-blue-500 rounded"></div>
							{/each}
							<!-- 고 구간 표시 -->
							{#each Array(high) as _}
								<div class="w-4 h-4 bg-red-500 rounded"></div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- 추첨 결과 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">추첨 결과 ({data.selectedRounds}회차)</h2>
			
			<div class="overflow-x-auto">
				<table class="table table-zebra w-full">
					<thead>
						<tr>
							<th>회차</th>
							<th class="text-blue-600">저구간</th>
							<th class="text-red-600">고구간</th>
							<th>고저 비율</th>
						</tr>
					</thead>
					<tbody>
						{#each data.highLowStats.records as record}
							{@const isBalanced = Math.abs(record.low_count - record.high_count) <= 1}
							
							<tr>
								<td class="font-semibold">{record.round}회</td>
								<td class="text-center">
									<span class="badge {record.low_count > 0 ? 'badge-info' : 'badge-ghost'}">
										{record.low_count}개
									</span>
								</td>
								<td class="text-center">
									<span class="badge {record.high_count > 0 ? 'badge-error' : 'badge-ghost'}">
										{record.high_count}개
									</span>
								</td>
								<td>
									{#if isBalanced}
										<span class="badge badge-success">균형</span>
									{:else if record.low_count > record.high_count}
										<span class="badge badge-info">저구간 편중</span>
									{:else}
										<span class="badge badge-error">고구간 편중</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>

	<!-- 고저 분석 요약 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">고저 분석 요약</h2>
			<div class="space-y-4 text-sm">
				<p class="text-base leading-relaxed">
					최근 <strong class="text-primary">{data.selectedRounds}회차</strong>의 고저 분포를 분석한 결과입니다. 
					저구간 평균 <strong class="text-secondary">{data.highLowStats.summary.lowAverage}개</strong>, 
					고구간 평균 <strong class="text-accent">{data.highLowStats.summary.highAverage}개</strong>의 분포를 보이고 있습니다.
				</p>
				
				<div class="bg-info/5 p-4 rounded-lg">
					<h3 class="font-semibold text-info mb-2">💡 이 분석으로 알 수 있는 것</h3>
					<ul class="list-disc list-inside space-y-1 text-base-content/70">
						<li><strong>고저 분포 균형:</strong> 저구간과 고구간의 균형성</li>
						<li><strong>출현 패턴:</strong> 저구간이나 고구간에 집중되는 경향</li>
						<li><strong>트렌드 분석:</strong> 최근 {data.selectedRounds}회차의 고저 분포 변화 추이</li>
						<li><strong>예측 참고:</strong> 고저 균형성을 통한 향후 번호 선택 가이드</li>
					</ul>
				</div>
				
				<div class="flex items-center space-x-4 mt-3">
					<div class="flex items-center p-2 bg-base-200 rounded">
						<div class="w-4 h-4 bg-blue-500 rounded mr-2"></div>
						<span class="text-sm font-medium">저 구간 (1-22)</span>
					</div>
					<div class="flex items-center p-2 bg-base-200 rounded">
						<div class="w-4 h-4 bg-red-500 rounded mr-2"></div>
						<span class="text-sm font-medium">고 구간 (23-45)</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
