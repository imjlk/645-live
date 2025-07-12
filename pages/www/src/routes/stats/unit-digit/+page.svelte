<script lang="ts">
import { onMount } from "svelte";
import type { PageData } from "./$types";

export let data: PageData;

// JSON-LD 스키마
const generateJsonLd = () => {
	return {
		"@context": "https://schema.org",
		"@type": "Dataset",
		name: "로또 6/45 끝수 통계",
		description: "로또 6/45 당첨번호의 끝수(0-9) 분포 및 출현 패턴 분석",
		url: "https://645.live/stats/unit-digit",
		keywords: ["로또끝수", "로또끝자리", "로또숫자분석", "로또패턴"],
		temporalCoverage: "2002-12-07/..",
		creator: {
			"@type": "Organization",
			name: "645.live",
		},
	};
};

onMount(() => {
	const script = document.createElement("script");
	script.type = "application/ld+json";
	script.textContent = JSON.stringify(generateJsonLd());
	document.head.appendChild(script);
	return () => document.head.removeChild(script);
});

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

<svelte:head>
	<title>로또 6/45 끝수 통계 | 645.live</title>
	<meta name="description" content="로또 6/45 당첨번호의 끝수(0-9) 분포 및 출현 패턴을 분석합니다. 각 끝수별 출현 빈도를 확인하세요." />
	<meta name="keywords" content="로또끝수, 로또끝자리, 로또숫자분석, 로또패턴" />
	<meta property="og:title" content="로또 6/45 끝수 통계" />
	<meta property="og:description" content="로또 6/45 당첨번호의 끝수 분포 분석" />
	<link rel="canonical" href="https://645.live/stats/unit-digit" />
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="mb-6">
		<nav class="text-sm text-gray-600 mb-4">
			<a href="/stats" class="hover:text-blue-600">통계 홈</a>
			<span class="mx-2">›</span>
			<span class="text-gray-900">끝수 통계</span>
		</nav>
		
		<h1 class="text-3xl font-bold text-gray-900 mb-2">끝수 통계</h1>
		<p class="text-gray-600">
			로또 6/45 당첨번호의 끝수(0-9) 분포 및 출현 패턴 분석
		</p>
	</div>

	<!-- 통계 요약 -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
		<div class="bg-white rounded-lg shadow-md p-6 text-center">
			<div class="text-2xl font-bold text-blue-600">{data.totalRounds}</div>
			<div class="text-sm text-gray-600">총 분석 회차</div>
		</div>
		<div class="bg-white rounded-lg shadow-md p-6 text-center">
			<div class="text-2xl font-bold text-green-600">{data.mostFrequentDigit[0]}</div>
			<div class="text-sm text-gray-600">최다 출현 끝수</div>
			<div class="text-xs text-gray-500">{data.mostFrequentDigit[1]}회</div>
		</div>
		<div class="bg-white rounded-lg shadow-md p-6 text-center">
			<div class="text-2xl font-bold text-orange-600">{data.leastFrequentDigit[0]}</div>
			<div class="text-sm text-gray-600">최소 출현 끝수</div>
			<div class="text-xs text-gray-500">{data.leastFrequentDigit[1]}회</div>
		</div>
		<div class="bg-white rounded-lg shadow-md p-6 text-center">
			<div class="text-2xl font-bold text-purple-600">1.3</div>
			<div class="text-sm text-gray-600">이론적 평균</div>
			<div class="text-xs text-gray-500">개당 평균</div>
		</div>
	</div>

	<!-- 끝수별 요약 통계 -->
	<div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
		{#each Object.entries(data.digitTotals) as [digit, total]}
			<div class="bg-white rounded-lg shadow-md p-4 text-center">
				<div class="mb-3">
					<div class="inline-flex items-center justify-center w-12 h-12 rounded-full {getDigitColorClass(digit)} text-white text-xl font-bold">
						{digit}
					</div>
				</div>
				<div class="text-lg font-semibold text-gray-900 mb-1">
					평균 {(data.digitAverages as Record<string, string>)[digit]}개
				</div>
				<div class="text-sm text-gray-600 mb-2">
					총 {total}회 출현
				</div>
				<div class="text-xs text-gray-500">
					{data.totalRounds > 0 ? ((total / (data.totalRounds * 6)) * 100).toFixed(1) : '0.0'}% 비율
				</div>
			</div>
		{/each}
	</div>

	<!-- 끝수별 분포 차트 -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
		<div class="bg-white rounded-lg shadow-md p-6">
			<h3 class="text-lg font-semibold mb-4">끝수별 총 출현 횟수</h3>
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
							<span class="text-sm text-gray-600 mr-2 w-12 text-right">{total}</span>
							<div class="w-32 bg-gray-200 rounded-full h-2">
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

		<div class="bg-white rounded-lg shadow-md p-6">
			<h3 class="text-lg font-semibold mb-4">끝수별 개수 분포</h3>
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
									<span class="text-gray-600">{freq}</span>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- 최근 회차 끝수 현황 -->
	<div class="bg-white rounded-lg shadow-md p-6 mb-8">
		<h3 class="text-lg font-semibold mb-4">최근 10회차 끝수 현황</h3>
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-4 py-2 text-left">회차</th>
						<th class="px-4 py-2 text-center">0</th>
						<th class="px-4 py-2 text-center">1</th>
						<th class="px-4 py-2 text-center">2</th>
						<th class="px-4 py-2 text-center">3</th>
						<th class="px-4 py-2 text-center">4</th>
						<th class="px-4 py-2 text-center">5</th>
						<th class="px-4 py-2 text-center">6</th>
						<th class="px-4 py-2 text-center">7</th>
						<th class="px-4 py-2 text-center">8</th>
						<th class="px-4 py-2 text-center">9</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200">
					{#each data.recentStats as stat}
						{@const statRecord = stat as Record<string, any>}
						<tr class="hover:bg-gray-50">
							<td class="px-4 py-2 font-medium">{statRecord.round}회차</td>
							<td class="px-4 py-2 text-center">
								<span class="inline-flex items-center justify-center w-6 h-6 rounded-full {
									statRecord.digit_0_count > 0 ? getDigitColorClass('0') + ' text-white' : 'bg-gray-100 text-gray-400'
								} text-xs font-bold">
									{statRecord.digit_0_count}
								</span>
							</td>
							<td class="px-4 py-2 text-center">
								<span class="inline-flex items-center justify-center w-6 h-6 rounded-full {
									statRecord.digit_1_count > 0 ? getDigitColorClass('1') + ' text-white' : 'bg-gray-100 text-gray-400'
								} text-xs font-bold">
									{statRecord.digit_1_count}
								</span>
							</td>
							<td class="px-4 py-2 text-center">
								<span class="inline-flex items-center justify-center w-6 h-6 rounded-full {
									statRecord.digit_2_count > 0 ? getDigitColorClass('2') + ' text-white' : 'bg-gray-100 text-gray-400'
								} text-xs font-bold">
									{statRecord.digit_2_count}
								</span>
							</td>
							<td class="px-4 py-2 text-center">
								<span class="inline-flex items-center justify-center w-6 h-6 rounded-full {
									statRecord.digit_3_count > 0 ? getDigitColorClass('3') + ' text-white' : 'bg-gray-100 text-gray-400'
								} text-xs font-bold">
									{statRecord.digit_3_count}
								</span>
							</td>
							<td class="px-4 py-2 text-center">
								<span class="inline-flex items-center justify-center w-6 h-6 rounded-full {
									statRecord.digit_4_count > 0 ? getDigitColorClass('4') + ' text-white' : 'bg-gray-100 text-gray-400'
								} text-xs font-bold">
									{statRecord.digit_4_count}
								</span>
							</td>
							<td class="px-4 py-2 text-center">
								<span class="inline-flex items-center justify-center w-6 h-6 rounded-full {
									statRecord.digit_5_count > 0 ? getDigitColorClass('5') + ' text-white' : 'bg-gray-100 text-gray-400'
								} text-xs font-bold">
									{statRecord.digit_5_count}
								</span>
							</td>
							<td class="px-4 py-2 text-center">
								<span class="inline-flex items-center justify-center w-6 h-6 rounded-full {
									statRecord.digit_6_count > 0 ? getDigitColorClass('6') + ' text-white' : 'bg-gray-100 text-gray-400'
								} text-xs font-bold">
									{statRecord.digit_6_count}
								</span>
							</td>
							<td class="px-4 py-2 text-center">
								<span class="inline-flex items-center justify-center w-6 h-6 rounded-full {
									statRecord.digit_7_count > 0 ? getDigitColorClass('7') + ' text-white' : 'bg-gray-100 text-gray-400'
								} text-xs font-bold">
									{statRecord.digit_7_count}
								</span>
							</td>
							<td class="px-4 py-2 text-center">
								<span class="inline-flex items-center justify-center w-6 h-6 rounded-full {
									statRecord.digit_8_count > 0 ? getDigitColorClass('8') + ' text-white' : 'bg-gray-100 text-gray-400'
								} text-xs font-bold">
									{statRecord.digit_8_count}
								</span>
							</td>
							<td class="px-4 py-2 text-center">
								<span class="inline-flex items-center justify-center w-6 h-6 rounded-full {
									statRecord.digit_9_count > 0 ? getDigitColorClass('9') + ' text-white' : 'bg-gray-100 text-gray-400'
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

	<!-- 분석 가이드 -->
	<div class="mt-8 bg-indigo-50 rounded-lg p-6">
		<h3 class="text-lg font-semibold mb-4 text-indigo-900">🔢 끝수 분석 가이드</h3>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
			<div>
				<h4 class="font-semibold mb-2">끝수 특징</h4>
				<ul class="space-y-1 text-gray-700">
					<li>• <strong>0, 5:</strong> 5의 배수 끝수 (10, 15, 20, 25, 30, 35, 40, 45)</li>
					<li>• <strong>1-4, 6-9:</strong> 일반 끝수</li>
					<li>• 이론적으로 각 끝수는 평균 1.3개씩 출현</li>
					<li>• 실제로는 끝수별로 차이가 발생</li>
				</ul>
			</div>
			<div>
				<h4 class="font-semibold mb-2">패턴 활용법</h4>
				<ul class="space-y-1 text-gray-700">
					<li>• 특정 끝수가 연속으로 많이 나오면 조정 경향</li>
					<li>• 0, 5는 상대적으로 선택할 수 있는 번호가 적음</li>
					<li>• 고른 끝수 분포를 보이는 회차가 일반적</li>
					<li>• 특정 끝수의 편중을 피하는 것이 유리</li>
				</ul>
			</div>
		</div>
	</div>

	<!-- 페이지네이션 -->
	{#if data.totalPages > 1}
		<div class="mt-8 flex justify-center">
			<nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
				{#if data.currentPage > 1}
					<a href="?page={data.currentPage - 1}" class="pagination-link">이전</a>
				{/if}
				
				{#each Array(Math.min(10, data.totalPages)) as _, i}
					{@const pageNum = i + 1}
					<a 
						href="?page={pageNum}" 
						class="pagination-link {pageNum === data.currentPage ? 'active' : ''}"
					>
						{pageNum}
					</a>
				{/each}
				
				{#if data.currentPage < data.totalPages}
					<a href="?page={data.currentPage + 1}" class="pagination-link">다음</a>
				{/if}
			</nav>
		</div>
	{/if}
</div>

<style>
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
