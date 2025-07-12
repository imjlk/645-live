<script lang="ts">
import { onMount } from "svelte";
import type { PageData } from "./$types";

export let data: PageData;

// JSON-LD 스키마
const generateJsonLd = () => {
	return {
		"@context": "https://schema.org",
		"@type": "Dataset",
		name: "로또 6/45 번호별 출현 통계",
		description:
			"로또 6/45 각 번호의 출현 빈도, 색깔별 분포, 구간별 분석 데이터",
		url: "https://645.live/stats/numbers",
		keywords: ["로또번호통계", "로또번호분석", "로또출현빈도", "로또색깔분석"],
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

// 색깔별 CSS 클래스 매핑
const getColorClass = (color: string) => {
	const colorMap: Record<string, string> = {
		yellow: "bg-yellow-500",
		blue: "bg-blue-500",
		red: "bg-red-500",
		grey: "bg-gray-500",
		green: "bg-green-500",
	};
	return colorMap[color] || "bg-gray-400";
};

// 편차에 따른 색깔 클래스
const getDeviationClass = (deviation: string) => {
	const dev = Number.parseFloat(deviation);
	if (dev > 10) return "text-red-600 font-bold";
	if (dev > 5) return "text-orange-600";
	if (dev < -10) return "text-blue-600 font-bold";
	if (dev < -5) return "text-blue-500";
	return "text-gray-600";
};
</script>

<svelte:head>
	<title>로또 6/45 번호별 출현 통계 | 645.live</title>
	<meta name="description" content="로또 6/45 각 번호의 출현 빈도, 색깔별 분포, 구간별 분석 데이터를 제공합니다. 1번부터 45번까지 모든 번호의 상세 통계를 확인하세요." />
	<meta name="keywords" content="로또번호통계, 로또번호분석, 로또출현빈도, 로또색깔분석" />
	<meta property="og:title" content="로또 6/45 번호별 출현 통계" />
	<meta property="og:description" content="로또 6/45 각 번호의 출현 빈도와 상세 분석" />
	<link rel="canonical" href="https://645.live/stats/numbers" />
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="mb-6">
		<nav class="text-sm text-gray-600 mb-4">
			<a href="/stats" class="hover:text-blue-600">통계 홈</a>
			<span class="mx-2">›</span>
			<span class="text-gray-900">번호별 통계</span>
		</nav>
		
		<h1 class="text-3xl font-bold text-gray-900 mb-2">번호별 출현 통계</h1>
		<p class="text-gray-600">
			총 <span class="font-semibold text-blue-600">{data.totalRounds}</span>회차 데이터 분석
			(최신: {data.latestRound}회차)
		</p>
	</div>

	<!-- 통계 요약 -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
		<div class="bg-white rounded-lg shadow-md p-6 text-center">
			<div class="text-2xl font-bold text-blue-600">45</div>
			<div class="text-sm text-gray-600">전체 번호</div>
		</div>
		<div class="bg-white rounded-lg shadow-md p-6 text-center">
			<div class="text-2xl font-bold text-green-600">
				{Math.round(data.totalRounds * 6 / 45)}
			</div>
			<div class="text-sm text-gray-600">평균 출현 횟수</div>
		</div>
		<div class="bg-white rounded-lg shadow-md p-6 text-center">
			<div class="text-2xl font-bold text-orange-600">
				{Math.max(...data.numberStats.map(s => s.draw_count))}
			</div>
			<div class="text-sm text-gray-600">최다 출현</div>
		</div>
		<div class="bg-white rounded-lg shadow-md p-6 text-center">
			<div class="text-2xl font-bold text-red-600">
				{Math.min(...data.numberStats.map(s => s.draw_count))}
			</div>
			<div class="text-sm text-gray-600">최소 출현</div>
		</div>
	</div>

	<!-- 번호별 상세 통계 테이블 -->
	<div class="bg-white rounded-lg shadow-md overflow-hidden">
		<div class="px-6 py-4 bg-gray-50 border-b">
			<h2 class="text-xl font-semibold text-gray-900">상세 통계</h2>
		</div>
		
		<div class="overflow-x-auto">
			<table class="w-full">
				<thead class="bg-gray-50">
					<tr class="text-left">
						<th class="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">번호</th>
						<th class="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">색깔</th>
						<th class="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">구간</th>
						<th class="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">출현 횟수</th>
						<th class="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">보너스 횟수</th>
						<th class="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">출현률</th>
						<th class="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">편차</th>
						<th class="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">마지막 출현</th>
					</tr>
				</thead>
				<tbody class="bg-white divide-y divide-gray-200">
					{#each data.numberStats as stat, index}
						<tr class="hover:bg-gray-50">
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="flex items-center">
									<div class="lotto-ball {getColorClass(stat.color)}">
										{stat.number}
									</div>
								</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getColorClass(stat.color)} text-white">
									{stat.color}
								</span>
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
								{stat.section}구간 
								<span class="text-xs text-gray-500">
									({(stat.section - 1) * 10 + 1}-{Math.min(stat.section * 10, 45)})
								</span>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="text-sm font-medium text-gray-900">{stat.draw_count}</div>
								<div class="text-xs text-gray-500">순위 {index + 1}</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
								{stat.bonus_count}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
								{stat.average_frequency}%
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm {getDeviationClass(stat.deviation)}">
								{Number(stat.deviation) > 0 ? '+' : ''}{stat.deviation}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
								{stat.last_draw_round ? `${stat.last_draw_round}회차` : '-'}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- 분석 가이드 -->
	<div class="mt-8 bg-blue-50 rounded-lg p-6">
		<h3 class="text-lg font-semibold mb-4 text-blue-900">📊 분석 가이드</h3>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
			<div>
				<h4 class="font-semibold mb-2">통계 해석</h4>
				<ul class="space-y-1 text-gray-700">
					<li>• <strong>출현률</strong>: 해당 번호가 전체 회차에서 출현한 비율</li>
					<li>• <strong>편차</strong>: 기댓값 대비 실제 출현 횟수 차이</li>
					<li>• <strong>양의 편차</strong>: 평균보다 많이 출현한 번호</li>
					<li>• <strong>음의 편차</strong>: 평균보다 적게 출현한 번호</li>
				</ul>
			</div>
			<div>
				<h4 class="font-semibold mb-2">색깔별 분포</h4>
				<ul class="space-y-1 text-gray-700">
					<li>• <span class="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-1"></span>노랑: 1, 6, 11, 16, 21, 26, 31, 36, 41</li>
					<li>• <span class="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1"></span>파랑: 2, 7, 12, 17, 22, 27, 32, 37, 42</li>
					<li>• <span class="inline-block w-3 h-3 rounded-full bg-red-500 mr-1"></span>빨강: 3, 8, 13, 18, 23, 28, 33, 38, 43</li>
					<li>• <span class="inline-block w-3 h-3 rounded-full bg-gray-500 mr-1"></span>회색: 4, 9, 14, 19, 24, 29, 34, 39, 44</li>
					<li>• <span class="inline-block w-3 h-3 rounded-full bg-green-500 mr-1"></span>초록: 5, 10, 15, 20, 25, 30, 35, 40, 45</li>
				</ul>
			</div>
		</div>
	</div>
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
</style>
