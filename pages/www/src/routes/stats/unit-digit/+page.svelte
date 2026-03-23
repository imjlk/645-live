<script lang="ts">
import { goto } from "$app/navigation";
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";
import LinkButton from "$lib/ui/LinkButton.svelte";
import { JsonLd, MetaTags } from "svelte-meta-tags";
import type { PageData } from "./$types";

interface Props {
	data: PageData;
}

let { data }: Props = $props();

// 사용자 입력 상태 (Svelte 5 runes)
let inputValue = $state("");

// Breadcrumbs 데이터
const breadcrumbItems = [
	{ label: "홈", href: "/" },
	{ label: "통계", href: "/stats" },
	{ label: "끝수분석", href: "/stats/unit-digit", current: true },
];

// 입력값 유효성 검사 (데이터 검증 강화)
const validateInput = (value: string): boolean => {
	const str = String(value || "");
	if (str.trim() === "") return false;
	const num = Number(str);
	const maxRounds = typeof data.totalRounds === "number" ? data.totalRounds : 0;
	return (
		!Number.isNaN(num) && Number.isInteger(num) && num > 0 && num <= maxRounds
	);
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
			await goto(`/stats/unit-digit/recent/${rounds}`);
		} catch (error) {
			console.error("Navigation error:", error);
			alert("페이지 이동 중 오류가 발생했습니다.");
		}
	} else {
		alert(
			`1부터 ${typeof data.totalRounds === "number" ? data.totalRounds : 0}까지의 숫자를 입력해주세요.`,
		);
	}
};

// Enter 키 처리
const handleKeydown = (event: KeyboardEvent) => {
	if (event.key === "Enter") {
		navigateToAnalysis();
	}
};

// 끝수별 색상 클래스
const getDigitColorClass = (digit: string) => {
	const colors = [
		"bg-red-500",
		"bg-blue-500",
		"bg-green-500",
		"bg-yellow-500",
		"bg-purple-500",
		"bg-pink-500",
		"bg-indigo-500",
		"bg-teal-500",
		"bg-orange-500",
		"bg-gray-500",
	];
	return colors[Number(digit)] || "bg-gray-400";
};

// 끝수별 밝은 색상 클래스
const getDigitLightColorClass = (digit: string) => {
	const colors = [
		"bg-red-500/20 text-red-600 dark:text-red-400",
		"bg-blue-500/20 text-blue-600 dark:text-blue-400",
		"bg-green-500/20 text-green-600 dark:text-green-400",
		"bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
		"bg-purple-500/20 text-purple-600 dark:text-purple-400",
		"bg-pink-500/20 text-pink-600 dark:text-pink-400",
		"bg-indigo-500/20 text-indigo-600 dark:text-indigo-400",
		"bg-teal-500/20 text-teal-600 dark:text-teal-400",
		"bg-orange-500/20 text-orange-600 dark:text-orange-400",
		"bg-gray-500/20 text-gray-600 dark:text-gray-400",
	];
	return (
		colors[Number(digit)] || "bg-gray-500/20 text-gray-600 dark:text-gray-400"
	);
};

// 데이터 검증 및 안전한 접근 (Svelte 5 $derived 사용)
let safeDigitTotals = $derived(
	data.digitTotals && typeof data.digitTotals === "object"
		? data.digitTotals
		: {
				"0": 0,
				"1": 0,
				"2": 0,
				"3": 0,
				"4": 0,
				"5": 0,
				"6": 0,
				"7": 0,
				"8": 0,
				"9": 0,
			},
);

let safeDigitAverages = $derived(
	data.digitAverages && typeof data.digitAverages === "object"
		? data.digitAverages
		: {
				"0": "0.00",
				"1": "0.00",
				"2": "0.00",
				"3": "0.00",
				"4": "0.00",
				"5": "0.00",
				"6": "0.00",
				"7": "0.00",
				"8": "0.00",
				"9": "0.00",
			},
);

let safeDigitCountDistribution = $derived(
	data.digitCountDistribution && typeof data.digitCountDistribution === "object"
		? data.digitCountDistribution
		: {},
);

