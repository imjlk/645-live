<script lang="ts">
import { page } from "$app/state";
import LinkButton from "$lib/ui/LinkButton.svelte";
import type { PageData } from "./$types";

export let data: PageData;

// 사용자 입력 상태
let inputValue = String(data.selectedRounds);

// 입력값 유효성 검사
const validateInput = (value: string): boolean => {
	const num = Number(value);
	return !Number.isNaN(num) && num > 0 && num <= data.totalRounds;
};

// 분석 페이지로 이동
const navigateToAnalysis = () => {
	if (validateInput(inputValue)) {
		const rounds = Number(inputValue);
		window.location.href = `/stats/high-low/${rounds}`;
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
	([, a], [, b]) => b - a,
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

<svelte:head>
	<title>{data.pageTitle} - 로또 6/45 통계</title>
	<meta name="description" content={`로또 6/45 고저 구간별 통계 분석 (최근 ${data.selectedRounds}회차)`} />
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-6xl">
	<!-- 페이지 헤더 -->
	<div class="mb-8">
		<nav class="text-sm breadcrumbs mb-4" aria-label="페이지 경로">
			<ul class="flex items-center space-x-2 text-gray-600">
				<li><a href="/" class="hover:text-blue-600">홈</a></li>
				<li class="before:content-['/'] before:mx-2">
					<a href="/stats" class="hover:text-blue-600">통계</a>
				</li>
				<li class="before:content-['/'] before:mx-2">
					<a href="/stats/high-low" class="hover:text-blue-600">고저</a>
				</li>
				<li class="before:content-['/'] before:mx-2 font-medium text-gray-900">
					최근 {data.selectedRounds}회차
				</li>
			</ul>
		</nav>

		<h1 class="text-3xl font-bold mb-4">고저 통계</h1>
		<p class="text-gray-600 text-lg mb-6">
			최근 <span class="font-semibold text-blue-600">{data.selectedRounds}회차</span>의 고저 구간별 분포와 패턴을 분석합니다.
		</p>

		<!-- 회차 선택 -->
		<div class="bg-white rounded-lg border p-6 mb-6">
			<h3 class="text-lg font-semibold mb-4">분석 회차 선택</h3>
			<div class="flex items-center gap-4 flex-wrap">
				<div class="flex items-center gap-2">
					<label for="rounds-input" class="text-sm font-medium">회차 수:</label>
					<input
						id="rounds-input"
						type="number"
						min="1"
						max={data.totalRounds}
						bind:value={inputValue}
						on:keydown={handleKeydown}
						class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-24 text-center"
						placeholder="100"
					/>
					<span class="text-sm text-gray-500">/ {data.totalRounds}</span>
				</div>
				<button
					type="button"
					on:click={navigateToAnalysis}
					class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
				>
					분석하기
				</button>
				<LinkButton
					href="/stats/high-low"
					variant="secondary"
					size="md"
				>
					전체 회차 보기
				</LinkButton>
			</div>
		</div>
	</div>

	<!-- 고저 균형 요약 -->
	<div class="bg-white rounded-lg border p-6 mb-8">
		<h2 class="text-xl font-bold mb-4">고저 균형 요약</h2>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- 저 (1-22) -->
			<div class="p-4 bg-blue-50 rounded-lg">
				<div class="flex items-center justify-between mb-2">
					<h3 class="text-lg font-semibold text-blue-800">저 (1-22)</h3>
					<div class="text-2xl font-bold text-blue-600">{data.highLowStats.summary.lowCount}</div>
				</div>
				<div class="text-sm text-blue-700 mb-3">{lowPercentage}%</div>
				<div class="w-full bg-blue-200 rounded-full h-3">
					<div
						class="bg-blue-600 h-3 rounded-full transition-all duration-300"
						style="width: {lowPercentage}%"
					></div>
				</div>
			</div>

			<!-- 고 (23-45) -->
			<div class="p-4 bg-red-50 rounded-lg">
				<div class="flex items-center justify-between mb-2">
					<h3 class="text-lg font-semibold text-red-800">고 (23-45)</h3>
					<div class="text-2xl font-bold text-red-600">{data.highLowStats.summary.highCount}</div>
				</div>
				<div class="text-sm text-red-700 mb-3">{highPercentage}%</div>
				<div class="w-full bg-red-200 rounded-full h-3">
					<div
						class="bg-red-600 h-3 rounded-full transition-all duration-300"
						style="width: {highPercentage}%"
					></div>
				</div>
			</div>
		</div>
	</div>

	<!-- 고저 패턴 분포 -->
	<div class="bg-white rounded-lg border p-6 mb-8">
		<h2 class="text-xl font-bold mb-4">고저 패턴 분포</h2>
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each sortedPatterns as [pattern, count]}
				{@const [low, high] = pattern.split(':').map(Number)}
				<div class="p-4 rounded-lg border bg-gray-50">
					<div class="flex items-center justify-between mb-2">
						<span class="font-semibold">저 {low}개 : 고 {high}개</span>
						<span class="text-sm font-medium">{count}회</span>
					</div>
					<div class="text-xs text-gray-600 mb-2">
						{getPercentage(count, data.highLowStats.summary.totalDraws)}%
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

	<!-- 최근 추첨 결과 -->
	<div class="bg-white rounded-lg border p-6">
		<h2 class="text-xl font-bold mb-4">최근 추첨 결과</h2>
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b">
						<th class="text-left py-3 px-4 font-semibold">회차</th>
						<th class="text-center py-3 px-4 font-semibold">당첨번호</th>
						<th class="text-center py-3 px-4 font-semibold">고저 분포</th>
					</tr>
				</thead>
				<tbody>
					{#each data.highLowStats.records.slice(0, 20) as record}
						{#if record.numbers && record.numbers !== 'undefined' && record.numbers !== 'null'}
							{@const numbers = JSON.parse(record.numbers) as number[]}
						{@const lowNums = numbers.filter((n: number) => n <= 22)}
						{@const highNums = numbers.filter((n: number) => n > 22)}
						<tr class="border-b hover:bg-gray-50">
							<td class="py-3 px-4 font-medium">{record.round}회차</td>
							<td class="py-3 px-4 text-center">
								<div class="flex justify-center space-x-1">
									{#each numbers.sort((a: number, b: number) => a - b) as num}
										<span class="inline-block w-8 h-8 rounded-full {num <= 22 ? 'bg-blue-500' : 'bg-red-500'} text-white text-xs font-bold flex items-center justify-center">
											{num}
										</span>
									{/each}
								</div>
							</td>
							<td class="py-3 px-4 text-center">
								<div class="flex justify-center items-center space-x-2">
									<span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
										저 {lowNums.length}개
									</span>
									<span class="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
										고 {highNums.length}개
									</span>
								</div>
							</td>
						</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>
		
		{#if data.highLowStats.records.length > 20}
			<div class="mt-4 text-center">
				<LinkButton
					href="/stats/high-low"
					variant="secondary"
					size="md"
				>
					전체 결과 보기
				</LinkButton>
			</div>
		{/if}
	</div>

	<!-- 고저 분석 설명 -->
	<div class="bg-blue-50 rounded-lg p-6 mt-8">
		<h3 class="text-lg font-semibold mb-3 flex items-center">
			<svg class="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
				<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
			</svg>
			고저 분석이란?
		</h3>
		<div class="text-sm text-gray-700 space-y-2">
			<p>로또 번호를 저 구간(1-22)과 고 구간(23-45)으로 나누어 분석하는 방법입니다.</p>
			<div class="flex items-center space-x-4 mt-3">
				<div class="flex items-center">
					<div class="w-4 h-4 bg-blue-500 rounded mr-2"></div>
					<span class="text-sm font-medium">저 구간 (1-22)</span>
				</div>
				<div class="flex items-center">
					<div class="w-4 h-4 bg-red-500 rounded mr-2"></div>
					<span class="text-sm font-medium">고 구간 (23-45)</span>
				</div>
			</div>
			<p class="mt-3">일반적으로 저:고 = 3:3 또는 2:4, 4:2 패턴이 자주 나타나는 경향이 있습니다.</p>
		</div>
	</div>
</div>
