<script lang="ts">
import { onMount } from "svelte";
import type { PageData } from "./$types";

export let data: PageData;

// JSON-LD 스키마
const generateJsonLd = () => {
	return {
		"@context": "https://schema.org",
		"@type": "Dataset",
		name: "로또 6/45 번호 쌍 통계",
		description: "로또 6/45 당첨번호의 동반 출현 패턴 및 번호 쌍 분석",
		url: "https://645.live/stats/pairs",
		keywords: ["로또번호쌍", "로또동반출현", "로또번호조합", "로또쌍분석"],
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

<svelte:head>
	<title>로또 6/45 번호 쌍 통계 | 645.live</title>
	<meta name="description" content="로또 6/45 당첨번호의 동반 출현 패턴 및 번호 쌍 분석. 가장 많이 함께 나오는 번호 조합을 확인하세요." />
	<meta name="keywords" content="로또번호쌍, 로또동반출현, 로또번호조합, 로또쌍분석" />
	<meta property="og:title" content="로또 6/45 번호 쌍 통계" />
	<meta property="og:description" content="로또 6/45 당첨번호의 동반 출현 패턴 분석" />
	<link rel="canonical" href="https://645.live/stats/pairs" />
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="mb-6">
		<nav class="text-sm text-gray-600 mb-4">
			<a href="/stats" class="hover:text-blue-600">통계 홈</a>
			<span class="mx-2">›</span>
			<span class="text-gray-900">번호 쌍 통계</span>
		</nav>
		
		<h1 class="text-3xl font-bold text-gray-900 mb-2">번호 쌍 통계</h1>
		<p class="text-gray-600">
			로또 6/45 당첨번호의 동반 출현 패턴 및 번호 쌍 분석
		</p>
	</div>

	<!-- 통계 요약 -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
		<div class="bg-white rounded-lg shadow-md p-6 text-center">
			<div class="text-2xl font-bold text-blue-600">{data.totalPairs}</div>
			<div class="text-sm text-gray-600">총 번호 쌍</div>
		</div>
		<div class="bg-white rounded-lg shadow-md p-6 text-center">
			<div class="text-2xl font-bold text-green-600">{data.averagePairCount}</div>
			<div class="text-sm text-gray-600">평균 동반 출현</div>
		</div>
		<div class="bg-white rounded-lg shadow-md p-6 text-center">
			<div class="text-2xl font-bold text-orange-600">{data.maxPairCount}</div>
			<div class="text-sm text-gray-600">최대 동반 출현</div>
		</div>
		<div class="bg-white rounded-lg shadow-md p-6 text-center">
			<div class="text-2xl font-bold text-red-600">{data.minPairCount}</div>
			<div class="text-sm text-gray-600">최소 동반 출현</div>
		</div>
	</div>

	<!-- 동반 출현 분포 및 활발한 번호 -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
		<div class="bg-white rounded-lg shadow-md p-6">
			<h3 class="text-lg font-semibold mb-4">동반 출현 횟수 분포</h3>
			<div class="space-y-3">
				{#each Object.entries(data.pairCountDistribution) as [range, count]}
					{@const maxCount = Math.max(...Object.values(data.pairCountDistribution))}
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium">{range}회</span>
						<div class="flex items-center">
							<span class="text-sm text-gray-600 mr-2 w-12 text-right">{count}</span>
							<div class="w-32 bg-gray-200 rounded-full h-2">
								<div 
									class="bg-blue-500 h-2 rounded-full" 
									style="width: {maxCount > 0 ? (count / maxCount) * 100 : 0}%"
								></div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<div class="bg-white rounded-lg shadow-md p-6">
			<h3 class="text-lg font-semibold mb-4">가장 활발한 번호 (동반 출현 기준)</h3>
			<div class="space-y-2">
				{#each data.topNumbersByPairCount as [number, totalPairCount], index}
					<div class="flex items-center justify-between">
						<div class="flex items-center">
							<span class="text-sm text-gray-500 mr-2 w-6">{index + 1}.</span>
							<span class="lotto-ball {getNumberColorClass(number)}">{number}</span>
						</div>
						<span class="text-sm text-gray-600">{totalPairCount}회</span>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- 번호 쌍 상세 통계 -->
	<div class="bg-white rounded-lg shadow-md overflow-hidden">
		<div class="px-6 py-4 bg-gray-50 border-b">
			<h2 class="text-xl font-semibold text-gray-900">번호 쌍 상세 통계</h2>
			<p class="text-sm text-gray-600 mt-1">동반 출현 횟수별로 정렬된 번호 쌍 목록</p>
		</div>
		
		<div class="overflow-x-auto">
			<table class="w-full">
				<thead class="bg-gray-50">
					<tr class="text-left">
						<th class="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">순위</th>
						<th class="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">번호 쌍</th>
						<th class="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">동반 출현</th>
						<th class="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">등급</th>
						<th class="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">출현율</th>
					</tr>
				</thead>
				<tbody class="bg-white divide-y divide-gray-200">
					{#each data.pairStats as stat, index}
						{@const statRecord = stat as { id: number; number_a: number; number_b: number; pair_count: number }}
						{@const grade = getPairGrade(statRecord.pair_count)}
						{@const rank = (data.currentPage - 1) * 50 + index + 1}
						<tr class="hover:bg-gray-50">
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="text-sm font-medium text-gray-900">
									{#if rank <= 3}
										<span class="inline-flex items-center justify-center w-6 h-6 rounded-full {rank === 1 ? 'bg-yellow-400' : rank === 2 ? 'bg-gray-400' : 'bg-amber-600'} text-white text-xs font-bold">
											{rank}
										</span>
									{:else}
										{rank}
									{/if}
								</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="flex items-center space-x-2">
									<span class="lotto-ball {getNumberColorClass(statRecord.number_a)}">
										{statRecord.number_a}
									</span>
									<span class="text-gray-400">+</span>
									<span class="lotto-ball {getNumberColorClass(statRecord.number_b)}">
										{statRecord.number_b}
									</span>
								</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="text-sm font-medium text-gray-900">{statRecord.pair_count}회</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<span class="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold {grade.class}">
									{grade.grade}
								</span>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="text-sm text-gray-600">
									{data.totalPairs > 0 ? ((statRecord.pair_count / data.maxPairCount) * 100).toFixed(1) : '0.0'}%
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- 분석 가이드 -->
	<div class="mt-8 bg-blue-50 rounded-lg p-6">
		<h3 class="text-lg font-semibold mb-4 text-blue-900">👥 번호 쌍 분석 가이드</h3>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
			<div>
				<h4 class="font-semibold mb-2">동반 출현 등급</h4>
				<ul class="space-y-1 text-gray-700">
					<li>• <span class="inline-block w-4 h-4 bg-red-500 text-white text-xs text-center rounded mr-1">S</span><strong>S등급</strong>: 25회 이상 (매우 높음)</li>
					<li>• <span class="inline-block w-4 h-4 bg-orange-500 text-white text-xs text-center rounded mr-1">A</span><strong>A등급</strong>: 20-24회 (높음)</li>
					<li>• <span class="inline-block w-4 h-4 bg-yellow-500 text-white text-xs text-center rounded mr-1">B</span><strong>B등급</strong>: 15-19회 (보통)</li>
					<li>• <span class="inline-block w-4 h-4 bg-green-500 text-white text-xs text-center rounded mr-1">C</span><strong>C등급</strong>: 10-14회 (낮음)</li>
					<li>• <span class="inline-block w-4 h-4 bg-blue-500 text-white text-xs text-center rounded mr-1">D</span><strong>D등급</strong>: 5-9회 (매우 낮음)</li>
				</ul>
			</div>
			<div>
				<h4 class="font-semibold mb-2">번호 쌍 활용법</h4>
				<ul class="space-y-1 text-gray-700">
					<li>• 상위 등급 번호 쌍은 함께 선택 고려</li>
					<li>• 동반 출현이 낮은 쌍도 미래에 나올 가능성 존재</li>
					<li>• 연속 번호보다 간격이 있는 번호 쌍이 더 자주 출현</li>
					<li>• 한 번호가 여러 번호와 자주 동반 출현할 수 있음</li>
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
