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
		window.location.href = `/stats/ac/${rounds}`;
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

// AC값별 라벨
const getACLabel = (ac: number): string => {
	const labels = {
		0: "매우 낮음",
		1: "낮음",
		2: "약간 낮음",
		3: "보통",
		4: "약간 높음",
		5: "높음",
		6: "매우 높음",
		7: "극도로 높음",
		8: "최고",
		9: "완전히 무작위",
		10: "이론적 최대값",
		11: "거의 불가능",
		12: "이론적 최대값",
		13: "완전히 불가능",
		14: "완전히 불가능",
		15: "완전히 불가능",
	};
	return labels[ac as keyof typeof labels] || `AC값 ${ac}`;
};

// 백분율 계산
const getPercentage = (count: number, total: number): string => {
	return total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
};

// AC값별 색상 클래스
const getACColorClass = (ac: number): string => {
	if (ac <= 1) return "bg-red-100 text-red-800";
	if (ac <= 3) return "bg-orange-100 text-orange-800";
	if (ac <= 5) return "bg-yellow-100 text-yellow-800";
	if (ac <= 7) return "bg-green-100 text-green-800";
	if (ac <= 9) return "bg-blue-100 text-blue-800";
	return "bg-purple-100 text-purple-800";
};
</script>

<svelte:head>
	<title>{data.pageTitle} - 로또 6/45 통계</title>
	<meta name="description" content={`로또 6/45 AC값 통계 분석 (최근 ${data.selectedRounds}회차)`} />
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
					<a href="/stats/ac" class="hover:text-blue-600">AC값</a>
				</li>
				<li class="before:content-['/'] before:mx-2 font-medium text-gray-900">
					최근 {data.selectedRounds}회차
				</li>
			</ul>
		</nav>

		<h1 class="text-3xl font-bold mb-4">AC값 통계</h1>
		<p class="text-gray-600 text-lg mb-6">
			최근 <span class="font-semibold text-blue-600">{data.selectedRounds}회차</span>의 AC값 분포와 패턴을 분석합니다.
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
					href="/stats/ac"
					variant="secondary"
					size="md"
				>
					전체 회차 보기
				</LinkButton>
			</div>
		</div>
	</div>

	<!-- 통계 요약 -->
	<div class="bg-white rounded-lg border p-6 mb-8">
		<h2 class="text-xl font-bold mb-4">통계 요약</h2>
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
			<div class="text-center p-4 bg-gray-50 rounded-lg">
				<div class="text-2xl font-bold text-blue-600">{data.acStats.summary.totalDraws}</div>
				<div class="text-sm text-gray-600">총 추첨 회수</div>
			</div>
			<div class="text-center p-4 bg-gray-50 rounded-lg">
				<div class="text-2xl font-bold text-green-600">{data.acStats.summary.avgAC.toFixed(2)}</div>
				<div class="text-sm text-gray-600">평균 AC값</div>
			</div>
			<div class="text-center p-4 bg-gray-50 rounded-lg">
				<div class="text-2xl font-bold text-orange-600">{data.acStats.summary.minAC}</div>
				<div class="text-sm text-gray-600">최소 AC값</div>
			</div>
			<div class="text-center p-4 bg-gray-50 rounded-lg">
				<div class="text-2xl font-bold text-red-600">{data.acStats.summary.maxAC}</div>
				<div class="text-sm text-gray-600">최대 AC값</div>
			</div>
		</div>
	</div>

	<!-- AC값 분포 -->
	<div class="bg-white rounded-lg border p-6 mb-8">
		<h2 class="text-xl font-bold mb-4">AC값 분포</h2>
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
			{#each Object.entries(data.acStats.summary.distribution).sort(([a], [b]) => Number(a) - Number(b)) as [ac, count]}
				<div class="p-4 rounded-lg border {getACColorClass(Number(ac))}">
					<div class="flex justify-between items-center mb-2">
						<span class="font-semibold">AC값 {ac}</span>
						<span class="text-sm font-medium">{count}회</span>
					</div>
					<div class="text-xs mb-2">{getACLabel(Number(ac))}</div>
					<div class="w-full bg-white/30 rounded-full h-2">
						<div
							class="bg-current h-2 rounded-full transition-all duration-300"
							style="width: {getPercentage(Number(count), data.acStats.summary.totalDraws)}%"
						></div>
					</div>
					<div class="text-xs mt-1 font-medium">
						{getPercentage(Number(count), data.acStats.summary.totalDraws)}%
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
						<th class="text-center py-3 px-4 font-semibold">AC값</th>
						<th class="text-center py-3 px-4 font-semibold">평가</th>
					</tr>
				</thead>
				<tbody>
					{#each data.acStats.records.slice(0, 20) as record}
						<tr class="border-b hover:bg-gray-50">
							<td class="py-3 px-4 font-medium">{record.round}회차</td>
							<td class="py-3 px-4 text-center">
								<span class="px-2 py-1 rounded-full text-xs font-medium {getACColorClass(record.ac_value)}">
									{record.ac_value}
								</span>
							</td>
							<td class="py-3 px-4 text-center text-sm text-gray-600">
								{getACLabel(record.ac_value)}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		
		{#if data.acStats.records.length > 20}
			<div class="mt-4 text-center">
				<LinkButton
					href="/stats/ac"
					variant="secondary"
					size="md"
				>
					전체 결과 보기
				</LinkButton>
			</div>
		{/if}
	</div>

	<!-- AC값 설명 -->
	<div class="bg-blue-50 rounded-lg p-6 mt-8">
		<h3 class="text-lg font-semibold mb-3 flex items-center">
			<svg class="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
				<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
			</svg>
			AC값이란?
		</h3>
		<div class="text-sm text-gray-700 space-y-2">
			<p>AC값(Arithmetic Complexity)은 로또 번호 조합의 복잡성을 나타내는 지표입니다.</p>
			<p>번호들 간의 차이값들의 차이를 계산하여 산출되며, 0~15 사이의 값을 가집니다.</p>
			<p>일반적으로 AC값이 3~7 사이일 때 가장 자주 출현하는 경향이 있습니다.</p>
		</div>
	</div>
</div>
