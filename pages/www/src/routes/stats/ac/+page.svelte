<script lang="ts">
import { page } from "$app/state";
import LinkButton from "$lib/ui/LinkButton.svelte";
import type { PageData } from "./$types";

export let data: PageData;

// 페이지네이션 상태 (main page shows all data with pagination)
$: currentPage = Number(page.url.searchParams.get("page") || "1");

// 페이지 URL 생성
const createPageUrl = (newPage: number) => {
	const url = new URL(page.url);
	url.searchParams.set("page", String(newPage));
	return url.toString();
};

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

// AC값 복잡도 해석
const getComplexityLabel = (acValue: number): string => {
	if (acValue <= 3) return "매우 낮음";
	if (acValue <= 6) return "낮음";
	if (acValue <= 9) return "보통";
	if (acValue <= 12) return "높음";
	return "매우 높음";
};

const getComplexityDescription = (acValue: number): string => {
	if (acValue <= 3) return "단순한 패턴, 연속성 높음";
	if (acValue <= 6) return "비교적 단순한 패턴";
	if (acValue <= 9) return "일반적인 복잡도";
	if (acValue <= 12) return "복잡한 패턴";
	return "매우 복잡한 패턴, 분산도 높음";
};
</script>

<svelte:head>
	<title>로또 6/45 AC값 통계 분석 | 산술적 복잡도 패턴 | 645.live</title>
	<meta name="description" content="로또 6/45 당첨번호의 AC값(Arithmetic Complexity) 분포와 패턴을 분석합니다. AC값은 번호 조합의 복잡도를 나타내는 지표로, 패턴 예측에 도움이 됩니다." />
	<meta name="keywords" content="로또, AC값, 산술적복잡도, 로또통계, 로또분석, 당첨번호패턴, 로또예측" />
	<link rel="canonical" href="https://645.live/stats/ac" />
	
	<!-- Open Graph -->
	<meta property="og:title" content="로또 6/45 AC값 통계 분석 | 645.live" />
	<meta property="og:description" content="로또 6/45 당첨번호의 AC값(산술적 복잡도) 분포와 패턴을 분석합니다." />
	<meta property="og:url" content="https://645.live/stats/ac" />
	<meta property="og:type" content="article" />
	
	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="로또 6/45 AC값 통계 분석" />
	<meta name="twitter:description" content="로또 6/45 당첨번호의 AC값(산술적 복잡도) 분포와 패턴을 분석합니다." />
</svelte:head>

