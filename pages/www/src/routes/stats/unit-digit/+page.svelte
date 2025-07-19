<script lang="ts">
import { goto } from "$app/navigation";
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";
import LinkButton from "$lib/ui/LinkButton.svelte";
import { JsonLd, MetaTags } from "svelte-meta-tags";
import type { PageData } from "./$types";

export let data: PageData;

// 사용자 입력 상태
let inputValue = "";

// Breadcrumbs 데이터
const breadcrumbItems = [
	{ label: "홈", href: "/" },
	{ label: "통계", href: "/stats" },
	{ label: "끝수분석", href: "/stats/unit-digit", current: true },
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
		console.log(`Navigating to: /stats/unit-digit/recent/${rounds}`);
		try {
			await goto(`/stats/unit-digit/recent/${rounds}`);
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
		"bg-red-100 text-red-800",
		"bg-blue-100 text-blue-800",
		"bg-green-100 text-green-800",
		"bg-yellow-100 text-yellow-800",
		"bg-purple-100 text-purple-800",
		"bg-pink-100 text-pink-800",
		"bg-indigo-100 text-indigo-800",
		"bg-teal-100 text-teal-800",
		"bg-orange-100 text-orange-800",
		"bg-gray-100 text-gray-800",
	];
	return colors[Number(digit)] || "bg-gray-100 text-gray-800";
};
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
			url: 'https://645.live/images/lotto-unit-digit-stats.png',
			width: 1200,
			height: 630,
			alt: '로또 6/45 끝수 분석 통계',
			secureUrl: 'https://645.live/images/lotto-unit-digit-stats.png',
			type: 'image/png'
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
		image: 'https://645.live/images/lotto-unit-digit-stats.png',
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
				value: `끝수 ${data.mostFrequentDigit[0]} (${data.mostFrequentDigit[1]}회)`
			},
			{
				'@type': 'PropertyValue',
				name: '최소 출현 끝수',
				value: `끝수 ${data.leastFrequentDigit[0]} (${data.leastFrequentDigit[1]}회)`
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

<div class="p-6 space-y-6">
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
			<div class="flex items-center gap-4 flex-wrap">
				<div class="flex items-center gap-2">
					<label for="rounds-input" class="text-sm font-medium">분석 회차 (1-{data.totalRounds}):</label>
					<input
						id="rounds-input"
						type="text"
						inputmode="numeric"
						pattern="[0-9]*"
						bind:value={inputValue}
						on:keydown={handleKeydown}
						class="input input-bordered input-sm w-20 text-center"
						placeholder="100"
					/>
				</div>
				<button
					type="button"
					on:click={navigateToAnalysis}
					class="btn btn-primary btn-sm"
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
			<div class="stat-value text-2xl">{data.mostFrequentDigit[0]}</div>
			<div class="stat-desc text-secondary-content/70">{data.mostFrequentDigit[1]}회 출현</div>
		</div>
		
		<div class="stat bg-accent text-accent-content rounded-lg">
			<div class="stat-title text-accent-content/70">최소 출현 끝수</div>
			<div class="stat-value text-2xl">{data.leastFrequentDigit[0]}</div>
			<div class="stat-desc text-accent-content/70">{data.leastFrequentDigit[1]}회 출현</div>
		</div>
		
		<div class="stat bg-info text-info-content rounded-lg">
			<div class="stat-title text-info-content/70">이론적 평균</div>
			<div class="stat-value text-2xl">1.3</div>
			<div class="stat-desc text-info-content/70">개당 평균</div>
		</div>
	</div>

	<!-- 끝수별 요약 통계 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">끝수별 출현 현황</h2>
			<p class="text-sm text-base-content/60 mb-4">
				각 끝수(0-9)별 출현 빈도와 평균 개수를 나타냅니다.
			</p>
			
			<div class="grid grid-cols-2 md:grid-cols-5 gap-4">
				{#each Object.entries(data.digitTotals) as [digit, total]}
					<div class="text-center space-y-2 p-4 bg-base-200 rounded-lg">
						<div class="inline-flex items-center justify-center w-12 h-12 rounded-full {getDigitColorClass(digit)} text-white text-xl font-bold">
							{digit}
						</div>
						<div class="text-lg font-semibold text-primary">
							평균 {(data.digitAverages as Record<string, string>)[digit]}개
						</div>
						<div class="text-sm text-base-content/60">
							총 {total}회 출현
						</div>
						<div class="text-xs text-base-content/50">
							{data.totalRounds > 0 ? ((total / (data.totalRounds * 6)) * 100).toFixed(1) : '0.0'}% 비율
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- 끝수별 분포 차트 -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
		<div class="card bg-base-100 shadow-sm">
			<div class="card-body">
				<h3 class="card-title">끝수별 총 출현 횟수</h3>
				<div class="space-y-3">
					{#each Object.entries(data.digitTotals) as [digit, total]}
						{@const maxTotal = Math.max(...Object.values(data.digitTotals))}
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
										style="width: {maxTotal > 0 ? (total / maxTotal) * 100 : 0}%"
									></div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<div class="card bg-base-100 shadow-sm">
			<div class="card-body">
				<h3 class="card-title">끝수별 개수 분포</h3>
				<div class="grid grid-cols-5 gap-2 text-xs">
					{#each Object.entries(data.digitTotals) as [digit, total]}
						<div class="text-center">
							<div class="w-6 h-6 rounded-full {getDigitColorClass(digit)} mx-auto mb-1 text-white text-xs font-bold flex items-center justify-center">
								{digit}
							</div>
							<div class="font-medium text-xs mb-2">끝수 {digit}</div>
							<div class="space-y-1">
								{#each Object.entries((data.digitCountDistribution as Record<string, Record<string, number>>)[digit] || {}) as [count, freq]}
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
		<div class="card-body">
			<h3 class="card-title">최근 10회차 끝수 현황</h3>
			<div class="overflow-x-auto">
				<table class="table table-zebra w-full">
					<thead>
						<tr>
							<th>회차</th>
							<th class="text-center">0</th>
							<th class="text-center">1</th>
							<th class="text-center">2</th>
							<th class="text-center">3</th>
							<th class="text-center">4</th>
							<th class="text-center">5</th>
							<th class="text-center">6</th>
							<th class="text-center">7</th>
							<th class="text-center">8</th>
							<th class="text-center">9</th>
						</tr>
					</thead>
					<tbody>
						{#each data.recentStats as stat}
							{@const statRecord = stat as Record<string, any>}
							<tr>
								<td class="font-semibold">{statRecord.round}회</td>
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
		<div class="card-body">
			<h2 class="card-title">끝수 분석 가이드</h2>
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