let safeRecentStats = $derived(
	Array.isArray(data.recentStats) ? data.recentStats : [],
);

let safeMostFrequentDigit = $derived(
	Array.isArray(data.mostFrequentDigit) ? data.mostFrequentDigit : [0, "0"],
);

let safeLeastFrequentDigit = $derived(
	Array.isArray(data.leastFrequentDigit) ? data.leastFrequentDigit : [0, "0"],
);
</script>

<MetaTags
	title="로또 6/45 끝수 분석 통계 | 끝자리 숫자별 출현 패턴"
	titleTemplate="%s | 645.live"
	description="로또 6/45 당첨번호의 끝수(0-9) 분포 및 출현 패턴을 분석합니다. 각 끝수별 출현 빈도와 통계를 확인하세요."
	canonical="https://645.live/stats/unit-digit"
	keywords={["로또", "끝수분석", "끝자리숫자", "로또통계", "끝수패턴", "로또예측", "6/45통계", "끝수분포", "숫자분석", "로또끝수통계"]}
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
		url: 'https://645.live/stats/unit-digit',
		title: '로또 6/45 끝수 분석 통계 | 끝자리 숫자별 출현 패턴',
		description: '로또 6/45 당첨번호의 끝수(0-9) 분포 및 출현 패턴을 분석합니다. 각 끝수별 출현 빈도와 통계를 확인하세요.',
		locale: 'ko_KR',
		images: [{
			url: `https://645.live/og?title=${encodeURIComponent('로또 6/45 끝수 분석')}&description=${encodeURIComponent(`0-9 끝자리 완전분석 - 최다: ${safeMostFrequentDigit[0]} (${safeMostFrequentDigit[1]}회) - 최소: ${safeLeastFrequentDigit[0]} (${safeLeastFrequentDigit[1]}회)`)}&layout=minimal&theme=dark`,
			width: 1200,
			height: 630,
			alt: '로또 6/45 끝수 분석 통계',
			type: 'image/svg+xml'
		}],
		siteName: '645.live',
		article: {
			section: '로또 통계',
			tags: ['로또', '끝수분석', '끝자리숫자', '로또통계', '끝수패턴', '6/45통계', '끝수분포', '숫자분석'],
			publishedTime: '2024-01-01T00:00:00.000Z',
			modifiedTime: new Date().toISOString()
		}
	}}
	twitter={{
		cardType: 'summary_large_image',
		site: '@645live',
		title: '로또 6/45 끝수 분석 통계',
		description: '끝자리 숫자별 출현 패턴으로 로또 번호 분석을 파악하세요.',
		image: `https://645.live/og?title=${encodeURIComponent('로또 6/45 끝수 분석')}&description=${encodeURIComponent(`0-9 끝자리 완전분석 - 최다: ${safeMostFrequentDigit[0]} (${safeMostFrequentDigit[1]}회) - 최소: ${safeLeastFrequentDigit[0]} (${safeLeastFrequentDigit[1]}회)`)}&layout=minimal&theme=dark`,
		imageAlt: '로또 6/45 끝수 분석 통계'
	}}
/>

<JsonLd
	schema={{
		'@type': 'Dataset',
		name: '로또 6/45 끝수 분석 통계',
		description: '로또 6/45 당첨번호의 끝수(0-9) 분포 및 출현 패턴을 분석한 통계 데이터입니다.',
		url: 'https://645.live/stats/unit-digit',
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
				name: '최다 출현 끝수',
				value: `끝수 ${safeMostFrequentDigit[0]} (${safeMostFrequentDigit[1]}회)`
			},
			{
				'@type': 'PropertyValue',
				name: '최소 출현 끝수',
				value: `끝수 ${safeLeastFrequentDigit[0]} (${safeLeastFrequentDigit[1]}회)`
			},
			{
				'@type': 'PropertyValue',
				name: '총 분석 회차',
				value: data.totalRounds
			},
			{
				'@type': 'PropertyValue',
				name: '이론적 평균',
				value: '1.3개'
			}
		]
	}}
/>

