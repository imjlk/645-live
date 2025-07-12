<script lang="ts">
import { page } from "$app/stores";
import LinkButton from "$lib/ui/LinkButton.svelte";
import { onMount } from "svelte";
import type { PageData } from "./$types";

export let data: PageData;

// URL 상태 관리
$: currentPage = Number($page.url.searchParams.get("page") || "1");
$: selectedRounds = Number($page.url.searchParams.get("rounds") || "500");

// 색상 정보 매핑
const colorInfo = {
	yellow: {
		name: "노랑",
		description: "1-10번",
		bgClass: "bg-yellow-400",
		textClass: "text-yellow-600",
		numbers: "1, 2, 3, 4, 5, 6, 7, 8, 9, 10",
	},
	blue: {
		name: "파랑",
		description: "11-20번",
		bgClass: "bg-blue-400",
		textClass: "text-blue-600",
		numbers: "11, 12, 13, 14, 15, 16, 17, 18, 19, 20",
	},
	red: {
		name: "빨강",
		description: "21-30번",
		bgClass: "bg-red-400",
		textClass: "text-red-600",
		numbers: "21, 22, 23, 24, 25, 26, 27, 28, 29, 30",
	},
	grey: {
		name: "회색",
		description: "31-40번",
		bgClass: "bg-gray-400",
		textClass: "text-gray-600",
		numbers: "31, 32, 33, 34, 35, 36, 37, 38, 39, 40",
	},
	green: {
		name: "초록",
		description: "41-45번",
		bgClass: "bg-green-400",
		textClass: "text-green-600",
		numbers: "41, 42, 43, 44, 45",
	},
};

// 회차 선택 옵션
const roundOptions = [100, 200, 500, 1000];

// 페이지네이션 함수
const createPageUrl = (newPage: number) => {
	const url = new URL($page.url);
	url.searchParams.set("page", String(newPage));
	return url.toString();
};

const createRoundsUrl = (newRounds: number) => {
	const url = new URL($page.url);
	url.searchParams.set("rounds", String(newRounds));
	url.searchParams.delete("page");
	return url.toString();
};

// 색상별 출현 빈도 분석
const getFrequencyAnalysis = (colorKey: string, average: string): string => {
	const avg = Number.parseFloat(average);
	if (colorKey === "green") {
		// 초록은 5개 번호만 있으므로 기준이 다름
		if (avg >= 1.2) return "높음";
		if (avg >= 0.8) return "보통";
		return "낮음";
	}
	// 다른 색상들은 10개 번호
	if (avg >= 2.5) return "높음";
	if (avg >= 1.5) return "보통";
	return "낮음";
};

// JSON-LD 스키마 생성
const generateJsonLd = () => {
	return {
		"@context": "https://schema.org",
		"@type": "AnalysisNewsArticle",
		headline: "로또 6/45 색상 분석 통계",
		description:
			"로또 6/45 당첨번호의 색상별 분포와 패턴을 분석합니다. 번호 구간별 색상(노랑, 파랑, 빨강, 회색, 초록) 조합과 출현 빈도를 제공합니다.",
		url: "https://645.live/stats/colors",
		datePublished: new Date().toISOString(),
		dateModified: new Date().toISOString(),
		author: {
			"@type": "Organization",
			name: "645.live",
		},
		publisher: {
			"@type": "Organization",
			name: "645.live",
			url: "https://645.live",
		},
		keywords: [
			"로또",
			"색상분석",
			"번호구간",
			"로또통계",
			"색상패턴",
			"로또색깔",
		],
		mainEntity: {
			"@type": "Dataset",
			name: "로또 6/45 색상별 통계",
			description: "로또 6/45 당첨번호의 색상별 분포 및 조합 패턴 데이터",
		},
	};
};

onMount(() => {
	const script = document.createElement("script");
	script.type = "application/ld+json";
	script.textContent = JSON.stringify(generateJsonLd());
	document.head.appendChild(script);

	return () => {
		if (document.head.contains(script)) {
			document.head.removeChild(script);
		}
	};
});
</script>

<svelte:head>
	<title>로또 6/45 색상 분석 통계 | 번호 구간별 색상 패턴 | 645.live</title>
	<meta name="description" content="로또 6/45 당첨번호의 색상별 분포와 패턴을 분석합니다. 번호 구간별 색상(노랑, 파랑, 빨강, 회색, 초록) 조합과 출현 빈도를 제공합니다." />
	<meta name="keywords" content="로또, 색상분석, 번호구간, 로또통계, 색상패턴, 로또색깔, 로또예측" />
	<link rel="canonical" href="https://645.live/stats/colors" />
	
	<!-- Open Graph -->
	<meta property="og:title" content="로또 6/45 색상 분석 통계 | 645.live" />
	<meta property="og:description" content="로또 6/45 당첨번호의 색상별 분포와 패턴을 분석합니다." />
	<meta property="og:url" content="https://645.live/stats/colors" />
	<meta property="og:type" content="article" />
	
	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="로또 6/45 색상 분석 통계" />
	<meta name="twitter:description" content="로또 6/45 당첨번호의 색상별 분포와 패턴을 분석합니다." />
