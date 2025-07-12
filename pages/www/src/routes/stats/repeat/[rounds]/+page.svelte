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
		window.location.href = `/stats/repeat/${rounds}`;
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

// 연속번호 패턴 정렬 (출현 빈도순)
$: sortedPatterns = Object.entries(data.repeatStats.summary.patterns)
	.sort(([, a], [, b]) => Number(b) - Number(a))
	.slice(0, 10); // 상위 10개만 표시
</script>

<svelte:head>
	<title>{data.pageTitle} - 로또 6/45 통계</title>
	<meta name="description" content={`로또 6/45 연속번호 출현 통계 분석 (최근 ${data.selectedRounds}회차)`} />
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-6xl">
	<!-- 페이지 헤더 -->
	<div class="mb-8">
		<h1 class="text-3xl font-bold mb-4">연속번호 출현 통계</h1>
		<p class="text-gray-600 text-lg mb-6">
			최근 <span class="font-semibold text-blue-600">{data.selectedRounds}회차</span>의 연속번호 출현 패턴을 분석합니다.
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
					href="/stats/repeat"
					variant="secondary"
					size="md"
				>
					전체 회차 보기
				</LinkButton>
			</div>
		</div>
	</div>

	<!-- 연속번호 출현 요약 -->
	<div class="bg-white rounded-lg border p-6 mb-8">
		<h2 class="text-xl font-bold mb-4">연속번호 출현 요약</h2>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			<div class="text-center p-4 bg-blue-50 rounded-lg">
				<div class="text-2xl font-bold text-blue-600">{data.repeatStats.summary.totalConsecutive}</div>
				<div class="text-sm text-gray-600">총 연속번호 개수</div>
			</div>
			<div class="text-center p-4 bg-green-50 rounded-lg">
				<div class="text-2xl font-bold text-green-600">
					{data.repeatStats.summary.averageConsecutive.toFixed(1)}
				</div>
				<div class="text-sm text-gray-600">평균 연속번호 개수</div>
			</div>
			<div class="text-center p-4 bg-purple-50 rounded-lg">
				<div class="text-2xl font-bold text-purple-600">{Object.keys(data.repeatStats.summary.patterns).length}</div>
				<div class="text-sm text-gray-600">다양한 패턴 수</div>
			</div>
		</div>
	</div>

	<!-- 연속번호 개수별 통계 -->
	<div class="bg-white rounded-lg border p-6 mb-8">
		<h2 class="text-xl font-bold mb-4">연속번호 개수별 출현 빈도</h2>
		<div class="space-y-4">
			{#each Object.entries(data.repeatStats.summary.patterns).sort(([a], [b]) => Number(a) - Number(b)) as [count, frequency]}
				<div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
					<div class="flex items-center">
						<span class="text-lg font-semibold text-gray-800">{count}개 연속번호</span>
						<span class="ml-2 text-sm text-gray-600">
							{#if count === '0'}
								(연속번호 없음)
							{:else if count === '2'}
								(예: 1-2, 15-16)
							{:else if count === '3'}
								(예: 10-11-12)
							{:else}
								(예: 20-21-22-23...)
							{/if}
						</span>
					</div>
					<div class="flex items-center space-x-4">
						<span class="text-lg font-bold text-blue-600">{frequency}회</span>
						<span class="text-sm text-gray-500">
							({getPercentage(Number(frequency), data.repeatStats.summary.totalDraws)}%)
						</span>
						<div class="w-32 bg-gray-200 rounded-full h-2">
							<div
								class="bg-blue-600 h-2 rounded-full transition-all duration-300"
								style="width: {getPercentage(Number(frequency), data.repeatStats.summary.totalDraws)}%"
							></div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- 연속번호 패턴 분석 -->
	<div class="bg-white rounded-lg border p-6 mb-8">
		<h2 class="text-xl font-bold mb-4">패턴별 분석 (상위 10개)</h2>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			{#each sortedPatterns as [count, frequency]}
				<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
					<div class="flex items-center">
						<span class="font-mono text-lg font-semibold text-blue-600">{count}개 연속</span>
					</div>
					<div class="flex items-center space-x-2">
						<span class="font-semibold">{frequency}회</span>
						<span class="text-sm text-gray-500">
							({getPercentage(Number(frequency), data.repeatStats.summary.totalDraws)}%)
						</span>
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
						<th class="text-center py-3 px-4 font-semibold">연속번호</th>
					</tr>
				</thead>
				<tbody>
					{#each data.repeatStats.records.slice(0, 20) as record}
						{#if record.numbers && record.numbers !== 'undefined' && record.numbers !== 'null'}
							{@const numbers = JSON.parse(record.numbers) as number[]}
						{@const sortedNumbers = numbers.sort((a: number, b: number) => a - b)}
						<tr class="border-b hover:bg-gray-50">
							<td class="py-3 px-4 font-medium">{record.round}회차</td>
							<td class="py-3 px-4 text-center">
								<div class="flex justify-center space-x-1">
									{#each sortedNumbers as num}
										<span class="flex w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold items-center justify-center">
											{num}
										</span>
									{/each}
								</div>
							</td>
							<td class="py-3 px-4 text-center">
								{#if record.consecutiveGroups && record.consecutiveGroups.length > 0}
									<div class="flex justify-center space-x-2">
										{#each record.consecutiveGroups as group}
											<span class="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-mono">
												{group.join('-')}
											</span>
										{/each}
									</div>
								{:else}
									<span class="text-gray-400">없음</span>
								{/if}
							</td>
						</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>
		
		{#if data.repeatStats.records.length > 20}
			<div class="mt-4 text-center">
				<LinkButton
					href="/stats/repeat"
					variant="secondary"
					size="md"
				>
					전체 결과 보기
				</LinkButton>
			</div>
		{/if}
	</div>

	<!-- 연속번호 설명 -->
	<div class="bg-blue-50 rounded-lg p-6 mt-8">
		<h3 class="text-lg font-semibold mb-3">연속번호란?</h3>
		<div class="text-sm text-gray-700 space-y-2">
			<p>로또 당첨번호 중에서 연속된 숫자가 나오는 패턴을 분석합니다.</p>
			<div class="bg-white p-4 rounded mt-3">
				<div class="font-medium mb-2">예시:</div>
				<ul class="list-disc list-inside space-y-1">
					<li><span class="font-mono">1, 2</span> - 2개 연속</li>
					<li><span class="font-mono">15, 16, 17</span> - 3개 연속</li>
					<li><span class="font-mono">30, 31, 32, 33</span> - 4개 연속</li>
				</ul>
			</div>
			<p class="mt-3">연속번호의 출현 패턴을 통해 번호 선택에 참고할 수 있습니다.</p>
		</div>
	</div>
</div>
