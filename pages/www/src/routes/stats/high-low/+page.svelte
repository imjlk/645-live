<script lang="ts">
import { page } from "$app/stores";
import LinkButton from "$lib/ui/LinkButton.svelte";
import { onMount } from "svelte";
import type { PageData } from "./$types";

export let data: PageData;

// URL 상태 관리
$: currentPage = Number($page.url.searchParams.get("page") || "1");
$: selectedRounds = Number($page.url.searchParams.get("rounds") || "500");

// 고저 균형 분석
const getHighLowBalance = (
	highCount: number,
): { type: string; description: string; color: string } => {
	if (highCount === 3) {
		return {
			type: "완벽한 균형",
			description: "고숫자와 저숫자가 3:3으로 균등",
			color: "text-success",
		};
	}
	if (highCount === 2 || highCount === 4) {
		return {
			type: "양호한 균형",
			description: "고숫자와 저숫자가 2:4 또는 4:2",
			color: "text-info",
		};
	}
	if (highCount === 1 || highCount === 5) {
		return {
			type: "불균형",
			description: "고숫자와 저숫자가 1:5 또는 5:1",
			color: "text-warning",
		};
	}
	return {
		type: "극도 불균형",
		description: "모두 고숫자 또는 모두 저숫자",
		color: "text-error",
	};
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

// JSON-LD 스키마 생성
const generateJsonLd = () => {
	return {
		"@context": "https://schema.org",
		"@type": "AnalysisNewsArticle",
		headline: "로또 6/45 고저 분석 통계",
		description:
			"로또 6/45 당첨번호의 고숫자(23-45)와 저숫자(1-22) 분포를 분석합니다. 고저 균형도와 패턴을 통해 번호 선택에 도움을 제공합니다.",
		url: "https://645.live/stats/high-low",
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
		keywords: ["로또", "고저분석", "고숫자", "저숫자", "로또통계", "균형분석"],
		mainEntity: {
			"@type": "Dataset",
			name: "로또 6/45 고저 분석 데이터",
			description: "로또 6/45 당첨번호의 고저 분포 및 균형 분석 데이터",
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
	<title>로또 6/45 고저 분석 통계 | 고숫자/저숫자 분포 패턴 | 645.live</title>
	<meta name="description" content="로또 6/45 당첨번호의 고숫자(23-45)와 저숫자(1-22) 분포를 분석합니다. 고저 균형도와 패턴을 통해 번호 선택에 도움을 제공합니다." />
	<meta name="keywords" content="로또, 고저분석, 고숫자, 저숫자, 로또통계, 균형분석, 로또예측" />
	<link rel="canonical" href="https://645.live/stats/high-low" />
	
	<!-- Open Graph -->
	<meta property="og:title" content="로또 6/45 고저 분석 통계 | 645.live" />
	<meta property="og:description" content="로또 6/45 당첨번호의 고숫자(23-45)와 저숫자(1-22) 분포를 분석합니다." />
	<meta property="og:url" content="https://645.live/stats/high-low" />
	<meta property="og:type" content="article" />
	
	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="로또 6/45 고저 분석 통계" />
	<meta name="twitter:description" content="로또 6/45 당첨번호의 고숫자(23-45)와 저숫자(1-22) 분포를 분석합니다." />
</svelte:head>

<div class="p-6 space-y-6">
	<!-- 페이지 헤더 -->
	<div class="text-center space-y-2">
		<h1 class="text-3xl font-bold text-primary">고저 분석 통계</h1>
		<p class="text-base-content/70">
			로또 6/45 당첨번호의 고숫자(23-45)와 저숫자(1-22) 분포를 분석합니다.<br />
			균형잡힌 고저 조합이 가장 일반적인 패턴입니다.
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

	<!-- 고저 구분 설명 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">고저 구분 기준</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
				<div class="text-center p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
					<div class="text-3xl font-bold text-blue-600 mb-2">저숫자</div>
					<div class="text-lg font-semibold text-blue-700 dark:text-blue-300">1 ~ 22</div>
					<div class="text-sm text-blue-600 dark:text-blue-400 mt-2">22개 번호</div>
					<div class="mt-3 text-xs text-blue-500 dark:text-blue-400">
						1, 2, 3, ..., 20, 21, 22
					</div>
				</div>
				<div class="text-center p-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
					<div class="text-3xl font-bold text-red-600 mb-2">고숫자</div>
					<div class="text-lg font-semibold text-red-700 dark:text-red-300">23 ~ 45</div>
					<div class="text-sm text-red-600 dark:text-red-400 mt-2">23개 번호</div>
					<div class="mt-3 text-xs text-red-500 dark:text-red-400">
						23, 24, 25, ..., 43, 44, 45
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- 요약 통계 -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="stat bg-primary text-primary-content rounded-lg">
			<div class="stat-title text-primary-content/70">평균 고숫자</div>
			<div class="stat-value text-2xl">{data.averageHighCount || "0.0"}</div>
			<div class="stat-desc text-primary-content/70">최근 {data.totalRounds || 0}회차</div>
		</div>
		
		<div class="stat bg-secondary text-secondary-content rounded-lg">
			<div class="stat-title text-secondary-content/70">평균 저숫자</div>
			<div class="stat-value text-2xl">{data.averageLowCount || "0.0"}</div>
			<div class="stat-desc text-secondary-content/70">최근 {data.totalRounds || 0}회차</div>
		</div>
		
		<div class="stat bg-accent text-accent-content rounded-lg">
			<div class="stat-title text-accent-content/70">균형 비율</div>
			<div class="stat-value text-2xl">{data.patternStats ? ((data.patternStats.balanced / data.totalRounds) * 100).toFixed(1) : "0.0"}%</div>
			<div class="stat-desc text-accent-content/70">3:3 균형</div>
		</div>
		
		<div class="stat bg-info text-info-content rounded-lg">
			<div class="stat-title text-info-content/70">극단 비율</div>
			<div class="stat-value text-2xl">{data.patternStats ? ((data.patternStats.extreme / data.totalRounds) * 100).toFixed(1) : "0.0"}%</div>
			<div class="stat-desc text-info-content/70">0:6 또는 6:0</div>
		</div>
	</div>

	<!-- 고숫자 개수별 분포 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">고숫자 개수별 분포</h2>
			<p class="text-sm text-base-content/60 mb-4">
				6개 번호 중 고숫자(23-45)의 개수에 따른 분포를 나타냅니다.
			</p>
			
			<div class="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
				{#each Object.entries(data.highLowDistribution || {}) as [highCount, count]}
					{@const percentage = data.totalRounds > 0 ? (((count as number) / data.totalRounds) * 100).toFixed(1) : "0.0"}
					{@const balance = getHighLowBalance(Number(highCount))}
					
					<div class="text-center space-y-2 p-4 bg-base-200 rounded-lg">
						<div class="text-xs text-base-content/70">고숫자</div>
						<div class="text-2xl font-bold text-red-600">{highCount}개</div>
						<div class="text-xs text-base-content/70">저숫자</div>
						<div class="text-lg font-bold text-blue-600">{6 - Number(highCount)}개</div>
						<div class="text-sm font-semibold">{count}회</div>
						<div class="text-xs text-base-content/60">{percentage}%</div>
						<div class="text-xs badge badge-outline {balance.color.replace('text-', 'badge-')}">
							{balance.type}
						</div>
					</div>
				{/each}
			</div>

			<!-- 고저 균형 분석 -->
			<div class="mt-6 p-4 bg-base-200 rounded-lg">
				<h3 class="font-semibold mb-3">고저 균형도 분석</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
					{#each Object.entries(data.highLowDistribution || {}) as [highCount, count]}
						{@const percentage = data.totalRounds > 0 ? (((count as number) / data.totalRounds) * 100).toFixed(1) : "0.0"}
						{@const balance = getHighLowBalance(Number(highCount))}
						{@const lowCount = 6 - Number(highCount)}
						
						<div class="flex justify-between items-center">
							<span class="font-medium">고{highCount}:저{lowCount}:</span>
							<div class="text-right">
								<span class="font-bold {balance.color}">{percentage}%</span>
								<div class="text-xs text-base-content/60">{balance.description}</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<!-- 최근 회차별 상세 데이터 -->
	{#if data.highLowStats && data.highLowStats.length > 0}
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">최근 회차별 고저 데이터</h2>
			
			<div class="overflow-x-auto">
				<table class="table table-zebra w-full">
					<thead>
						<tr>
							<th>회차</th>
							<th class="text-red-600">고숫자</th>
							<th class="text-blue-600">저숫자</th>
							<th>비율</th>
							<th>균형도</th>
						</tr>
					</thead>
					<tbody>
						{#each data.highLowStats.slice(0, 20) as stat}
							{@const statRecord = stat as { round: number; high_count: number; low_count: number }}
							{@const balance = getHighLowBalance(statRecord.high_count)}
							<tr>
								<td class="font-semibold">{statRecord.round}회</td>
								<td class="text-center">
									<span class="badge badge-error text-white">
										{statRecord.high_count}개
									</span>
								</td>
								<td class="text-center">
									<span class="badge badge-info text-white">
										{statRecord.low_count}개
									</span>
								</td>
								<td class="font-medium text-center">
									{statRecord.high_count}:{statRecord.low_count}
								</td>
								<td>
									<div class="badge {balance.color.replace('text-', 'badge-')}">
										{balance.type}
									</div>
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

	<!-- 고저 분석 가이드 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">고저 분석 가이드</h2>
			<div class="space-y-3 text-sm">
				<p>
					고숫자와 저숫자의 분포는 번호 선택 시 중요한 균형 지표입니다.
				</p>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<h4 class="font-semibold text-primary mb-2">균형잡힌 조합</h4>
						<ul class="list-disc list-inside space-y-1 text-base-content/70">
							<li><strong>3:3 균형:</strong> 가장 이상적인 분포</li>
							<li><strong>2:4 또는 4:2:</strong> 일반적으로 나타나는 분포</li>
							<li><strong>고저 골고루:</strong> 번호가 전 범위에 분산</li>
						</ul>
					</div>
					<div>
						<h4 class="font-semibold text-secondary mb-2">편중된 조합</h4>
						<ul class="list-disc list-inside space-y-1 text-base-content/70">
							<li><strong>1:5 또는 5:1:</strong> 한쪽으로 편중</li>
							<li><strong>0:6 또는 6:0:</strong> 극단적 편중 (매우 드뭄)</li>
							<li><strong>특정 구간 집중:</strong> 불균형한 분포</li>
						</ul>
					</div>
				</div>
				<div class="mt-4 p-3 bg-info/10 rounded-lg">
					<p class="text-info font-medium">
						💡 팁: 대부분의 당첨번호는 고숫자 2-4개 범위에서 나타나며, 
						완전히 한쪽으로만 편중되는 경우는 매우 드뭅니다.
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
