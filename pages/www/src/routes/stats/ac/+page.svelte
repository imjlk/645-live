<script lang="ts">
import { goto } from "$app/navigation";
import { page } from "$app/state";
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";
import LinkButton from "$lib/ui/LinkButton.svelte";
import { JsonLd, MetaTags } from "svelte-meta-tags";
import type { PageData } from "./$types";

export let data: PageData;

// 페이지네이션 상태 제거 - 전체 데이터 표시

// 사용자 입력 상태 (기본값은 빈 값)
let inputValue = "";

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
			await goto(`/stats/ac/recent/${rounds}`);
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

// AC값 복잡도 해석
const getComplexityLabel = (acValue: number): string => {
	if (acValue <= 3) return "매우 낮음";
	if (acValue <= 6) return "낮음";
	if (acValue <= 9) return "보통";
	if (acValue <= 12) return "높음";
	return "매우 높음";
};

const getComplexityDescription = (acValue: number): string => {
	if (acValue <= 3) return "단순한 패턴, 연속성 높음";
	if (acValue <= 6) return "비교적 단순한 패턴";
	if (acValue <= 9) return "일반적인 복잡도";
	if (acValue <= 12) return "복잡한 패턴";
	return "매우 복잡한 패턴, 분산도 높음";
};

// Breadcrumbs 데이터
const breadcrumbItems = [
	{ label: "홈", href: "/" },
	{ label: "통계", href: "/stats" },
	{ label: "AC값", href: "/stats/ac", current: true },
];
</script>

<MetaTags
	title="로또 6/45 AC값 통계 분석 | 산술적 복잡도 패턴 분석"
	titleTemplate="%s | 645.live"
	description="로또 6/45 전체 {data.totalRounds}회차 AC값(Arithmetic Complexity) 통계 분석. 번호 조합의 복잡도 패턴을 분석하여 다음 당첨번호 예측에 도움이 되는 데이터를 제공합니다."
	canonical="https://www.645.live/stats/ac"
	keywords={["로또 AC값", "산술적복잡도", "로또통계분석", "당첨번호패턴", "로또예측", "번호조합복잡도", "로또데이터분석", "6/45통계"]}
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
			content: 'https://www.645.live'
		}
	]}
	openGraph={{
		type: 'article',
		url: 'https://www.645.live/stats/ac',
		title: `로또 6/45 AC값 통계 분석 | 전체 ${data.totalRounds}회차 데이터`,
		description: `로또 6/45 당첨번호의 산술적 복잡도(AC값) 패턴을 분석합니다. 평균 AC값 ${data.averageAcValue}, 최빈값 ${data.mostFrequentAc[0]} 등 상세한 통계 정보를 확인하세요.`,
		locale: 'ko_KR',
		images: [{
			url: 'https://www.645.live/images/lotto-ac-stats.png',
			width: 1200,
			height: 630,
			alt: '로또 6/45 AC값 통계 분석',
			secureUrl: 'https://www.645.live/images/lotto-ac-stats.png',
			type: 'image/png'
		}],
		siteName: '645.live',
		article: {
			section: '로또 통계',
			tags: ['로또', 'AC값', '산술적복잡도', '당첨번호', '통계분석', '6/45'],
			publishedTime: '2024-01-01T00:00:00.000Z',
			modifiedTime: new Date().toISOString()
		}
	}}
	twitter={{
		cardType: 'summary_large_image',
		site: '@645live',
		title: '로또 6/45 AC값 통계 분석',
		description: `전체 ${data.totalRounds}회차 AC값 패턴 분석 - 평균 ${data.averageAcValue}, 복잡도 분포 및 패턴 분석`,
		image: 'https://www.645.live/images/lotto-ac-stats.png',
		imageAlt: '로또 6/45 AC값 통계 분석'
	}}
/>

<JsonLd
	schema={{
		'@type': 'Dataset',
		name: '로또 6/45 AC값 통계 데이터',
		description: `로또 6/45 당첨번호의 산술적 복잡도(AC값) 통계 분석 데이터. 전체 ${data.totalRounds}회차의 AC값 분포와 패턴을 분석합니다.`,
		url: 'https://www.645.live/stats/ac',
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
			contentUrl: 'https://www.645.live/stats/ac',
			encodingFormat: 'text/html'
		},
		variableMeasured: [
			{
				'@type': 'PropertyValue',
				name: 'AC값 평균',
				value: data.averageAcValue
			},
			{
				'@type': 'PropertyValue',
				name: 'AC값 최대값',
				value: data.maxAcValue
			},
			{
				'@type': 'PropertyValue',
				name: 'AC값 최소값',
				value: data.minAcValue
			},
			{
				'@type': 'PropertyValue',
				name: 'AC값 최빈값',
				value: data.mostFrequentAc[0]
			}
		],
		mainEntity: {
			'@type': 'StatisticalPopulation',
			name: '로또 6/45 당첨번호',
			populationSize: data.totalRounds
		}
	}}