<div class="p-6 space-y-6 max-sm:px-0">
	<!-- Breadcrumbs -->
	<Breadcrumbs items={breadcrumbItems} />

	<!-- 페이지 헤더 -->
	<div class="text-center space-y-2">
		<h1 class="text-3xl font-bold text-primary">끝수 분석 통계</h1>
		<p class="text-base-content/70">
			로또 6/45 당첨번호의 끝수(0-9) 분포 및 출현 패턴을 분석합니다.<br />
			각 끝수별 출현 빈도와 통계를 확인하세요.
		</p>
	</div>

	<!-- 최근 회차 분석 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-4">
			<h2 class="card-title text-lg">최근 회차 분석</h2>
			<div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
				<div class="flex flex-col sm:flex-row sm:items-center gap-2">
					<label for="rounds-input" class="text-sm font-medium">분석 회차 (1-{data.totalRounds}):</label>
					<input
						id="rounds-input"
						type="text"
						inputmode="numeric"
						pattern="[0-9]*"
						bind:value={inputValue}
						onkeydown={handleKeydown}
						class="input input-bordered input-sm w-24 text-center"
						placeholder="100"
					/>
				</div>
				<button
					type="button"
					onclick={navigateToAnalysis}
					class="btn btn-primary btn-sm w-full sm:w-auto"
				>
					분석하기
				</button>
			</div>
			<p class="text-sm text-base-content/60">
				현재 <span class="font-semibold text-primary">전체 {data.totalRounds}회차</span> 데이터를 분석 중입니다.
			</p>
		</div>
	</div>

	<!-- 요약 통계 -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="stat bg-primary text-primary-content rounded-lg">
			<div class="stat-title text-primary-content/70">총 분석 회차</div>
			<div class="stat-value text-2xl">{data.totalRounds}</div>
			<div class="stat-desc text-primary-content/70">전체 {data.totalRecords}회차</div>
		</div>
		
		<div class="stat bg-secondary text-secondary-content rounded-lg">
			<div class="stat-title text-secondary-content/70">최다 출현 끝수</div>
			<div class="stat-value text-2xl">{safeMostFrequentDigit[0]}</div>
			<div class="stat-desc text-secondary-content/70">{safeMostFrequentDigit[1]}회 출현</div>
		</div>
		
		<div class="stat bg-accent text-accent-content rounded-lg">
			<div class="stat-title text-accent-content/70">최소 출현 끝수</div>
			<div class="stat-value text-2xl">{safeLeastFrequentDigit[0]}</div>
			<div class="stat-desc text-accent-content/70">{safeLeastFrequentDigit[1]}회 출현</div>
		</div>
		
		<div class="stat bg-info text-info-content rounded-lg">
			<div class="stat-title text-info-content/70">이론적 평균</div>
			<div class="stat-value text-2xl">1.3</div>
			<div class="stat-desc text-info-content/70">개당 평균</div>
		</div>
	</div>

	<!-- 끝수별 요약 통계 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-6">
			<h2 class="card-title text-lg sm:text-xl">끝수별 출현 현황</h2>
			<p class="text-sm text-base-content/60 mb-4">
				각 끝수(0-9)별 출현 빈도와 평균 개수를 나타냅니다.
			</p>
			
			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
				{#each Object.entries(safeDigitTotals) as [digit, total]}
					<div class="text-center space-y-2 p-4 bg-base-200 rounded-lg">
						<div class="inline-flex items-center justify-center w-12 h-12 rounded-full {getDigitColorClass(digit)} text-white text-xl font-bold">
							{digit}
						</div>
						<div class="text-lg font-semibold text-primary">
							평균 {safeDigitAverages[digit]}개
						</div>
						<div class="text-sm text-base-content/60">
							총 {total}회 출현
						</div>
						<div class="text-xs text-base-content/50">
							{data.totalRounds > 0 ? ((Number(total) / (data.totalRounds * 6)) * 100).toFixed(1) : '0.0'}% 비율
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- 끝수별 분포 차트 -->
	<div class="grid grid-cols-1 gap-8">
		<div class="card bg-base-100 shadow-sm">
			<div class="card-body p-3 sm:p-6">
				<h3 class="card-title text-lg sm:text-xl">끝수별 총 출현 횟수</h3>
				<div class="space-y-3">
					{#each Object.entries(safeDigitTotals) as [digit, total]}
						{@const maxTotal = Math.max(...Object.values(safeDigitTotals).map(v => Number(v)))}
						<div class="flex items-center justify-between">
							<div class="flex items-center">
								<div class="w-6 h-6 rounded-full {getDigitColorClass(digit)} mr-3 text-white text-sm font-bold flex items-center justify-center">
									{digit}
								</div>
								<span class="text-sm font-medium">끝수 {digit}</span>
							</div>
							<div class="flex items-center">
								<span class="text-sm text-base-content/70 mr-2 w-12 text-right">{total}</span>
								<div class="w-32 bg-base-300 rounded-full h-2">
									<div 
										class="{getDigitColorClass(digit)} h-2 rounded-full" 
										style="width: {maxTotal > 0 ? (Number(total) / maxTotal) * 100 : 0}%"
									></div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<div class="card bg-base-100 shadow-sm">
			<div class="card-body p-3 sm:p-6">
				<h3 class="card-title text-lg sm:text-xl">끝수별 개수 분포</h3>
				<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs">
					{#each Object.entries(safeDigitTotals) as [digit, total]}
						<div class="text-center">
							<div class="w-6 h-6 rounded-full {getDigitColorClass(digit)} mx-auto mb-1 text-white text-xs font-bold flex items-center justify-center">
								{digit}
							</div>
							<div class="font-medium text-xs mb-2">끝수 {digit}</div>
							<div class="space-y-1">
								{#each Object.entries(safeDigitCountDistribution[digit] || {}) as [count, freq]}
									<div class="flex justify-between text-xs">
										<span>{count}개</span>
										<span class="text-base-content/70">{freq}</span>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<!-- 최근 회차 끝수 현황 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-6">
			<h3 class="card-title text-lg sm:text-xl">최근 10회차 끝수 현황</h3>
			<div class="overflow-x-auto -mx-3 sm:mx-0">
				<table class="table table-zebra w-full">
					<thead>
						<tr>
							<th class="sticky left-0 bg-base-200 z-10 text-xs sm:text-sm min-w-[60px]">회차</th>
							<th class="text-center min-w-[40px] text-xs sm:text-sm">0</th>
							<th class="text-center min-w-[40px] text-xs sm:text-sm">1</th>
							<th class="text-center min-w-[40px] text-xs sm:text-sm">2</th>
							<th class="text-center min-w-[40px] text-xs sm:text-sm">3</th>
							<th class="text-center min-w-[40px] text-xs sm:text-sm">4</th>
							<th class="text-center min-w-[40px] text-xs sm:text-sm">5</th>
							<th class="text-center min-w-[40px] text-xs sm:text-sm">6</th>
							<th class="text-center min-w-[40px] text-xs sm:text-sm">7</th>
							<th class="text-center min-w-[40px] text-xs sm:text-sm">8</th>
							<th class="text-center min-w-[40px] text-xs sm:text-sm">9</th>
						</tr>
					</thead>
					<tbody>
						{#each safeRecentStats as stat}
							{@const statRecord = stat as Record<string, any>}
							<tr>
								<td class="font-semibold sticky left-0 bg-base-100 z-10 text-xs sm:text-sm">{statRecord.round}회</td>
								<td class="text-center">
									<span class="inline-flex items-center justify-center w-6 h-6 rounded-full {
										statRecord.digit_0_count > 0 ? getDigitColorClass('0') + ' text-white' : 'bg-base-300 text-base-content/50'
									} text-xs font-bold">
										{statRecord.digit_0_count}
									</span>
								</td>
								<td class="text-center">
									<span class="inline-flex items-center justify-center w-6 h-6 rounded-full {
										statRecord.digit_1_count > 0 ? getDigitColorClass('1') + ' text-white' : 'bg-base-300 text-base-content/50'
									} text-xs font-bold">
										{statRecord.digit_1_count}
									</span>
								</td>
								<td class="text-center">
									<span class="inline-flex items-center justify-center w-6 h-6 rounded-full {
										statRecord.digit_2_count > 0 ? getDigitColorClass('2') + ' text-white' : 'bg-base-300 text-base-content/50'
									} text-xs font-bold">
										{statRecord.digit_2_count}
									</span>
								</td>
								<td class="text-center">
									<span class="inline-flex items-center justify-center w-6 h-6 rounded-full {
										statRecord.digit_3_count > 0 ? getDigitColorClass('3') + ' text-white' : 'bg-base-300 text-base-content/50'
									} text-xs font-bold">
										{statRecord.digit_3_count}
									</span>
								</td>
								<td class="text-center">
									<span class="inline-flex items-center justify-center w-6 h-6 rounded-full {
										statRecord.digit_4_count > 0 ? getDigitColorClass('4') + ' text-white' : 'bg-base-300 text-base-content/50'
									} text-xs font-bold">
										{statRecord.digit_4_count}
									</span>
								</td>
								<td class="text-center">
									<span class="inline-flex items-center justify-center w-6 h-6 rounded-full {
										statRecord.digit_5_count > 0 ? getDigitColorClass('5') + ' text-white' : 'bg-base-300 text-base-content/50'
									} text-xs font-bold">
										{statRecord.digit_5_count}
									</span>
								</td>
								<td class="text-center">
									<span class="inline-flex items-center justify-center w-6 h-6 rounded-full {
										statRecord.digit_6_count > 0 ? getDigitColorClass('6') + ' text-white' : 'bg-base-300 text-base-content/50'
									} text-xs font-bold">
										{statRecord.digit_6_count}
									</span>
								</td>
								<td class="text-center">
									<span class="inline-flex items-center justify-center w-6 h-6 rounded-full {
										statRecord.digit_7_count > 0 ? getDigitColorClass('7') + ' text-white' : 'bg-base-300 text-base-content/50'
									} text-xs font-bold">
										{statRecord.digit_7_count}
									</span>
								</td>
								<td class="text-center">
									<span class="inline-flex items-center justify-center w-6 h-6 rounded-full {
										statRecord.digit_8_count > 0 ? getDigitColorClass('8') + ' text-white' : 'bg-base-300 text-base-content/50'
									} text-xs font-bold">
										{statRecord.digit_8_count}
									</span>
								</td>
								<td class="text-center">
									<span class="inline-flex items-center justify-center w-6 h-6 rounded-full {
										statRecord.digit_9_count > 0 ? getDigitColorClass('9') + ' text-white' : 'bg-base-300 text-base-content/50'
									} text-xs font-bold">
										{statRecord.digit_9_count}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>

	<!-- 끝수 분석 가이드 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-6">
			<h2 class="card-title text-lg sm:text-xl">끝수 분석 가이드</h2>
			<div class="space-y-3 text-sm">
				<p>
					끝수 분석은 번호의 마지막 자리수(0-9)를 기준으로 분석하는 방법입니다.
				</p>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<h4 class="font-semibold text-primary mb-2">끝수 특징</h4>
						<ul class="list-disc list-inside space-y-1 text-base-content/70">
							<li><strong>0, 5:</strong> 5의 배수 끝수 (10, 15, 20, 25, 30, 35, 40, 45)</li>
							<li><strong>1-4, 6-9:</strong> 일반 끝수</li>
							<li><strong>이론적 평균:</strong> 각 끝수당 1.3개 출현</li>
						</ul>
					</div>
					<div>
						<h4 class="font-semibold text-secondary mb-2">패턴 활용법</h4>
						<ul class="list-disc list-inside space-y-1 text-base-content/70">
							<li><strong>균형 분포:</strong> 고른 끝수 분포가 일반적</li>
							<li><strong>0, 5는 제한적:</strong> 선택 가능한 번호가 적음</li>
							<li><strong>편중 방지:</strong> 특정 끝수의 과도한 편중 주의</li>
						</ul>
					</div>
				</div>
				<div class="mt-4 p-3 bg-info/10 rounded-lg">
					<p class="text-info font-medium">
						💡 팁: 대부분의 당첨번호는 다양한 끝수로 구성되며, 
						특정 끝수에만 집중되는 경우는 드뭅니다.
					</p>
				</div>
			</div>
		</div>
	</div>

</div>
