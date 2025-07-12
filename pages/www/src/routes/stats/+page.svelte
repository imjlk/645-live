<script lang="ts">
import { onMount } from "svelte";
import type { PageData } from "./$types";

export let data: PageData;

// JSON-LD 스키마 생성
const generateJsonLd = () => {
	return {
		"@context": "https://schema.org",
		"@type": "Dataset",
		name: "로또 6/45 통계 데이터",
		description: "한국 로또 6/45 당첨번호 통계 및 분석 데이터",
		url: "https://645.live/stats",
		keywords: ["로또", "로또통계", "로또분석", "로또당첨번호", "로또예측"],
		dateModified: new Date().toISOString(),
		creator: {
			"@type": "Organization",
			name: "645.live",
			url: "https://645.live",
		},
		distribution: {
			"@type": "DataDownload",
			contentUrl: "https://645.live/stats",
			encodingFormat: "text/html",
		},
		temporalCoverage: "2002-12-07/..",
		spatialCoverage: {
			"@type": "Place",
			name: "대한민국",
		},
	};
};

onMount(() => {
	// JSON-LD 스키마 추가
	const script = document.createElement("script");
	script.type = "application/ld+json";
	script.textContent = JSON.stringify(generateJsonLd());
	document.head.appendChild(script);

	return () => {
		document.head.removeChild(script);
	};
});
</script>