/>

<div class="p-6 space-y-6">
	<!-- Breadcrumbs -->
	<Breadcrumbs items={breadcrumbItems} />

	<!-- 페이지 헤더 -->
	<div class="text-center space-y-2">
		<h1 class="text-3xl font-bold text-primary">로또 6/45 AC값 통계 분석</h1>
		<p class="text-base-content/70">
			<strong>AC값(Arithmetic Complexity)</strong>은 로또 번호 조합의 산술적 복잡도를 나타내는 핵심 지표입니다.<br />
			전체 <strong>{data.totalRounds}회차</strong> 데이터를 기반으로 당첨번호 패턴을 분석하여 
			다음 당첨번호 예측에 도움이 되는 통계 정보를 제공합니다.
		</p>
		<div class="flex justify-center gap-4 text-sm text-base-content/60 mt-4">
			<span>📊 평균 AC값: <strong class="text-primary">{data.averageAcValue}</strong></span>
			<span>🎯 최빈 AC값: <strong class="text-secondary">{data.mostFrequentAc[0]}</strong></span>
			<span>📈 분석 회차: <strong class="text-accent">{data.totalRounds}회</strong></span>
		</div>
	</div>

	<!-- 최근 회차 분석 -->
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
					상세 분석
				</button>
			</div>
			<p class="text-sm text-base-content/60">
				현재 전체 <span class="font-semibold text-primary">{data.totalRounds}회차</span> 데이터를 표시 중입니다. 특정 회차 수를 입력하면 해당 최근 회차만 분석할 수 있습니다.
			</p>
		</div>
	</div>

	<!-- 요약 통계 -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="stat bg-primary text-primary-content rounded-lg">
			<div class="stat-title text-primary-content/70">평균 AC값</div>
			<div class="stat-value text-2xl">{data.averageAcValue}</div>
			<div class="stat-desc text-primary-content/70">전체 {data.totalRounds}회차</div>
		</div>
		
		<div class="stat bg-secondary text-secondary-content rounded-lg">
			<div class="stat-title text-secondary-content/70">최대 AC값</div>
			<div class="stat-value text-2xl">{data.maxAcValue}</div>
			<div class="stat-desc text-secondary-content/70">{getComplexityLabel(data.maxAcValue)}</div>
		</div>
		
		<div class="stat bg-accent text-accent-content rounded-lg">
			<div class="stat-title text-accent-content/70">최소 AC값</div>
			<div class="stat-value text-2xl">{data.minAcValue}</div>
			<div class="stat-desc text-accent-content/70">{getComplexityLabel(data.minAcValue)}</div>
		</div>
		
		<div class="stat bg-info text-info-content rounded-lg">
			<div class="stat-title text-info-content/70">최빈 AC값</div>
			<div class="stat-value text-2xl">{data.mostFrequentAc[0]}</div>
			<div class="stat-desc text-info-content/70">{data.mostFrequentAc[1]}회 출현</div>
		</div>
	</div>

	<!-- 복잡도 범위별 분포 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">AC값 복잡도 분포</h2>
			
			<div class="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
				{#each Object.entries(data.acRangeDistribution) as [range, count]}
					{@const totalAnalyzed = Object.values(data.acRangeDistribution).reduce((sum, val) => sum + val, 0)}
					{@const percentage = totalAnalyzed > 0 ? ((count / totalAnalyzed) * 100).toFixed(1) : "0.0"}
					{@const [min] = range.split('-').map(Number)}
					{@const label = getComplexityLabel(min)}
					
					<div class="text-center space-y-2">
						<div class="text-sm font-medium text-base-content/70">AC {range}</div>
						<div class="text-lg font-bold text-primary">{count}회</div>
						<div class="text-sm text-base-content/60">{percentage}%</div>
						<div class="text-xs badge badge-outline">{label}</div>
					</div>
				{/each}
			</div>

			<!-- 복잡도 분석 -->
			<div class="mt-6 p-4 bg-base-200 rounded-lg">
				<h3 class="font-semibold mb-2">복잡도 분석</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
					<div>
						<span class="font-medium text-primary">낮은 복잡도 (0-6):</span>
						<span class="ml-2">{data.lowComplexityRate}%</span>
						<p class="text-xs text-base-content/60 mt-1">단순한 패턴, 연속성이 높은 번호 조합</p>
					</div>
					<div>
						<span class="font-medium text-secondary">높은 복잡도 (10-15):</span>
						<span class="ml-2">{data.highComplexityRate}%</span>
						<p class="text-xs text-base-content/60 mt-1">복잡한 패턴, 분산도가 높은 번호 조합</p>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- 최근 10회차 AC값 -->
	{#if data.recentStats.length > 0}
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">최근 10회차 AC값 추이</h2>
			
			<div class="overflow-x-auto">
				<table class="table table-zebra w-full">
					<thead>
						<tr>
							<th>회차</th>
							<th>AC값</th>
							<th>복잡도</th>
							<th>설명</th>
						</tr>
					</thead>
					<tbody>
						{#each data.recentStats as stat}
							<tr>
								<td class="font-semibold">{stat.round}회</td>
								<td class="text-lg font-bold text-primary">{stat.ac_value}</td>
								<td>
									<div class="badge badge-outline">
										{getComplexityLabel(stat.ac_value)}
									</div>
								</td>
								<td class="text-sm text-base-content/70">
									{getComplexityDescription(stat.ac_value)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
	{/if}

	<!-- 전체 AC값 분포 테이블 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">AC값별 상세 분포</h2>
			
			<div class="overflow-x-auto">
				<table class="table table-zebra w-full">
					<thead>
						<tr>
							<th>AC값</th>
							<th>출현 횟수</th>
							<th>출현 비율</th>
							<th>복잡도</th>
						</tr>
					</thead>
					<tbody>
						{#each Object.entries(data.acDistribution)
							.filter(([_, count]) => count > 0)
							.sort((a, b) => Number(a[0]) - Number(b[0])) as [acValue, count]}
							{@const totalDistributed = Object.values(data.acDistribution).reduce((sum, val) => sum + val, 0)}
							{@const percentage = totalDistributed > 0 ? ((count / totalDistributed) * 100).toFixed(1) : "0.0"}
							<tr>
								<td class="font-semibold text-lg">{acValue}</td>
								<td>{count}회</td>
								<td>{percentage}%</td>
								<td>
									<div class="badge badge-outline">
										{getComplexityLabel(Number(acValue))}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>


	<!-- AC값 가이드 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">AC값(산술적 복잡도) 완벽 가이드</h2>
			<div class="space-y-4 text-sm">
				<p class="text-base leading-relaxed">
					<strong>AC값(Arithmetic Complexity)</strong>은 로또 번호 조합의 복잡도를 수치화한 지표로, 
					번호들 간의 분산 정도와 패턴의 복잡성을 측정합니다. 이 지표를 통해 당첨번호의 특성을 분석하고 
					향후 번호 선택 전략을 수립할 수 있습니다.
				</p>
				
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div class="bg-primary/5 p-4 rounded-lg">
						<h3 class="font-semibold text-primary mb-3 text-lg">🔸 낮은 AC값 (0-6)</h3>
						<h4 class="font-medium mb-2">특징:</h4>
						<ul class="list-disc list-inside space-y-1 text-base-content/70 mb-3">
							<li><strong>연속 번호 多</strong> (예: 1,2,3,4,5,6)</li>
							<li><strong>규칙적 패턴</strong> - 예측 가능한 배열</li>
							<li><strong>번호 간격 小</strong> - 집중된 분포</li>
						</ul>
						<div class="text-xs bg-primary/10 p-2 rounded">
							전체 {data.totalRounds}회차 중 {data.lowComplexityRate}% 출현
						</div>
					</div>
					
					<div class="bg-secondary/5 p-4 rounded-lg">
						<h3 class="font-semibold text-secondary mb-3 text-lg">🔹 높은 AC값 (10-15)</h3>
						<h4 class="font-medium mb-2">특징:</h4>
						<ul class="list-disc list-inside space-y-1 text-base-content/70 mb-3">
							<li><strong>번호 고른 분산</strong> - 1~45 전체 범위</li>
							<li><strong>불규칙 패턴</strong> - 예측 어려운 배열</li>
							<li><strong>번호 간격 大</strong> - 넓은 분포</li>
						</ul>
						<div class="text-xs bg-secondary/10 p-2 rounded">
							전체 {data.totalRounds}회차 중 {data.highComplexityRate}% 출현
						</div>
					</div>
				</div>

				<div class="bg-info/5 p-4 rounded-lg mt-4">
					<h3 class="font-semibold text-info mb-2">💡 AC값 활용 전략</h3>
					<ul class="list-disc list-inside space-y-1 text-base-content/70">
						<li><strong>패턴 분석:</strong> 최근 당첨번호의 AC값 추이를 확인하여 다음 회차 예측</li>
						<li><strong>균형 조합:</strong> 너무 높거나 낮은 AC값보다는 중간값(7-9) 범위 고려</li>
						<li><strong>통계적 접근:</strong> 평균 AC값 {data.averageAcValue} 주변의 조합에 주목</li>
						<li><strong>최빈값 활용:</strong> 가장 자주 나오는 AC값 {data.mostFrequentAc[0]} 참고</li>
					</ul>
				</div>
			</div>
		</div>
	</div>
</div>
