<script lang="ts">
import { page } from "$app/state";
import LinkButton from "$lib/ui/LinkButton.svelte";
import { onMount } from "svelte";
import type { PageData } from "./$types";

export let data: PageData;

// URL 상태 관리
$: currentPage = Number(page.url.searchParams.get("page") || "1");
$: selectedRounds = Number(page.url.searchParams.get("rounds") || "100");

// 홀수 개수별 라벨
const getOddCountLabel = (count: number): string => {
	const labels = {
		0: "모두 짝수",
		1: "홀수 1개",
		2: "홀수 2개",
		3: "홀수 3개",
		4: "홀수 4개",
		5: "홀수 5개",
		6: "모두 홀수",
	};
	return labels[count as keyof typeof labels] || `홀수 ${count}개`;
};

// 홀짝 균형도 분석
const getBalanceAnalysis = (
	count: number,
): { type: string; description: string; color: string } => {
	if (count === 3) {
		return {
			type: "완벽한 균형",
			description: "홀수와 짝수가 3:3으로 균등",
			color: "text-success",
		};
	}
	if (count === 2 || count === 4) {
		return {
			type: "양호한 균형",
			description: "홀수와 짝수가 2:4 또는 4:2",
			color: "text-info",
		};
	}
	if (count === 1 || count === 5) {
		return {
			type: "불균형",
			description: "홀수와 짝수가 1:5 또는 5:1",
			color: "text-warning",
		};
	}
	return {
		type: "극도 불균형",
		description: "모두 홀수 또는 모두 짝수",
		color: "text-error",
	};
};

// 회차 선택 옵션
const roundOptions = [50, 100, 200, 500, 1000];

// 페이지네이션 함수
const createPageUrl = (newPage: number) => {
	const url = new URL(page.url);
	url.searchParams.set("page", String(newPage));
	return url.toString();
};

const createRoundsUrl = (newRounds: number) => {
	const url = new URL(page.url);
	url.searchParams.set("rounds", String(newRounds));
	url.searchParams.delete("page");
	return url.toString();
};

// 합계 구간 분석
const getSumRangeAnalysis = (range: string): string => {
	const analyses = {
		"60-80": "매우 낮음 - 작은 번호 위주",
		"81-100": "낮음 - 상대적으로 작은 번호",
		"101-120": "보통 - 일반적인 분포",
		"121-140": "보통 - 균형잡힌 분포",
		"141-160": "보통 - 일반적인 분포",
		"161-180": "높음 - 상대적으로 큰 번호",
		"181-200": "매우 높음 - 큰 번호 위주",
		"201-220": "극도로 높음 - 매우 큰 번호",
		"221-240": "최고 - 최대 번호 조합",
	};
	return analyses[range as keyof typeof analyses] || "분석 데이터 없음";
};

