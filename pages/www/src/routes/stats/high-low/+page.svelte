<script lang="ts">
import { goto } from "$app/navigation";
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";
import { JsonLd, MetaTags } from "svelte-meta-tags";
import type { PageData } from "./$types";

export let data: PageData;

// 페이지네이션 상태 제거 - 전체 데이터 표시

// 사용자 입력 상태 (기본값은 빈 값)
let inputValue = "";

// 고저 균형 분석
const getHighLowBalance = (
	highCount: number,
): { type: string; description: string; color: string } => {
	if (highCount === 3) {
		return {
			type: "완벽한 균형",
			description: "고숫자와 저숫자가 3:3으로 균등",
			color: "text-success",
		};
	}
	if (highCount === 2 || highCount === 4) {
		return {
			type: "양호한 균형",
			description: "고숫자와 저숫자가 2:4 또는 4:2",
			color: "text-info",
		};
	}
	if (highCount === 1 || highCount === 5) {
		return {
			type: "불균형",
			description: "고숫자와 저숫자가 1:5 또는 5:1",
			color: "text-warning",
		};
	}
	return {
		type: "극도 불균형",
		description: "모두 고숫자 또는 모두 저숫자",
		color: "text-error",
	};
};

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

// Breadcrumbs 데이터
const breadcrumbItems = [
	{ label: "홈", href: "/" },
	{ label: "통계", href: "/stats" },
	{ label: "고저분석", href: "/stats/high-low", current: true },
];
</script>

<MetaTags
	title="로또 6/45 고저 분석 통계 | 고숫자/저숫자 분포 패턴 분석"
	titleTemplate="%s | 645.live"
	description="로또 6/45 전체 {data.totalRounds}회차 고저 분포와 패턴을 분석합니다. 고숫자(23-45)와 저숫자(1-22) 균형도 분석을 통해 번호 선택에 도움을 제공합니다."
	canonical="https://645.live/stats/high-low"
	keywords={["로또고저분석", "고숫자저숫자", "로또통계분석", "고저균형분석", "로또예측", "고저패턴분석", "로또데이터분석", "6/45통계"]}
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
		url: 'https://645.live/stats/high-low',
		title: `로또 6/45 고저 분석 통계 | 전체 ${data.totalRounds}회차 데이터`,
		description: `로또 6/45 당첨번호의 고저 분포와 패턴을 분석합니다. 평균 고숫자 ${data.averageHighCount}개, 평균 저숫자 ${data.averageLowCount}개 등 상세한 통계 정보를 확인하세요.`,
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
			tags: ['로또', '고저분석', '고숫자', '저숫자', '당첨번호', '통계분석', '6/45'],
			publishedTime: '2024-01-01T00:00:00.000Z',
			modifiedTime: new Date().toISOString()
		}
	}}
	twitter={{
		cardType: 'summary_large_image',
		site: '@645live',
		title: '로또 6/45 고저 분석 통계',
		description: `전체 ${data.totalRounds}회차 고저 패턴 분석 - 평균 고숫자 ${data.averageHighCount}개, 평균 저숫자 ${data.averageLowCount}개`,
		image: 'https://645.live/images/lotto-high-low-stats.png',
		imageAlt: '로또 6/45 고저 분석 통계'
	}}
/>

<JsonLd
	schema={{
		'@type': 'Dataset',
		name: '로또 6/45 고저 분석 통계 데이터',
		description: `로또 6/45 당첨번호의 고저 분포와 패턴 분석 데이터. 전체 ${data.totalRounds}회차의 고저 분포와 균형도를 분석합니다.`,
		url: 'https://645.live/stats/high-low',
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
			contentUrl: 'https://645.live/stats/high-low',
			encodingFormat: 'text/html'
		},
		variableMeasured: [
			{
				'@type': 'PropertyValue',
				name: '평균 고숫자',
				value: data.averageHighCount
			},
			{
				'@type': 'PropertyValue',
				name: '평균 저숫자',
				value: data.averageLowCount
			},
			{
				'@type': 'PropertyValue',
				name: '최빈 패턴',
				value: `저${data.mostFrequentPattern[0]}:고${6 - Number(data.mostFrequentPattern[0])}`
			}
		],
		mainEntity: {
			'@type': 'StatisticalPopulation',
			name: '로또 6/45 당첨번호',
			populationSize: data.totalRounds
		}
	}}
