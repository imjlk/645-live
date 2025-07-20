<script lang="ts">
import { MetaTags, JsonLd } from 'svelte-meta-tags';
import type { PageData } from "./$types";

export let data: PageData;
</script>

<MetaTags
	title="로또 6/45 통계 분석 | 번호별 출현 빈도와 패턴 분석"
	titleTemplate="%s | 645.live"
	description={`로또 6/45 당첨번호 통계 및 분석 데이터를 제공합니다. 전체 ${data.totalRounds}회차 데이터 기반으로 번호별 출현 빈도, 홀짝 분포, 색깔별 통계, 구간별 분석 등 종합적인 로또 분석 정보를 확인하세요.`}
	canonical="https://645.live/stats"
	keywords={["로또통계", "로또분석", "로또당첨번호", "번호별통계", "로또예측", "번호분석", "홀짝분석", "로또패턴", "6/45통계", "로또번호분석"]}
	robots="index,follow"
	additionalRobotsProps={{
		maxSnippet: 320,
		maxImagePreview: 'large',
		maxVideoPreview: 60
	}}
	additionalMetaTags={[
		{
			name: 'application-name',
			content: '645.live'
		},
		{
			name: 'theme-color',
			content: '#3B82F6'
		},
		{
			name: 'format-detection',
			content: 'telephone=no'
		},
		{
			name: 'author',
			content: '645.live'
		},
		{
			name: 'generator',
			content: 'SvelteKit'
		},
		{
			property: 'article:publisher',
			content: 'https://645.live'
		}
	]}
	openGraph={{
		type: 'website',
		url: 'https://645.live/stats',
		title: '로또 6/45 통계 분석 | 번호별 출현 빈도와 패턴 분석',
		description: `로또 6/45 당첨번호 통계 및 분석 데이터를 제공합니다. 전체 ${data.totalRounds}회차 데이터 기반으로 번호별 출현 빈도, 홀짝 분포, 색깔별 통계 등 종합적인 분석 정보를 확인하세요.`,
		locale: 'ko_KR',
		images: [{
			url: 'https://645.live/images/lotto-stats-main.png',
			width: 1200,
			height: 630,
			alt: '로또 6/45 통계 분석',
			secureUrl: 'https://645.live/images/lotto-stats-main.png',
			type: 'image/png'
		}],
		siteName: '645.live'
	}}
	twitter={{
		cardType: 'summary_large_image',
		site: '@645live',
		title: '로또 6/45 통계 분석',
		description: '번호별 출현 빈도와 패턴 분석으로 로또를 더 재미있게!',
		image: 'https://645.live/images/lotto-stats-main.png',
		imageAlt: '로또 6/45 통계 분석'
	}}
/>

<JsonLd
	schema={{
		'@type': 'Dataset',
		name: '로또 6/45 통계 분석 데이터',
		description: `로또 6/45 당첨번호 통계 및 분석 데이터입니다. 전체 ${data.totalRounds}회차 데이터를 기반으로 번호별 출현 빈도, 홀짝 분포, 색깔별 통계, 구간별 분석 등을 제공합니다.`,
		url: 'https://645.live/stats',
		creator: {
			'@type': 'Organization',
			name: '645.live'
		},
		temporalCoverage: `전체 ${data.totalRounds}회차 (2002년 12월 ~ 현재)`,
		spatial: {
			'@type': 'Country',
			name: '대한민국'
		},
		variableMeasured: [
			{
				'@type': 'PropertyValue',
				name: '번호별 출현 빈도',
				value: `${data.topNumberStats[0]?.number}번 최다 ${data.topNumberStats[0]?.draw_count}회`
			},
			{
				'@type': 'PropertyValue',
				name: '전체 회차 수',
				value: data.totalRounds
			},
			{
				'@type': 'PropertyValue',
				name: '최신 회차',
				value: data.latestRound
			}
		]
	}}
/>