<div class="p-6 space-y-6">
	<!-- 페이지 헤더 -->
	<div class="text-center space-y-2">
		<h1 class="text-3xl font-bold text-primary">AC값 통계 분석</h1>
		<p class="text-base-content/70">
			AC값(Arithmetic Complexity)은 번호 조합의 산술적 복잡도를 나타내는 지표입니다.<br />
			낮은 AC값은 단순한 패턴을, 높은 AC값은 복잡한 패턴을 의미합니다.
		</p>
	</div>

	<!-- 회차 선택 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-4">
			<h2 class="card-title text-lg">분석 회차 선택</h2>
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
						class="input input-bordered input-sm w-24 text-center"
						placeholder="100"
					/>
					<span class="text-sm opacity-60">/ {data.totalRounds}</span>
				</div>
				<button
					type="button"
					on:click={navigateToAnalysis}
					class="btn btn-primary btn-sm"
				>
					분석하기
				</button>
				<LinkButton
					href="/stats/ac"
					class="btn btn-outline btn-sm"
				>
					전체 회차 보기
				</LinkButton>
			</div>
			<p class="text-sm text-base-content/60">
				현재 전체 <span class="font-semibold text-primary">{data.totalRounds}회차</span> 데이터를 표시 중입니다.
			</p>
		</div>
	</div>

	<!-- 요약 통계 -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="stat bg-primary text-primary-content rounded-lg">
			<div class="stat-title text-primary-content/70">평균 AC값</div>
			<div class="stat-value text-2xl">{data.averageAcValue}</div>
			<div class="stat-desc text-primary-content/70">최근 {data.totalRounds}회차</div>
		</div>
		
		<div class="stat bg-secondary text-secondary-content rounded-lg">
			<div class="stat-title text-secondary-content/70">최대 AC값</div>
			<div class="stat-value text-2xl">{data.maxAcValue}</div>
			<div class="stat-desc text-secondary-content/70">{getComplexityLabel(data.maxAcValue)}</div>
		</div>
		
		<div class="stat bg-accent text-accent-content rounded-lg">
			<div class="stat-title text-accent-content/70">최소 AC값</div>
			<div class="stat-value text-2xl">{data.minAcValue}</div>
			<div class="stat-desc text-accent-content/70">{getComplexityLabel(data.minAcValue)}</div>
		</div>
		
		<div class="stat bg-info text-info-content rounded-lg">
			<div class="stat-title text-info-content/70">최빈 AC값</div>
			<div class="stat-value text-2xl">{data.mostFrequentAc[0]}</div>
			<div class="stat-desc text-info-content/70">{data.mostFrequentAc[1]}회 출현</div>
		</div>
	</div>

	<!-- 복잡도 범위별 분포 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">AC값 복잡도 분포</h2>
			
			<div class="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
				{#each Object.entries(data.acRangeDistribution) as [range, count]}
					{@const percentage = data.totalRounds > 0 ? ((count / data.totalRounds) * 100).toFixed(1) : "0.0"}
					{@const [min, max] = range.split('-').map(Number)}
					{@const label = getComplexityLabel(min)}
					
					<div class="text-center space-y-2">
						<div class="text-sm font-medium text-base-content/70">AC {range}</div>
						<div class="text-lg font-bold text-primary">{count}회</div>
						<div class="text-sm text-base-content/60">{percentage}%</div>
						<div class="text-xs badge badge-outline">{label}</div>
					</div>
				{/each}
			</div>

			<!-- 복잡도 분석 -->
			<div class="mt-6 p-4 bg-base-200 rounded-lg">
				<h3 class="font-semibold mb-2">복잡도 분석</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
					<div>
						<span class="font-medium text-primary">낮은 복잡도 (0-6):</span>
						<span class="ml-2">{data.lowComplexityRate}%</span>
						<p class="text-xs text-base-content/60 mt-1">단순한 패턴, 연속성이 높은 번호 조합</p>
					</div>
					<div>
						<span class="font-medium text-secondary">높은 복잡도 (10-15):</span>
						<span class="ml-2">{data.highComplexityRate}%</span>
						<p class="text-xs text-base-content/60 mt-1">복잡한 패턴, 분산도가 높은 번호 조합</p>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- 최근 10회차 AC값 -->
	{#if data.recentStats.length > 0}
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">최근 10회차 AC값 추이</h2>
			
			<div class="overflow-x-auto">
				<table class="table table-zebra w-full">
					<thead>
						<tr>
							<th>회차</th>
							<th>AC값</th>
							<th>복잡도</th>
							<th>설명</th>
						</tr>
					</thead>
					<tbody>
						{#each data.recentStats as stat}
							<tr>
								<td class="font-semibold">{stat.round}회</td>
								<td class="text-lg font-bold text-primary">{stat.ac_value}</td>
								<td>
									<div class="badge badge-outline">
										{getComplexityLabel(stat.ac_value)}
									</div>
								</td>
								<td class="text-sm text-base-content/70">
									{getComplexityDescription(stat.ac_value)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
	{/if}

	<!-- 전체 AC값 분포 테이블 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">AC값별 상세 분포</h2>
			
			<div class="overflow-x-auto">
				<table class="table table-zebra w-full">
					<thead>
						<tr>
							<th>AC값</th>
							<th>출현 횟수</th>
							<th>출현 비율</th>
							<th>복잡도</th>
						</tr>
					</thead>
					<tbody>
						{#each Object.entries(data.acDistribution)
							.filter(([_, count]) => count > 0)
							.sort((a, b) => Number(a[0]) - Number(b[0])) as [acValue, count]}
							{@const percentage = data.totalRounds > 0 ? ((count / data.totalRounds) * 100).toFixed(1) : "0.0"}
							<tr>
								<td class="font-semibold text-lg">{acValue}</td>
								<td>{count}회</td>
								<td>{percentage}%</td>
								<td>
									<div class="badge badge-outline">
										{getComplexityLabel(Number(acValue))}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>

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

	<!-- AC값 가이드 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">AC값이란?</h2>
			<div class="space-y-3 text-sm">
				<p>
					<strong>AC값(Arithmetic Complexity)</strong>은 선택된 번호들 간의 산술적 복잡도를 나타내는 지표입니다.
				</p>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<h4 class="font-semibold text-primary mb-2">낮은 AC값 (0-6)</h4>
						<ul class="list-disc list-inside space-y-1 text-base-content/70">
							<li>연속 번호가 많음 (예: 1,2,3,4,5,6)</li>
							<li>규칙적인 패턴</li>
							<li>번호 간 간격이 작음</li>
						</ul>
					</div>
					<div>
						<h4 class="font-semibold text-secondary mb-2">높은 AC값 (10-15)</h4>
						<ul class="list-disc list-inside space-y-1 text-base-content/70">
							<li>번호가 고르게 분산</li>
							<li>불규칙한 패턴</li>
							<li>번호 간 간격이 큼</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