/>

<div class="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
	<!-- Breadcrumbs -->
	<Breadcrumbs items={breadcrumbItems} />

	<!-- 페이지 헤더 -->
	<div class="text-center space-y-2 sm:space-y-3">
		<h1 class="text-xl sm:text-2xl md:text-3xl font-bold text-primary px-2">로또 6/45 고저 분석 통계</h1>
		<p class="text-sm sm:text-base text-base-content/70 px-2">
			<strong>고저 분석</strong>은 로또 번호를 고숫자(23-45)와 저숫자(1-22)로 구분하여 분석하는 핵심 지표입니다.
			전체 <strong>{data.totalRounds}회차</strong> 데이터를 기반으로 당첨번호 패턴을 분석하여 
			다음 당첨번호 예측에 도움이 되는 통계 정보를 제공합니다.
		</p>
		<div class="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4 text-xs sm:text-sm text-base-content/60 mt-3 sm:mt-4 px-2">
			<span>📊 평균 고숫자: <strong class="text-primary">{data.averageHighCount}개</strong></span>
			<span>🎯 평균 저숫자: <strong class="text-secondary">{data.averageLowCount}개</strong></span>
			<span>📈 분석 회차: <strong class="text-accent">{data.totalRounds}회</strong></span>
		</div>
	</div>

	<!-- 최근 회차 분석 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-4">
			<h2 class="card-title text-base sm:text-lg">최근 회차 분석</h2>
			<div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
				<div class="flex items-center gap-2 flex-1">
					<label for="rounds-input" class="text-sm font-medium whitespace-nowrap">최근:</label>
					<input
						id="rounds-input"
						type="text"
						inputmode="numeric"
						pattern="[0-9]*"
						bind:value={inputValue}
						on:keydown={handleKeydown}
						class="input input-bordered input-sm w-20 sm:w-24 text-center flex-shrink-0"
						placeholder="100"
					/>
					<span class="text-xs sm:text-sm opacity-60">회차 (최대 {data.totalRounds})</span>
				</div>
				<button
					type="button"
					on:click={navigateToAnalysis}
					class="btn btn-primary btn-sm w-full sm:w-auto"
				>
					상세 분석
				</button>
			</div>
			<p class="text-xs sm:text-sm text-base-content/60 mt-2">
				현재 전체 <span class="font-semibold text-primary">{data.totalRounds}회차</span> 데이터를 표시 중입니다. 특정 회차 수를 입력하면 해당 최근 회차만 분석할 수 있습니다.
			</p>
		</div>
	</div>

	<!-- 고저 구분 설명 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-4 md:p-6">
			<h2 class="card-title text-base sm:text-lg">고저 구분 기준</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-3 sm:mt-4">
				<div class="text-center p-4 sm:p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
					<div class="text-2xl sm:text-3xl font-bold text-blue-600 mb-2">저숫자</div>
					<div class="text-base sm:text-lg font-semibold text-blue-700 dark:text-blue-300">1 ~ 22</div>
					<div class="text-sm text-blue-600 dark:text-blue-400 mt-2">22개 번호</div>
					<div class="mt-2 sm:mt-3 text-xs text-blue-500 dark:text-blue-400">
						1, 2, 3, ..., 20, 21, 22
					</div>
				</div>
				<div class="text-center p-4 sm:p-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
					<div class="text-2xl sm:text-3xl font-bold text-red-600 mb-2">고숫자</div>
					<div class="text-base sm:text-lg font-semibold text-red-700 dark:text-red-300">23 ~ 45</div>
					<div class="text-sm text-red-600 dark:text-red-400 mt-2">23개 번호</div>
					<div class="mt-2 sm:mt-3 text-xs text-red-500 dark:text-red-400">
						23, 24, 25, ..., 43, 44, 45
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- 요약 통계 -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
		<div class="stat bg-primary text-primary-content rounded-lg p-3 sm:p-4">
			<div class="stat-title text-primary-content/70 text-xs sm:text-sm">평균 고숫자</div>
			<div class="stat-value text-xl sm:text-2xl">{data.averageHighCount || "0.0"}</div>
			<div class="stat-desc text-primary-content/70 text-xs">전체 {data.totalRounds || 0}회차</div>
		</div>
		
		<div class="stat bg-secondary text-secondary-content rounded-lg p-3 sm:p-4">
			<div class="stat-title text-secondary-content/70 text-xs sm:text-sm">평균 저숫자</div>
			<div class="stat-value text-xl sm:text-2xl">{data.averageLowCount || "0.0"}</div>
			<div class="stat-desc text-secondary-content/70 text-xs">전체 {data.totalRounds || 0}회차</div>
		</div>
		
		<div class="stat bg-accent text-accent-content rounded-lg p-3 sm:p-4">
			<div class="stat-title text-accent-content/70 text-xs sm:text-sm">균형 비율</div>
			<div class="stat-value text-xl sm:text-2xl">{data.patternStats ? ((data.patternStats.balanced / data.totalRounds) * 100).toFixed(1) : "0.0"}%</div>
			<div class="stat-desc text-accent-content/70 text-xs">3:3 균형</div>
		</div>
		
		<div class="stat bg-info text-info-content rounded-lg p-3 sm:p-4">
			<div class="stat-title text-info-content/70 text-xs sm:text-sm">극단 비율</div>
			<div class="stat-value text-xl sm:text-2xl">{data.patternStats ? ((data.patternStats.extreme / data.totalRounds) * 100).toFixed(1) : "0.0"}%</div>
			<div class="stat-desc text-info-content/70 text-xs">0:6 또는 6:0</div>
		</div>
	</div>

	<!-- 고숫자 개수별 분포 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-4 md:p-6">
			<h2 class="card-title text-base sm:text-lg">고숫자 개수별 분포</h2>
			<p class="text-xs sm:text-sm text-base-content/60 mb-3 sm:mb-4">
				6개 번호 중 고숫자(23-45)의 개수에 따른 분포를 나타냅니다.
			</p>
			
			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 md:gap-4">
				{#each Object.entries(data.highLowDistribution || {}) as [highCount, count]}
					{@const percentage = data.totalRounds > 0 ? (((count as number) / data.totalRounds) * 100).toFixed(1) : "0.0"}
					{@const balance = getHighLowBalance(Number(highCount))}
					
					<div class="text-center space-y-1 sm:space-y-2 p-2 sm:p-3 md:p-4 bg-base-200 rounded-lg">
						<div class="text-xs text-base-content/70">고숫자</div>
						<div class="text-lg sm:text-xl md:text-2xl font-bold text-red-600">{highCount}개</div>
						<div class="text-xs text-base-content/70">저숫자</div>
						<div class="text-sm sm:text-base md:text-lg font-bold text-blue-600">{6 - Number(highCount)}개</div>
						<div class="text-xs sm:text-sm font-semibold">{count}회</div>
						<div class="text-xs text-base-content/60">{percentage}%</div>
						<div class="text-xs badge badge-outline {balance.color.replace('text-', 'badge-')} px-1">
							{balance.type}
						</div>
					</div>
				{/each}
			</div>

			<!-- 고저 균형 분석 -->
			<div class="mt-4 sm:mt-6 p-3 sm:p-4 bg-base-200 rounded-lg">
				<h3 class="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">고저 균형도 분석</h3>
				<div class="grid grid-cols-1 gap-2 sm:gap-3 md:gap-4 text-xs sm:text-sm">
					{#each Object.entries(data.highLowDistribution || {}) as [highCount, count]}
						{@const percentage = data.totalRounds > 0 ? (((count as number) / data.totalRounds) * 100).toFixed(1) : "0.0"}
						{@const balance = getHighLowBalance(Number(highCount))}
						{@const lowCount = 6 - Number(highCount)}
						
						<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-0 p-2 sm:p-0">
							<span class="font-medium">고{highCount}:저{lowCount}:</span>
							<div class="text-left sm:text-right">
								<span class="font-bold {balance.color}">{percentage}%</span>
								<div class="text-xs text-base-content/60">{balance.description}</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<!-- 최근 10회차 고저 분포 추이 -->
	{#if data.recentStats && data.recentStats.length > 0}
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-4 md:p-6">
			<h2 class="card-title text-base sm:text-lg">최근 10회차 고저 분포 추이</h2>
			
			<div class="overflow-x-auto -mx-3 sm:mx-0">
				<table class="table table-zebra w-full">
					<thead>
						<tr>
							<th class="sticky left-0 bg-base-200 z-10 text-xs sm:text-sm min-w-[60px]">회차</th>
							<th class="text-red-600 text-xs sm:text-sm min-w-[70px] text-center">고숫자</th>
							<th class="text-blue-600 text-xs sm:text-sm min-w-[70px] text-center">저숫자</th>
							<th class="text-xs sm:text-sm min-w-[60px] text-center">비율</th>
							<th class="text-xs sm:text-sm min-w-[100px] text-center">균형도</th>
						</tr>
					</thead>
					<tbody>
						{#each data.recentStats as stat}
							{@const balance = getHighLowBalance(stat.highCount)}
							<tr>
								<td class="sticky left-0 bg-base-100 z-10 font-semibold text-xs sm:text-sm">{stat.round}회</td>
								<td class="text-center">
									<span class="badge badge-error text-white text-xs">
										{stat.highCount}개
									</span>
								</td>
								<td class="text-center">
									<span class="badge badge-info text-white text-xs">
										{stat.lowCount}개
									</span>
								</td>
								<td class="font-medium text-center text-xs sm:text-sm">
									{stat.highCount}:{stat.lowCount}
								</td>
								<td class="text-center">
									<div class="badge whitespace-nowrap {balance.color.replace('text-', 'badge-')} text-xs">
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
	{/if}

	<!-- 고저 분석 가이드 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-4 md:p-6">
			<h2 class="card-title text-base sm:text-lg">고저 분석 가이드</h2>
			<div class="space-y-2 sm:space-y-3 text-xs sm:text-sm">
				<p>
					고숫자와 저숫자의 분포는 번호 선택 시 중요한 균형 지표입니다.
				</p>
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
					<div>
						<h4 class="font-semibold text-primary mb-2 text-sm sm:text-base">균형잡힌 조합</h4>
						<ul class="list-disc list-inside space-y-1 text-base-content/70">
							<li><strong>3:3 균형:</strong> 가장 이상적인 분포</li>
							<li><strong>2:4 또는 4:2:</strong> 일반적으로 나타나는 분포</li>
							<li><strong>고저 골고루:</strong> 번호가 전 범위에 분산</li>
						</ul>
					</div>
					<div>
						<h4 class="font-semibold text-secondary mb-2 text-sm sm:text-base">편중된 조합</h4>
						<ul class="list-disc list-inside space-y-1 text-base-content/70">
							<li><strong>1:5 또는 5:1:</strong> 한쪽으로 편중</li>
							<li><strong>0:6 또는 6:0:</strong> 극단적 편중 (매우 드뭄)</li>
							<li><strong>특정 구간 집중:</strong> 불균형한 분포</li>
						</ul>
					</div>
				</div>
				<div class="mt-3 sm:mt-4 p-3 bg-info/10 rounded-lg">
					<p class="text-info font-medium text-xs sm:text-sm">
						💡 팁: 대부분의 당첨번호는 고숫자 2-4개 범위에서 나타나며, 
						완전히 한쪽으로만 편중되는 경우는 매우 드뭅니다.
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
