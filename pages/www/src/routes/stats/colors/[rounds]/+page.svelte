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
		window.location.href = `/stats/colors/${rounds}`;
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

// 색상별 정보
const colorInfo = {
	red: {
		name: "빨강",
		range: "1-10",
		class: "bg-red-500",
		bgClass: "bg-red-100",
		textClass: "text-red-800",
	},
	orange: {
		name: "주황",
		range: "11-20",
		class: "bg-orange-500",
		bgClass: "bg-orange-100",
		textClass: "text-orange-800",
	},
	yellow: {
		name: "노랑",
		range: "21-30",
		class: "bg-yellow-500",
		bgClass: "bg-yellow-100",
		textClass: "text-yellow-800",
	},
	blue: {
		name: "파랑",
		range: "31-40",
		class: "bg-blue-500",
		bgClass: "bg-blue-100",
		textClass: "text-blue-800",
	},
	green: {
		name: "초록",
		range: "41-45",
		class: "bg-green-500",
		bgClass: "bg-green-100",
		textClass: "text-green-800",
	},
} as const;

// 백분율 계산
const getPercentage = (count: number, total: number): string => {
	return total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
};

// 색상 패턴 정렬 (출현 빈도순)
$: sortedPatterns = Object.entries(data.colorStats.summary.distribution)
	.sort(([, a], [, b]) => Number(b) - Number(a))
	.slice(0, 10); // 상위 10개만 표시
</script>

