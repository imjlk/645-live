<script lang="ts">
import { page } from "$app/stores";
import LinkButton from "$lib/ui/LinkButton.svelte";
import { onMount } from "svelte";
import type { PageData } from "./$types";

export let data: PageData;

// URL 상태 관리
$: currentPage = Number($page.url.searchParams.get("page") || "1");
$: selectedRounds = Number($page.url.searchParams.get("rounds") || "500");

// 구간 정보 매핑
const sectionInfo = {
	section1: {
		name: "1구간",
		range: "1-15",
		color: "text-blue-600",
		bgColor: "bg-blue-100 dark:bg-blue-900/20",
	},
	section2: {
		name: "2구간",
		range: "16-30",
		color: "text-green-600",
		bgColor: "bg-green-100 dark:bg-green-900/20",
	},
	section3: {
		name: "3구간",
		range: "31-45",
		color: "text-red-600",
		bgColor: "bg-red-100 dark:bg-red-900/20",
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

// 구간별 균형도 분석
const getSectionBalance = (s1: number, s2: number, s3: number): string => {
	if (s1 >= 2 && s2 >= 2 && s3 >= 2) return "완전 균형";
	if (s1 >= 1 && s2 >= 1 && s3 >= 1) return "균형";
	if ([s1, s2, s3].filter((s) => s === 0).length === 1) return "부분 편중";
	return "심한 편중";
};

// JSON-LD 스키마 생성
const generateJsonLd = () => {
	return {
		"@context": "https://schema.org",
		"@type": "AnalysisNewsArticle",
		headline: "로또 6/45 구간 분석 통계",
		description:
			"로또 6/45 당첨번호의 구간별(1-15, 16-30, 31-45) 분포를 분석합니다. 구간별 균형도와 패턴을 통해 번호 선택에 도움을 제공합니다.",
		url: "https://645.live/stats/sections",
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
			"구간분석",
			"번호구간",
			"로또통계",
			"구간패턴",
			"로또예측",
		],
		mainEntity: {
			"@type": "Dataset",
			name: "로또 6/45 구간별 통계",
			description: "로또 6/45 당첨번호의 구간별 분포 및 균형 분석 데이터",
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
	<title>로또 6/45 구간 분석 통계 | 번호 구간별 분포 패턴 | 645.live</title>
	<meta name="description" content="로또 6/45 당첨번호의 구간별(1-15, 16-30, 31-45) 분포를 분석합니다. 구간별 균형도와 패턴을 통해 번호 선택에 도움을 제공합니다." />
	<meta name="keywords" content="로또, 구간분석, 번호구간, 로또통계, 구간패턴, 로또예측" />
	<link rel="canonical" href="https://645.live/stats/sections" />
	
	<!-- Open Graph -->
	<meta property="og:title" content="로또 6/45 구간 분석 통계 | 645.live" />
	<meta property="og:description" content="로또 6/45 당첨번호의 구간별(1-15, 16-30, 31-45) 분포를 분석합니다." />
	<meta property="og:url" content="https://645.live/stats/sections" />
	<meta property="og:type" content="article" />
	
	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="로또 6/45 구간 분석 통계" />
	<meta name="twitter:description" content="로또 6/45 당첨번호의 구간별(1-15, 16-30, 31-45) 분포를 분석합니다." />
</svelte:head>

<div class="p-6 space-y-6">
	<!-- 페이지 헤더 -->
	<div class="text-center space-y-2">
		<h1 class="text-3xl font-bold text-primary">구간 분석 통계</h1>
		<p class="text-base-content/70">
			로또 6/45 당첨번호의 구간별(1-15, 16-30, 31-45) 분포를 분석합니다.<br />
			균형잡힌 구간 조합이 가장 일반적인 패턴입니다.
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

	<!-- 구간 설명 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">구간 분류</h2>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
				{#each Object.entries(sectionInfo) as [key, info]}
					<div class="text-center p-6 {info.bgColor} rounded-lg border">
						<div class="text-2xl font-bold {info.color} mb-2">{info.name}</div>
						<div class="text-lg font-semibold">{info.range}</div>
						<div class="text-sm text-base-content/70 mt-2">15개 번호</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- 요약 통계 -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<div class="stat bg-blue-500 text-white rounded-lg">
			<div class="stat-title text-blue-100">1구간 평균</div>
			<div class="stat-value text-2xl">{((data.sectionDistribution && 'section_1_10' in data.sectionDistribution ? data.sectionDistribution.section_1_10?.average || 0 : 0) + (data.sectionDistribution && 'section_11_20' in data.sectionDistribution ? data.sectionDistribution.section_11_20?.average || 0 : 0)).toFixed(1)}</div>
			<div class="stat-desc text-blue-200">1-20번 평균 개수</div>
		</div>
		
		<div class="stat bg-green-500 text-white rounded-lg">
			<div class="stat-title text-green-100">2구간 평균</div>
			<div class="stat-value text-2xl">{(data.sectionDistribution && 'section_21_30' in data.sectionDistribution ? data.sectionDistribution.section_21_30?.average || 0 : 0).toFixed(1)}</div>
			<div class="stat-desc text-green-200">21-30번 평균 개수</div>
		</div>
		
		<div class="stat bg-red-500 text-white rounded-lg">
			<div class="stat-title text-red-100">3구간 평균</div>
			<div class="stat-value text-2xl">{((data.sectionDistribution && 'section_31_40' in data.sectionDistribution ? data.sectionDistribution.section_31_40?.average || 0 : 0) + (data.sectionDistribution && 'section_41_45' in data.sectionDistribution ? data.sectionDistribution.section_41_45?.average || 0 : 0)).toFixed(1)}</div>
			<div class="stat-desc text-red-200">31-45번 평균 개수</div>
		</div>
	</div>

	<!-- 구간별 조합 분포 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">구간별 분포 현황</h2>
			<p class="text-sm text-base-content/60 mb-4">
				각 구간별(1-10, 11-20, 21-30, 31-40, 41-45) 번호 출현 분포를 나타냅니다.
			</p>
			
			<div class="grid grid-cols-1 md:grid-cols-5 gap-4">
				{#each Object.entries(data.sectionDistribution || {}) as [sectionKey, sectionData]}
					{@const sectionInfo = {
						section_1_10: { name: "1-10구간", color: "text-blue-600" },
						section_11_20: { name: "11-20구간", color: "text-indigo-600" },
						section_21_30: { name: "21-30구간", color: "text-green-600" },
						section_31_40: { name: "31-40구간", color: "text-orange-600" },
						section_41_45: { name: "41-45구간", color: "text-red-600" }
					}}
					{@const info = sectionInfo[sectionKey as keyof typeof sectionInfo]}
					{@const data_typed = sectionData as { average: number; total: number }}
					
					<div class="text-center p-4 bg-base-200 rounded-lg">
						<div class="font-semibold {info.color} mb-2">{info.name}</div>
						<div class="text-2xl font-bold text-primary">{(data_typed.average || 0).toFixed(1)}</div>
						<div class="text-sm text-base-content/60">평균 개수</div>
						<div class="text-xs text-base-content/50">총 {data_typed.total || 0}개</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- 최근 회차별 상세 데이터 -->
	{#if data.sectionStats && data.sectionStats.length > 0}
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">최근 회차별 구간 분포</h2>
			
			<div class="overflow-x-auto">
				<table class="table table-zebra w-full">
					<thead>
						<tr>
							<th>회차</th>
							<th class="text-blue-600">1-10</th>
							<th class="text-indigo-600">11-20</th>
							<th class="text-green-600">21-30</th>
							<th class="text-orange-600">31-40</th>
							<th class="text-red-600">41-45</th>
							<th>분포 패턴</th>
						</tr>
					</thead>
					<tbody>
						{#each data.sectionStats.slice(0, 20) as stat}
							{@const statRecord = stat as { 
								round: number; 
								section_1_10: number; 
								section_11_20: number; 
								section_21_30: number; 
								section_31_40: number; 
								section_41_45: number; 
							}}
							{@const hasAllSections = [
								statRecord.section_1_10,
								statRecord.section_11_20,
								statRecord.section_21_30,
								statRecord.section_31_40,
								statRecord.section_41_45
							].every(count => count > 0)}
							
							<tr>
								<td class="font-semibold">{statRecord.round}회</td>
								<td class="text-center">
									<span class="badge {statRecord.section_1_10 > 0 ? 'badge-info' : 'badge-ghost'}">
										{statRecord.section_1_10}
									</span>
								</td>
								<td class="text-center">
									<span class="badge {statRecord.section_11_20 > 0 ? 'badge-primary' : 'badge-ghost'}">
										{statRecord.section_11_20}
									</span>
								</td>
								<td class="text-center">
									<span class="badge {statRecord.section_21_30 > 0 ? 'badge-success' : 'badge-ghost'}">
										{statRecord.section_21_30}
									</span>
								</td>
								<td class="text-center">
									<span class="badge {statRecord.section_31_40 > 0 ? 'badge-warning' : 'badge-ghost'}">
										{statRecord.section_31_40}
									</span>
								</td>
								<td class="text-center">
									<span class="badge {statRecord.section_41_45 > 0 ? 'badge-error' : 'badge-ghost'}">
										{statRecord.section_41_45}
									</span>
								</td>
								<td>
									{#if hasAllSections}
										<span class="badge badge-success">모든 구간</span>
									{:else}
										<span class="badge badge-warning">부분 구간</span>
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

	<!-- 구간 분석 가이드 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">구간 분석 가이드</h2>
			<div class="space-y-3 text-sm">
				<p>
					구간 분석은 1-45 범위를 3개 구간으로 나누어 각 구간별 번호 분포를 분석합니다.
				</p>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<h4 class="font-semibold text-primary mb-2">균형잡힌 조합</h4>
						<ul class="list-disc list-inside space-y-1 text-base-content/70">
							<li><strong>2-2-2 조합:</strong> 완벽한 균형 분포</li>
							<li><strong>3-2-1 조합:</strong> 일반적으로 나타나는 분포</li>
							<li><strong>모든 구간 포함:</strong> 3개 구간에서 최소 1개씩</li>
						</ul>
					</div>
					<div>
						<h4 class="font-semibold text-secondary mb-2">편중된 조합</h4>
						<ul class="list-disc list-inside space-y-1 text-base-content/70">
							<li><strong>4-2-0 조합:</strong> 한 구간 누락</li>
							<li><strong>5-1-0 조합:</strong> 심한 편중</li>
							<li><strong>6-0-0 조합:</strong> 극단적 편중 (매우 드뭄)</li>
						</ul>
					</div>
				</div>
				<div class="mt-4 p-3 bg-info/10 rounded-lg">
					<p class="text-info font-medium">
						💡 팁: 대부분의 당첨번호는 3개 구간에 고르게 분산되어 나타나며, 
						한 구간에만 집중되는 경우는 상당히 드뭅니다.
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