</svelte:head>

<div class="p-6 space-y-6">
	<!-- 페이지 헤더 -->
	<div class="text-center space-y-2">
		<h1 class="text-3xl font-bold text-primary">색상 분석 통계</h1>
		<p class="text-base-content/70">
			로또 6/45 당첨번호의 색상별 분포를 분석합니다.<br />
			각 번호 구간별(1-10: 노랑, 11-20: 파랑, 21-30: 빨강, 31-40: 회색, 41-45: 초록) 출현 패턴을 확인하세요.
		</p>
	</div>

	<!-- 회차 선택 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-4">
			<h2 class="card-title text-lg">분석 회차 선택</h2>
			<div class="flex flex-wrap gap-2">
				{#each roundOptions as rounds}
					<LinkButton
						href={createRoundsUrl(rounds)}
						class="btn-sm {selectedRounds === rounds ? 'btn-primary' : 'btn-outline'}"
					>
						최근 {rounds}회차
					</LinkButton>
				{/each}
			</div>
			<p class="text-sm text-base-content/60">
				현재 최근 <span class="font-semibold text-primary">{data.selectedRounds}회차</span> 데이터를 분석 중입니다.
			</p>
		</div>
	</div>

	<!-- 색상별 구간 정보 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">로또 번호 색상 구간</h2>
			<div class="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
				{#each Object.entries(colorInfo) as [colorKey, info]}
					<div class="text-center p-4 rounded-lg border border-base-300">
						<div class="w-8 h-8 {info.bgClass} rounded-full mx-auto mb-2"></div>
						<div class="font-semibold text-lg {info.textClass}">{info.name}</div>
						<div class="text-sm text-base-content/70">{info.description}</div>
						<div class="text-xs text-base-content/60 mt-1">{info.numbers}</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- 색상별 평균 출현 횟수 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">색상별 평균 출현 횟수</h2>
			<p class="text-sm text-base-content/60 mb-4">
				각 회차당 색상별로 평균 몇 개의 번호가 선택되는지 보여줍니다.
			</p>
			
			<div class="grid grid-cols-1 md:grid-cols-5 gap-4">
				{#each Object.entries(data.colorAverages) as [colorKey, average]}
					{@const info = colorInfo[colorKey as keyof typeof colorInfo]}
					{@const frequency = getFrequencyAnalysis(colorKey, average)}
					
					<div class="stat bg-base-200 rounded-lg text-center">
						<div class="flex items-center justify-center gap-2 mb-2">
							<div class="w-4 h-4 {info.bgClass} rounded-full"></div>
							<div class="stat-title text-sm">{info.name}</div>
						</div>
						<div class="stat-value text-2xl {info.textClass}">{average}</div>
						<div class="stat-desc text-xs">평균 개수</div>
						<div class="badge badge-outline mt-1">{frequency}</div>
					</div>
				{/each}
			</div>

			<!-- 색상 균형 분석 -->
			<div class="mt-6 p-4 bg-base-200 rounded-lg">
				<h3 class="font-semibold mb-2">색상 균형 분석</h3>
				<div class="text-sm space-y-2">
					<p>• <strong>이론적 기댓값:</strong> 노랑~회색(2.0개), 초록(1.0개)</p>
					<p>• <strong>균형잡힌 조합:</strong> 모든 색상 구간에서 최소 1개씩 포함</p>
					<p>• <strong>편중된 조합:</strong> 특정 색상에만 3개 이상 집중</p>
				</div>
			</div>
		</div>
	</div>

	<!-- 색상별 개수 분포 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">색상별 개수 분포</h2>
			<p class="text-sm text-base-content/60 mb-4">
				각 색상이 0개~6개 나타난 횟수를 보여줍니다.
			</p>

			{#each Object.entries(data.colorCountDistribution) as [colorKey, distribution]}
				{@const info = colorInfo[colorKey as keyof typeof colorInfo]}
				
				<div class="mb-6">
					<div class="flex items-center gap-2 mb-3">
						<div class="w-5 h-5 {info.bgClass} rounded-full"></div>
						<h3 class="font-semibold text-lg {info.textClass}">{info.name} ({info.description})</h3>
					</div>
					
					<div class="grid grid-cols-7 gap-2">
						{#each Object.entries(distribution) as [count, frequency]}
							{@const percentage = data.totalRecords > 0 ? ((frequency / data.totalRecords) * 100).toFixed(1) : "0.0"}
							
							<div class="text-center p-3 bg-base-200 rounded-lg">
								<div class="text-sm text-base-content/70">{count}개</div>
								<div class="text-lg font-bold {info.textClass}">{frequency}회</div>
								<div class="text-xs text-base-content/60">{percentage}%</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- 최근 회차별 상세 데이터 -->
	{#if data.colorStats.length > 0}
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">최근 회차별 색상 분포</h2>
			
			<div class="overflow-x-auto">
				<table class="table table-zebra w-full">
					<thead>
						<tr>
							<th>회차</th>
							<th class="text-yellow-600">노랑</th>
							<th class="text-blue-600">파랑</th>
							<th class="text-red-600">빨강</th>
							<th class="text-gray-600">회색</th>
							<th class="text-green-600">초록</th>
							<th>색상 조합</th>
						</tr>
					</thead>
					<tbody>
						{#each data.colorStats as stat}
							{@const statRecord = stat as {
								round: number;
								yellow_count: number;
								blue_count: number;
								red_count: number;
								grey_count: number;
								green_count: number;
							}}
							{@const colorCounts = [
								statRecord.yellow_count,
								statRecord.blue_count,
								statRecord.red_count,
								statRecord.grey_count,
								statRecord.green_count
							]}
							{@const hasAllColors = colorCounts.every(count => count > 0)}
							
							<tr>
								<td class="font-semibold">{statRecord.round}회</td>
								<td class="text-center">
									<span class="badge {statRecord.yellow_count > 0 ? 'badge-warning' : 'badge-ghost'}">
										{statRecord.yellow_count}
									</span>
								</td>
								<td class="text-center">
									<span class="badge {statRecord.blue_count > 0 ? 'badge-info' : 'badge-ghost'}">
										{statRecord.blue_count}
									</span>
								</td>
								<td class="text-center">
									<span class="badge {statRecord.red_count > 0 ? 'badge-error' : 'badge-ghost'}">
										{statRecord.red_count}
									</span>
								</td>
								<td class="text-center">
									<span class="badge {statRecord.grey_count > 0 ? 'badge-neutral' : 'badge-ghost'}">
										{statRecord.grey_count}
									</span>
								</td>
								<td class="text-center">
									<span class="badge {statRecord.green_count > 0 ? 'badge-success' : 'badge-ghost'}">
										{statRecord.green_count}
									</span>
								</td>
								<td>
									{#if hasAllColors}
										<span class="badge badge-success">완전 분산</span>
									{:else if colorCounts.filter(c => c > 0).length >= 4}
										<span class="badge badge-info">균형</span>
									{:else if colorCounts.filter(c => c > 0).length >= 3}
										<span class="badge badge-warning">부분 편중</span>
									{:else}
										<span class="badge badge-error">심한 편중</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
	{/if}

	<!-- 페이지네이션 -->
	{#if data.totalPages > 1}
	<div class="flex justify-center">
		<div class="join">
			{#if currentPage > 1}
				<LinkButton href={createPageUrl(currentPage - 1)} class="join-item btn-outline">
					이전
				</LinkButton>
			{/if}
			
			{#each Array.from({length: Math.min(5, data.totalPages)}, (_, i) => {
				const start = Math.max(1, currentPage - 2);
				const end = Math.min(data.totalPages, start + 4);
				return start + i;
			}).filter(page => page <= data.totalPages) as pageNum}
				<LinkButton 
					href={createPageUrl(pageNum)} 
					class="join-item {pageNum === currentPage ? 'btn-primary' : 'btn-outline'}"
				>
					{pageNum}
				</LinkButton>
			{/each}
			
			{#if currentPage < data.totalPages}
				<LinkButton href={createPageUrl(currentPage + 1)} class="join-item btn-outline">
					다음
				</LinkButton>
			{/if}
		</div>
	</div>
	{/if}

	<!-- 색상 분석 가이드 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">색상 분석 가이드</h2>
			<div class="space-y-3 text-sm">
				<p>
					로또 번호는 1-45 범위에서 5개 색상 구간으로 나뉩니다. 색상 분포를 통해 번호 선택의 균형을 확인할 수 있습니다.
				</p>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<h4 class="font-semibold text-primary mb-2">균형잡힌 조합</h4>
						<ul class="list-disc list-inside space-y-1 text-base-content/70">
							<li>모든 색상에서 최소 1개씩 선택</li>
							<li>특정 색상에 3개 이상 집중되지 않음</li>
							<li>초록색(41-45)은 1-2개가 일반적</li>
						</ul>
					</div>
					<div>
						<h4 class="font-semibold text-secondary mb-2">편중된 조합</h4>
						<ul class="list-disc list-inside space-y-1 text-base-content/70">
							<li>특정 색상에만 4개 이상 집중</li>
							<li>2-3개 색상에서만 선택</li>
							<li>초록색이 3개 이상 (매우 드문 경우)</li>
						</ul>
					</div>
				</div>
				<div class="mt-4 p-3 bg-info/10 rounded-lg">
					<p class="text-info font-medium">
						💡 팁: 대부분의 당첨번호는 4-5개 색상 구간에 분산되어 나타나며, 
						한 색상에만 집중되는 경우는 매우 드뭅니다.
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