// JSON-LD 스키마 생성
const generateJsonLd = () => {
	return {
		"@context": "https://schema.org",
		"@type": "AnalysisNewsArticle",
		headline: "로또 6/45 홀짝 분석 통계",
		description:
			"로또 6/45 당첨번호의 홀수/짝수 분포와 번호 합계 패턴을 분석합니다. 홀짝 균형도와 트렌드를 통해 번호 선택에 도움을 제공합니다.",
		url: "https://645.live/stats/odd-even",
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
			"홀짝분석",
			"홀수짝수",
			"로또통계",
			"번호합계",
			"로또패턴",
		],
		mainEntity: {
			"@type": "Dataset",
			name: "로또 6/45 홀짝 분석 데이터",
			description: "로또 6/45 당첨번호의 홀수/짝수 분포 및 합계 통계",
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
	<title>로또 6/45 홀짝 분석 통계 | 홀수/짝수 분포 패턴 | 645.live</title>
	<meta name="description" content="로또 6/45 당첨번호의 홀수/짝수 분포와 번호 합계 패턴을 분석합니다. 홀짝 균형도와 트렌드를 통해 번호 선택에 도움을 제공합니다." />
	<meta name="keywords" content="로또, 홀짝분석, 홀수짝수, 로또통계, 번호합계, 로또패턴, 로또예측" />
	<link rel="canonical" href="https://645.live/stats/odd-even" />
	
	<!-- Open Graph -->
	<meta property="og:title" content="로또 6/45 홀짝 분석 통계 | 645.live" />
	<meta property="og:description" content="로또 6/45 당첨번호의 홀수/짝수 분포와 번호 합계 패턴을 분석합니다." />
	<meta property="og:url" content="https://645.live/stats/odd-even" />
	<meta property="og:type" content="article" />
	
	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="로또 6/45 홀짝 분석 통계" />
	<meta name="twitter:description" content="로또 6/45 당첨번호의 홀수/짝수 분포와 번호 합계 패턴을 분석합니다." />
</svelte:head>

<div class="p-6 space-y-6">
	<!-- 페이지 헤더 -->
	<div class="text-center space-y-2">
		<h1 class="text-3xl font-bold text-primary">홀짝 분석 통계</h1>
		<p class="text-base-content/70">
			로또 6/45 당첨번호의 홀수/짝수 분포를 분석합니다.<br />
			균형잡힌 홀짝 조합이 가장 일반적인 패턴입니다.
		</p>
	</div>

	<!-- 회차 선택 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-4">
			<h2 class="card-title text-lg">분석 회차 선택</h2>
			<div class="flex flex-wrap gap-2">
				<LinkButton
					href="/stats/odd-even"
					class="btn-sm btn-primary"
				>
					전체 회차
				</LinkButton>
				{#each roundOptions as rounds}
					<LinkButton
						href={`/stats/odd-even/${rounds}`}
						class="btn-sm btn-outline"
					>
						최근 {rounds}회차
					</LinkButton>
				{/each}
			</div>
			<p class="text-sm text-base-content/60">
				현재 <span class="font-semibold text-primary">전체 회차</span> 데이터를 분석 중입니다.
			</p>
		</div>
	</div>

	<!-- 홀수 개수별 분포 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">홀수 개수별 분포</h2>
			<p class="text-sm text-base-content/60 mb-4">
				6개 번호 중 홀수의 개수에 따른 분포를 나타냅니다.
			</p>
			
			<div class="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
				{#each Object.entries(data.oddEvenDistribution) as [oddCount, count]}
					{@const percentage = data.selectedRounds > 0 ? ((count / data.selectedRounds) * 100).toFixed(1) : "0.0"}
					{@const balance = getBalanceAnalysis(Number(oddCount))}
					
					<div class="text-center space-y-2 p-4 bg-base-200 rounded-lg">
						<div class="text-xs text-base-content/70">홀수</div>
						<div class="text-2xl font-bold text-primary">{oddCount}개</div>
						<div class="text-lg font-semibold">{count}회</div>
						<div class="text-sm text-base-content/60">{percentage}%</div>
						<div class="text-xs badge badge-outline {balance.color.replace('text-', 'badge-')}">
							{balance.type}
						</div>
					</div>
				{/each}
			</div>

			<!-- 홀짝 균형도 분석 -->
			<div class="mt-6 p-4 bg-base-200 rounded-lg">
				<h3 class="font-semibold mb-3">홀짝 균형도 분석</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
					{#each Object.entries(data.oddEvenDistribution) as [oddCount, count]}
						{@const percentage = data.selectedRounds > 0 ? ((count / data.selectedRounds) * 100).toFixed(1) : "0.0"}
						{@const balance = getBalanceAnalysis(Number(oddCount))}
						
						<div class="flex justify-between items-center">
							<span class="font-medium">{getOddCountLabel(Number(oddCount))}:</span>
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

	<!-- 번호 합계 분포 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">번호 합계 구간별 분포</h2>
			<p class="text-sm text-base-content/60 mb-4">
				6개 당첨번호의 합계를 구간별로 분석한 분포입니다.
			</p>
			
			<div class="overflow-x-auto">
				<table class="table table-zebra w-full">
					<thead>
						<tr>
							<th>합계 구간</th>
							<th>출현 횟수</th>
							<th>출현 비율</th>
							<th>분석</th>
						</tr>
					</thead>
					<tbody>
						{#each Object.entries(data.sumDistribution) as [range, count]}
							{@const percentage = data.selectedRounds > 0 ? ((count / data.selectedRounds) * 100).toFixed(1) : "0.0"}
							<tr>
								<td class="font-semibold text-lg">{range}</td>
								<td>{count}회</td>
								<td class="font-medium text-primary">{percentage}%</td>
								<td class="text-sm text-base-content/70">
									{getSumRangeAnalysis(range)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- 합계 분석 요약 -->
			<div class="mt-4 p-4 bg-base-200 rounded-lg">
				<h3 class="font-semibold mb-2">합계 분포 특징</h3>
				<div class="text-sm space-y-1">
					<p>• <strong>가장 일반적인 구간:</strong> 121-140 (균형잡힌 번호 분포)</p>
					<p>• <strong>이론적 평균:</strong> 138.5 (1+2+...+45의 평균값 × 6)</p>
					<p>• <strong>극단적 조합:</strong> 60-80 및 200+ 구간은 매우 드문 경우</p>
				</div>
			</div>
		</div>
	</div>

	<!-- 최근 회차별 상세 데이터 -->
	{#if data.oddEvenStats.length > 0}
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">최근 회차별 홀짝 데이터</h2>
			
			<div class="overflow-x-auto">
				<table class="table table-zebra w-full">
					<thead>
						<tr>
							<th>회차</th>
							<th>홀수 개수</th>
							<th>홀짝 구성</th>
							<th>번호 합계</th>
							<th>균형도</th>
						</tr>
					</thead>
					<tbody>
						{#each data.oddEvenStats as stat}
							{@const statRecord = stat as { round: number; odd_count: number; numbers_sum: number }}
							{@const balance = getBalanceAnalysis(statRecord.odd_count)}
							<tr>
								<td class="font-semibold">{statRecord.round}회</td>
								<td class="text-lg font-bold text-primary">{statRecord.odd_count}개</td>
								<td>
									<span class="badge badge-outline">
										홀수 {statRecord.odd_count} : 짝수 {6 - statRecord.odd_count}
									</span>
								</td>
								<td class="font-medium">{statRecord.numbers_sum}</td>
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

	<!-- 홀짝 분석 가이드 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">홀짝 분석 가이드</h2>
			<div class="space-y-3 text-sm">
				<p>
					홀수와 짝수의 분포는 로또 번호 선택 시 중요한 고려사항입니다.
				</p>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<h4 class="font-semibold text-primary mb-2">일반적인 패턴</h4>
						<ul class="list-disc list-inside space-y-1 text-base-content/70">
							<li><strong>홀수 3개:</strong> 가장 균형잡힌 조합</li>
							<li><strong>홀수 2-4개:</strong> 일반적으로 나타나는 범위</li>
							<li><strong>번호 합계:</strong> 120-160 구간이 일반적</li>
						</ul>
					</div>
					<div>
						<h4 class="font-semibold text-secondary mb-2">극단적인 패턴</h4>
						<ul class="list-disc list-inside space-y-1 text-base-content/70">
							<li><strong>모두 홀수/짝수:</strong> 매우 드문 경우</li>
							<li><strong>홀수 1개/5개:</strong> 불균형한 조합</li>
							<li><strong>합계 60-80/200+:</strong> 극단적인 분포</li>
						</ul>
					</div>
				</div>
				<div class="mt-4 p-3 bg-info/10 rounded-lg">
					<p class="text-info font-medium">
						💡 팁: 대부분의 당첨번호는 홀수 2-4개 범위에서 나타나며, 
						완전히 홀수만 또는 짝수만 나오는 경우는 매우 드뭅니다.
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