<svelte:head>
	<title>{data.pageTitle} - 로또 6/45 통계</title>
	<meta name="description" content={`로또 6/45 색상 구간별 통계 분석 (최근 ${data.selectedRounds}회차)`} />
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-6xl">
	<!-- 페이지 헤더 -->
	<div class="mb-8">
		<h1 class="text-3xl font-bold mb-4">색상 구간 통계</h1>
		<p class="text-gray-600 text-lg mb-6">
			최근 <span class="font-semibold text-blue-600">{data.selectedRounds}회차</span>의 색상 구간별 분포와 패턴을 분석합니다.
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
					href="/stats/colors"
					variant="secondary"
					size="md"
				>
					전체 회차 보기
				</LinkButton>
			</div>
		</div>
	</div>

	<!-- 색상 구간별 통계 -->
	<div class="bg-white rounded-lg border p-6 mb-8">
		<h2 class="text-xl font-bold mb-4">색상 구간별 출현 빈도</h2>
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
			{#each Object.entries(colorInfo) as [key, info]}
				{@const count = data.colorStats.summary.colorCounts[key as keyof typeof data.colorStats.summary.colorCounts]}
				{@const totalNumbers = data.colorStats.summary.totalDraws * 6}
				<div class="p-4 rounded-lg border {info.bgClass}">
					<div class="flex items-center mb-2">
						<div class="w-4 h-4 rounded-full {info.class} mr-2"></div>
						<span class="font-semibold {info.textClass}">{info.name}</span>
					</div>
					<div class="text-xs text-gray-600 mb-2">{info.range}</div>
					<div class="text-lg font-bold {info.textClass} mb-1">{count}</div>
					<div class="text-xs {info.textClass} mb-2">
						{getPercentage(count, totalNumbers)}%
					</div>
					<div class="w-full bg-white/50 rounded-full h-2">
						<div
							class="{info.class} h-2 rounded-full transition-all duration-300"
							style="width: {getPercentage(count, totalNumbers)}%"
						></div>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- 자주 나오는 색상 패턴 -->
	<div class="bg-white rounded-lg border p-6 mb-8">
		<h2 class="text-xl font-bold mb-4">자주 나오는 색상 패턴 (상위 10개)</h2>
		<div class="space-y-3">
			{#each sortedPatterns as [pattern, count]}
				{@const colors = pattern.split('-')}
				<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
					<div class="flex items-center space-x-4">
						<div class="flex items-center space-x-1">
							{#each colors as colorCount, index}
								{@const colorKey = Object.keys(colorInfo)[index] as keyof typeof colorInfo}
								{@const info = colorInfo[colorKey]}
								<div class="flex items-center">
									<div class="w-3 h-3 rounded-full {info.class}"></div>
									<span class="text-sm font-medium ml-1">{colorCount}</span>
								</div>
							{/each}
						</div>
						<div class="text-sm text-gray-600">
							({colors.map((c, i) => `${colorInfo[Object.keys(colorInfo)[i] as keyof typeof colorInfo].name} ${c}개`).join(', ')})
						</div>
					</div>
					<div class="flex items-center space-x-2">
						<span class="font-semibold">{count}회</span>
						<span class="text-sm text-gray-500">
							({getPercentage(Number(count), data.colorStats.summary.totalDraws)}%)
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
						<th class="text-center py-3 px-4 font-semibold">색상 분포</th>
					</tr>
				</thead>
				<tbody>
					{#each data.colorStats.records.slice(0, 20) as record}
						{#if record.numbers && record.numbers !== 'undefined' && record.numbers !== 'null'}
							{@const numbers = JSON.parse(record.numbers) as number[]}
							{@const colorCounts = numbers.reduce((acc: {red: number, orange: number, yellow: number, blue: number, green: number}, num: number) => {
							if (num >= 1 && num <= 10) acc.red++;
							else if (num >= 11 && num <= 20) acc.orange++;
							else if (num >= 21 && num <= 30) acc.yellow++;
							else if (num >= 31 && num <= 40) acc.blue++;
							else if (num >= 41 && num <= 45) acc.green++;
							return acc;
						}, { red: 0, orange: 0, yellow: 0, blue: 0, green: 0 })}
						<tr class="border-b hover:bg-gray-50">
							<td class="py-3 px-4 font-medium">{record.round}회차</td>
							<td class="py-3 px-4 text-center">
								<div class="flex justify-center space-x-1">
									{#each numbers.sort((a: number, b: number) => a - b) as num}
										{@const colorKey = num >= 1 && num <= 10 ? 'red' : 
											num >= 11 && num <= 20 ? 'orange' :
											num >= 21 && num <= 30 ? 'yellow' :
											num >= 31 && num <= 40 ? 'blue' : 'green'}
										{@const info = colorInfo[colorKey as keyof typeof colorInfo]}
										<span class="inline-block w-8 h-8 rounded-full {info.class} text-white text-xs font-bold flex items-center justify-center">
											{num}
										</span>
									{/each}
								</div>
							</td>
							<td class="py-3 px-4 text-center">
								<div class="flex justify-center items-center space-x-1">
									{#each Object.entries(colorInfo) as [key, info]}
										<div class="flex items-center">
											<div class="w-3 h-3 rounded-full {info.class}"></div>
											<span class="text-xs font-medium ml-1">{colorCounts[key as keyof typeof colorCounts]}</span>
										</div>
									{/each}
								</div>
							</td>
						</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>
		
		{#if data.colorStats.records.length > 20}
			<div class="mt-4 text-center">
				<LinkButton
					href="/stats/colors"
					variant="secondary"
					size="md"
				>
					전체 결과 보기
				</LinkButton>
			</div>
		{/if}
	</div>

	<!-- 색상 구간 설명 -->
	<div class="bg-blue-50 rounded-lg p-6 mt-8">
		<h3 class="text-lg font-semibold mb-3">색상 구간이란?</h3>
		<div class="text-sm text-gray-700 space-y-2">
			<p>로또 번호를 5개의 색상 구간으로 나누어 분석하는 방법입니다.</p>
			<div class="grid grid-cols-1 sm:grid-cols-5 gap-2 mt-3">
				{#each Object.entries(colorInfo) as [key, info]}
					<div class="flex items-center p-2 bg-white rounded">
						<div class="w-3 h-3 rounded-full {info.class} mr-2"></div>
						<span class="text-xs font-medium">{info.name} ({info.range})</span>
					</div>
				{/each}
			</div>
			<p class="mt-3">각 색상 구간에서 균등하게 번호가 선택되는 경향을 분석할 수 있습니다.</p>
		</div>
	</div>
</div>