<div class="container mx-auto px-4 py-8">
	<header class="mb-8">
		<h1 class="text-3xl font-bold text-base-content mb-2">로또 6/45 통계 분석</h1>
		<p class="text-base-content/70">
			총 <span class="font-semibold text-primary">{data.totalRounds}</span>회차 데이터를 기반으로 한 통계 분석
			{#if data.latestRound > 0}
				(최신: {data.latestRound}회차, {data.latestDrawDate})
			{/if}
		</p>
	</header>

	<!-- 통계 카테고리 네비게이션 -->
	<nav class="mb-8">
		<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
			<a href="/stats/numbers" class="stats-nav-card">
				<div class="text-2xl mb-2">🔢</div>
				<h3 class="font-semibold text-sm">번호별 통계</h3>
				<p class="text-xs text-base-content/60">출현 빈도</p>
			</a>
			<a href="/stats/odd-even" class="stats-nav-card">
				<div class="text-2xl mb-2">⚖️</div>
				<h3 class="font-semibold text-sm">홀짝 분석</h3>
				<p class="text-xs text-base-content/60">홀수/짝수 분포</p>
			</a>
			<a href="/stats/colors" class="stats-nav-card">
				<div class="text-2xl mb-2">🎨</div>
				<h3 class="font-semibold text-sm">색깔별 통계</h3>
				<p class="text-xs text-base-content/60">공 색상 분포</p>
			</a>
			<a href="/stats/sections" class="stats-nav-card">
				<div class="text-2xl mb-2">📊</div>
				<h3 class="font-semibold text-sm">구간별 분석</h3>
				<p class="text-xs text-base-content/60">번호 구간 분포</p>
			</a>
			<a href="/stats/high-low" class="stats-nav-card">
				<div class="text-2xl mb-2">📈</div>
				<h3 class="font-semibold text-sm">고저번대</h3>
				<p class="text-xs text-base-content/60">고번대/저번대</p>
			</a>
			<a href="/stats/pairs" class="stats-nav-card">
				<div class="text-2xl mb-2">👥</div>
				<h3 class="font-semibold text-sm">번호 쌍</h3>
				<p class="text-xs text-base-content/60">동반 출현</p>
			</a>
			<a href="/stats/repeat" class="stats-nav-card">
				<div class="text-2xl mb-2">🔄</div>
				<h3 class="font-semibold text-sm">연속 중복</h3>
				<p class="text-xs text-base-content/60">회차간 중복</p>
			</a>
			<a href="/stats/unit-digit" class="stats-nav-card">
				<div class="text-2xl mb-2">🔟</div>
				<h3 class="font-semibold text-sm">끝수 분석</h3>
				<p class="text-xs text-base-content/60">끝자리 분포</p>
			</a>
			<a href="/stats/ac" class="stats-nav-card">
				<div class="text-2xl mb-2">📊</div>
				<h3 class="font-semibold text-sm">AC값</h3>
				<p class="text-xs text-base-content/60">산술 복잡도</p>
			</a>
		</div>
	</nav>

	<!-- 주요 통계 요약 -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
		<!-- 번호별 통계 요약 -->
		<section class="bg-base-100 rounded-lg shadow-md p-6">
			<h2 class="text-xl font-bold mb-4 flex items-center">
				<span class="text-2xl mr-2">🔢</span>
				번호별 출현 빈도
			</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div>
					<h3 class="font-semibold text-success mb-2">최다 출현 번호</h3>
					<div class="space-y-2">
						{#each data.topNumberStats.slice(0, 5) as stat}
							<div class="flex justify-between items-center">
								<a href="/stats/numbers/{stat.number}" class="lotto-ball hover:scale-110 transition-transform">{stat.number}</a>
								<span class="text-sm text-base-content/70">{stat.draw_count}회</span>
							</div>
						{/each}
					</div>
				</div>
				<div>
					<h3 class="font-semibold text-error mb-2">최소 출현 번호</h3>
					<div class="space-y-2">
						{#each data.bottomNumberStats.slice(0, 5) as stat}
							<div class="flex justify-between items-center">
								<a href="/stats/numbers/{stat.number}" class="lotto-ball hover:scale-110 transition-transform">{stat.number}</a>
								<span class="text-sm text-base-content/70">{stat.draw_count}회</span>
							</div>
						{/each}
					</div>
				</div>
			</div>
			<div class="mt-4 text-center">
				<a href="/stats/numbers" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm">
					전체 번호 통계 보기 →
				</a>
			</div>
		</section>

		<!-- 홀짝 분석 요약 -->
		<section class="bg-base-100 rounded-lg shadow-md p-6">
			<h2 class="text-xl font-bold mb-4 flex items-center">
				<span class="text-2xl mr-2">⚖️</span>
				최근 홀짝 분포
			</h2>
			<div class="space-y-3">
				{#each data.recentOddEvenStats.slice(0, 5) as stat}
					<div class="flex items-center justify-between">
						<span class="text-sm text-base-content/70">{stat.round}회차</span>
						<div class="flex items-center space-x-2">
							<span class="text-xs bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded">
								홀수 {stat.odd_count}개
							</span>
							<span class="text-xs bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-1 rounded">
								짝수 {stat.even_count}개
							</span>
						</div>
					</div>
				{/each}
			</div>
			<div class="mt-4 text-center">
				<a href="/stats/odd-even" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm">
					홀짝 분석 상세 보기 →
				</a>
			</div>
		</section>

		<!-- 색깔별 통계 요약 -->
		<section class="bg-base-100 rounded-lg shadow-md p-6">
			<h2 class="text-xl font-bold mb-4 flex items-center">
				<span class="text-2xl mr-2">🎨</span>
				최근 색깔 분포
			</h2>
			<div class="space-y-3">
				{#each data.recentColorStats.slice(0, 5) as stat}
					<div class="flex items-center justify-between">
						<span class="text-sm text-base-content/70">{stat.round}회차</span>
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
				<a href="/stats/colors" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm">
					색깔별 통계 상세 보기 →
				</a>
			</div>
		</section>

		<!-- 번호 쌍 통계 요약 -->
		<section class="bg-base-100 rounded-lg shadow-md p-6">
			<h2 class="text-xl font-bold mb-4 flex items-center">
				<span class="text-2xl mr-2">👥</span>
				최다 동반 출현 번호 쌍
			</h2>
			<div class="space-y-3">
				{#each data.topPairStats.slice(0, 5) as stat}
					<div class="flex items-center justify-between">
						<div class="flex items-center space-x-2">
							<a href="/stats/numbers/{stat.number_a}" class="lotto-ball small hover:scale-110 transition-transform">{stat.number_a}</a>
							<span class="text-base-content/40">+</span>
							<a href="/stats/numbers/{stat.number_b}" class="lotto-ball small hover:scale-110 transition-transform">{stat.number_b}</a>
						</div>
						<span class="text-sm text-base-content/70">{stat.pair_count}회</span>
					</div>
				{/each}
			</div>
			<div class="mt-4 text-center">
				<a href="/stats/pairs" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm">
					번호 쌍 통계 상세 보기 →
				</a>
			</div>
		</section>
	</div>

	<!-- 통계 활용 가이드 -->
	<section class="bg-base-200 rounded-lg p-6">
		<h2 class="text-xl font-bold mb-4 text-base-content">📚 통계 활용 가이드</h2>
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
			<div>
				<h3 class="font-semibold mb-2 text-base-content">통계 분석 방법</h3>
				<ul class="space-y-1 text-base-content/70">
					<li>• 번호별 출현 빈도를 통한 패턴 분석</li>
					<li>• 홀짝 비율의 균형성 확인</li>
					<li>• 색깔별 분포의 다양성 검토</li>
					<li>• 구간별 분포의 편중성 파악</li>
				</ul>
			</div>
			<div>
				<h3 class="font-semibold mb-2 text-base-content">주의사항</h3>
				<ul class="space-y-1 text-base-content/70">
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
		background: oklch(var(--b1));
		border-radius: 0.5rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		padding: 1rem;
		text-align: center;
		border: 1px solid oklch(var(--b3));
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