<svelte:head>
	<title>로또 6/45 통계 분석 | 645.live</title>
	<meta name="description" content="로또 6/45 당첨번호 통계 및 분석 데이터. 번호별 출현 빈도, 홀짝 분포, 색깔별 통계, 구간별 분석 등 다양한 통계 정보를 제공합니다." />
	<meta name="keywords" content="로또통계, 로또분석, 로또당첨번호, 로또예측, 번호분석, 홀짝분석" />
	<meta property="og:title" content="로또 6/45 통계 분석" />
	<meta property="og:description" content="로또 6/45 당첨번호 통계 및 분석 데이터" />
	<meta property="og:url" content="https://645.live/stats" />
	<meta property="og:type" content="website" />
	<link rel="canonical" href="https://645.live/stats" />
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<header class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900 mb-2">로또 6/45 통계 분석</h1>
		<p class="text-gray-600">
			총 <span class="font-semibold text-blue-600">{data.totalRounds}</span>회차 데이터를 기반으로 한 통계 분석
			{#if data.latestRound > 0}
				(최신: {data.latestRound}회차, {data.latestDrawDate})
			{/if}
		</p>
	</header>

	<!-- 통계 카테고리 네비게이션 -->
	<nav class="mb-8">
		<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
			<a href="/stats/numbers" class="stats-nav-card">
				<div class="text-2xl mb-2">🔢</div>
				<h3 class="font-semibold text-sm">번호별 통계</h3>
				<p class="text-xs text-gray-600">출현 빈도</p>
			</a>
			<a href="/stats/odd-even" class="stats-nav-card">
				<div class="text-2xl mb-2">⚖️</div>
				<h3 class="font-semibold text-sm">홀짝 분석</h3>
				<p class="text-xs text-gray-600">홀수/짝수 분포</p>
			</a>
			<a href="/stats/colors" class="stats-nav-card">
				<div class="text-2xl mb-2">🎨</div>
				<h3 class="font-semibold text-sm">색깔별 통계</h3>
				<p class="text-xs text-gray-600">공 색상 분포</p>
			</a>
			<a href="/stats/sections" class="stats-nav-card">
				<div class="text-2xl mb-2">📊</div>
				<h3 class="font-semibold text-sm">구간별 분석</h3>
				<p class="text-xs text-gray-600">번호 구간 분포</p>
			</a>
			<a href="/stats/high-low" class="stats-nav-card">
				<div class="text-2xl mb-2">📈</div>
				<h3 class="font-semibold text-sm">고저번대</h3>
				<p class="text-xs text-gray-600">고번대/저번대</p>
			</a>
			<a href="/stats/pairs" class="stats-nav-card">
				<div class="text-2xl mb-2">👥</div>
				<h3 class="font-semibold text-sm">번호 쌍</h3>
				<p class="text-xs text-gray-600">동반 출현</p>
			</a>
			<a href="/stats/repeat" class="stats-nav-card">
				<div class="text-2xl mb-2">🔄</div>
				<h3 class="font-semibold text-sm">연속 중복</h3>
				<p class="text-xs text-gray-600">회차간 중복</p>
			</a>
			<a href="/stats/unit-digit" class="stats-nav-card">
				<div class="text-2xl mb-2">🔟</div>
				<h3 class="font-semibold text-sm">끝수 분석</h3>
				<p class="text-xs text-gray-600">끝자리 분포</p>
			</a>
			<a href="/stats/ac" class="stats-nav-card">
				<div class="text-2xl mb-2">📊</div>
				<h3 class="font-semibold text-sm">AC값</h3>
				<p class="text-xs text-gray-600">산술 복잡도</p>
			</a>
		</div>
	</nav>

	<!-- 주요 통계 요약 -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
		<!-- 번호별 통계 요약 -->
		<section class="bg-white rounded-lg shadow-md p-6">
			<h2 class="text-xl font-bold mb-4 flex items-center">
				<span class="text-2xl mr-2">🔢</span>
				번호별 출현 빈도
			</h2>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<h3 class="font-semibold text-green-600 mb-2">최다 출현 번호</h3>
					<div class="space-y-2">
						{#each data.topNumberStats.slice(0, 5) as stat}
							<div class="flex justify-between items-center">
								<span class="lotto-ball">{stat.number}</span>
								<span class="text-sm text-gray-600">{stat.draw_count}회</span>
							</div>
						{/each}
					</div>
				</div>
				<div>
					<h3 class="font-semibold text-red-600 mb-2">최소 출현 번호</h3>
					<div class="space-y-2">
						{#each data.bottomNumberStats.slice(0, 5) as stat}
							<div class="flex justify-between items-center">
								<span class="lotto-ball">{stat.number}</span>
								<span class="text-sm text-gray-600">{stat.draw_count}회</span>
							</div>
						{/each}
					</div>
				</div>
			</div>
			<div class="mt-4 text-center">
				<a href="/stats/numbers" class="text-blue-600 hover:text-blue-800 text-sm">
					전체 번호 통계 보기 →
				</a>
			</div>
		</section>

		<!-- 홀짝 분석 요약 -->
		<section class="bg-white rounded-lg shadow-md p-6">
			<h2 class="text-xl font-bold mb-4 flex items-center">
				<span class="text-2xl mr-2">⚖️</span>
				최근 홀짝 분포
			</h2>
			<div class="space-y-3">
				{#each data.recentOddEvenStats.slice(0, 5) as stat}
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-600">{stat.round}회차</span>
						<div class="flex items-center space-x-2">
							<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
								홀수 {stat.odd_count}개
							</span>
							<span class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
								짝수 {stat.even_count}개
							</span>
						</div>
					</div>
				{/each}
			</div>
			<div class="mt-4 text-center">
				<a href="/stats/odd-even" class="text-blue-600 hover:text-blue-800 text-sm">
					홀짝 분석 상세 보기 →
				</a>
			</div>
		</section>

		<!-- 색깔별 통계 요약 -->
		<section class="bg-white rounded-lg shadow-md p-6">
			<h2 class="text-xl font-bold mb-4 flex items-center">
				<span class="text-2xl mr-2">🎨</span>
				최근 색깔 분포
			</h2>
			<div class="space-y-3">
				{#each data.recentColorStats.slice(0, 5) as stat}
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-600">{stat.round}회차</span>
						<div class="flex items-center space-x-1">
							<span class="color-badge yellow">{stat.yellow_count}</span>
							<span class="color-badge blue">{stat.blue_count}</span>
							<span class="color-badge red">{stat.red_count}</span>
							<span class="color-badge grey">{stat.grey_count}</span>
							<span class="color-badge green">{stat.green_count}</span>
						</div>
					</div>
				{/each}
			</div>
			<div class="mt-4 text-center">
				<a href="/stats/colors" class="text-blue-600 hover:text-blue-800 text-sm">
					색깔별 통계 상세 보기 →
				</a>
			</div>
		</section>

		<!-- 번호 쌍 통계 요약 -->
		<section class="bg-white rounded-lg shadow-md p-6">
			<h2 class="text-xl font-bold mb-4 flex items-center">
				<span class="text-2xl mr-2">👥</span>
				최다 동반 출현 번호 쌍
			</h2>
			<div class="space-y-3">
				{#each data.topPairStats.slice(0, 5) as stat}
					<div class="flex items-center justify-between">
						<div class="flex items-center space-x-2">
							<span class="lotto-ball small">{stat.number_a}</span>
							<span class="text-gray-400">+</span>
							<span class="lotto-ball small">{stat.number_b}</span>
						</div>
						<span class="text-sm text-gray-600">{stat.pair_count}회</span>
					</div>
				{/each}
			</div>
			<div class="mt-4 text-center">
				<a href="/stats/pairs" class="text-blue-600 hover:text-blue-800 text-sm">
					번호 쌍 통계 상세 보기 →
				</a>
			</div>
		</section>
	</div>

	<!-- 통계 활용 가이드 -->
	<section class="bg-blue-50 rounded-lg p-6">
		<h2 class="text-xl font-bold mb-4 text-blue-900">📚 통계 활용 가이드</h2>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
			<div>
				<h3 class="font-semibold mb-2">통계 분석 방법</h3>
				<ul class="space-y-1 text-gray-700">
					<li>• 번호별 출현 빈도를 통한 패턴 분석</li>
					<li>• 홀짝 비율의 균형성 확인</li>
					<li>• 색깔별 분포의 다양성 검토</li>
					<li>• 구간별 분포의 편중성 파악</li>
				</ul>
			</div>
			<div>
				<h3 class="font-semibold mb-2">주의사항</h3>
				<ul class="space-y-1 text-gray-700">
					<li>• 과거 데이터는 미래 결과를 보장하지 않음</li>
					<li>• 모든 번호는 동일한 확률로 추첨됨</li>
					<li>• 통계는 참고용으로만 활용</li>
					<li>• 책임감 있는 구매 권장</li>
				</ul>
			</div>
		</div>
	</section>
</div>

<style>
	.stats-nav-card {
		background-color: white;
		border-radius: 0.5rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		padding: 1rem;
		text-align: center;
		border: 1px solid #e5e7eb;
		transition: box-shadow 0.2s;
	}
	
	.stats-nav-card:hover {
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
	}

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
		background: linear-gradient(45deg, #6366f1, #8b5cf6);
	}

	.lotto-ball.small {
		width: 1.5rem;
		height: 1.5rem;
		font-size: 0.75rem;
	}

	.color-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 50%;
		color: white;
		font-weight: bold;
		font-size: 0.75rem;
	}

	.color-badge.yellow {
		background-color: #eab308;
	}

	.color-badge.blue {
		background-color: #3b82f6;
	}

	.color-badge.red {
		background-color: #ef4444;
	}

	.color-badge.grey {
		background-color: #6b7280;
	}

	.color-badge.green {
		background-color: #22c55e;
	}
</style>
