<script lang="ts">
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";
import { onMount } from "svelte";
import { JsonLd, MetaTags } from "svelte-meta-tags";
import type { PageData } from "./$types";

export let data: PageData;

// Breadcrumbs 데이터
const breadcrumbItems = [
	{ label: "홈", href: "/" },
	{ label: "통계", href: "/stats" },
	{ label: "번호분석", href: "/stats/numbers", current: true },
];

// JSON-LD 스키마
const generateJsonLd = () => {
	return {
		"@context": "https://schema.org",
		"@type": "Dataset",
		name: "로또 6/45 번호별 출현 통계",
		description:
			"로또 6/45 각 번호의 출현 빈도, 색깔별 분포, 구간별 분석 데이터",
		url: "https://www.645.live/stats/numbers",
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

<MetaTags
	title="로또 6/45 번호별 출현 통계"
	titleTemplate="%s | 645.live"
	description="📊 로또 6/45 전 번호 완전분석! 1번부터 45번까지 출현 빈도, 색깔별 분포, 구간별 분석으로 당첨 패턴을 찾아보세요!"
	canonical="https://www.645.live/stats/numbers"
	keywords={["로또번호통계", "로또번호분석", "로또출현빈도", "로또색깔분석", "번호별통계", "로또패턴분석"]}
	openGraph={{
		type: "article",
		url: "https://www.645.live/stats/numbers",
		title: "로또 6/45 번호별 출현 통계",
		description: `📊 전 번호 완전분석! 총 ${data.totalRounds}회차 데이터로 당첨 패턴 발견하기`,
		siteName: "645.live",
		locale: "ko_KR",
		images: [{
			url: `https://www.645.live/og?title=${encodeURIComponent('로또 6/45 번호별 출현 통계')}&description=${encodeURIComponent(`총 ${data.totalRounds}회차 데이터 분석 - 최다 ${Math.max(...data.numberStats.map(s => s.draw_count))}회 - 최소 ${Math.min(...data.numberStats.map(s => s.draw_count))}회`)}&layout=blog&theme=light&format=svg`,
			width: 1200,
			height: 630,
			alt: "로또 6/45 번호별 출현 통계",
			type: "image/svg+xml"
		}]
	}}
	twitter={{
		cardType: "summary_large_image",
		site: "@645live",
		title: "로또 6/45 번호별 출현 통계",
		description: `📊 전 번호 완전분석! 총 ${data.totalRounds}회차 데이터로 당첨 패턴 발견하기`,
		image: `https://www.645.live/og?title=${encodeURIComponent('로또 6/45 번호별 출현 통계')}&description=${encodeURIComponent(`총 ${data.totalRounds}회차 데이터 분석 - 최다 ${Math.max(...data.numberStats.map(s => s.draw_count))}회 - 최소 ${Math.min(...data.numberStats.map(s => s.draw_count))}회`)}&layout=blog&theme=light&format=svg`,
		imageAlt: "로또 6/45 번호별 출현 통계"
	}}
	additionalMetaTags={[
		{
			name: "robots",
			content: "index,follow"
		},
		{
			name: "author", 
			content: "645.live"
		}
	]}
/>

<JsonLd schema={generateJsonLd()} />

<div class="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
	<!-- Breadcrumbs -->
	<Breadcrumbs items={breadcrumbItems} />

	<!-- 페이지 헤더 -->
	<div class="text-center space-y-2">
		<h1 class="text-xl sm:text-2xl lg:text-3xl font-bold text-primary">로또 6/45 번호별 출현 통계</h1>
		<p class="text-sm sm:text-base text-base-content/70">
			총 <span class="font-semibold text-primary">{data.totalRounds}</span>회차 데이터 분석
			(최신: {data.latestRound}회차)
		</p>
	</div>

	<!-- 요약 통계 -->
	<div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
		<div class="stat bg-primary text-primary-content rounded-lg p-3 sm:p-4">
			<div class="stat-title text-primary-content/70 text-xs sm:text-sm">전체 번호</div>
			<div class="stat-value text-xl sm:text-2xl">45</div>
			<div class="stat-desc text-primary-content/70 text-xs">번호</div>
		</div>
		<div class="stat bg-secondary text-secondary-content rounded-lg p-3 sm:p-4">
			<div class="stat-title text-secondary-content/70 text-xs sm:text-sm">평균 출현</div>
			<div class="stat-value text-xl sm:text-2xl">{Math.round(data.totalRounds * 6 / 45)}</div>
			<div class="stat-desc text-secondary-content/70 text-xs">횟수</div>
		</div>
		<div class="stat bg-accent text-accent-content rounded-lg p-3 sm:p-4">
			<div class="stat-title text-accent-content/70 text-xs sm:text-sm">최다 출현</div>
			<div class="stat-value text-xl sm:text-2xl">{Math.max(...data.numberStats.map(s => s.draw_count))}</div>
			<div class="stat-desc text-accent-content/70 text-xs">횟수</div>
		</div>
		<div class="stat bg-info text-info-content rounded-lg p-3 sm:p-4">
			<div class="stat-title text-info-content/70 text-xs sm:text-sm">최소 출현</div>
			<div class="stat-value text-xl sm:text-2xl">{Math.min(...data.numberStats.map(s => s.draw_count))}</div>
			<div class="stat-desc text-info-content/70 text-xs">횟수</div>
		</div>
	</div>

	<!-- 번호별 상세 통계 테이블 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-6">
			<h2 class="card-title text-lg sm:text-xl">번호별 상세 통계</h2>
			
			<div class="overflow-x-auto -mx-3 sm:mx-0">
				<table class="table table-zebra w-full">
					<thead>
						<tr>
							<th class="sticky left-0 bg-base-200 z-10 text-xs sm:text-sm min-w-[60px]">번호</th>
							<th class="text-xs sm:text-sm min-w-[60px]">색깔</th>
							<th class="text-xs sm:text-sm min-w-[80px]">구간</th>
							<th class="text-xs sm:text-sm min-w-[80px]">출현 횟수</th>
							<th class="text-xs sm:text-sm min-w-[80px]">보너스 횟수</th>
							<th class="text-xs sm:text-sm min-w-[70px]">출현률</th>
							<th class="text-xs sm:text-sm min-w-[60px]">편차</th>
							<th class="text-xs sm:text-sm min-w-[90px]">마지막 출현</th>
						</tr>
					</thead>
				<tbody>
					{#each data.numberStats as stat, index}
						<tr>
							<td class="sticky left-0 bg-base-100 z-10">
								<div class="flex items-center">
									<a href="/stats/numbers/{stat.number}" class="lotto-ball {getColorClass(stat.color)} hover:scale-110 transition-transform duration-200 cursor-pointer">
										{stat.number}
									</a>
								</div>
							</td>
							<td>
								<span class="badge badge-sm {getColorClass(stat.color)} text-white">
									{stat.color}
								</span>
							</td>
							<td class="text-xs sm:text-sm">
								{stat.section}구간 
								<span class="text-xs opacity-60">
									({(stat.section - 1) * 10 + 1}-{Math.min(stat.section * 10, 45)})
								</span>
							</td>
							<td>
								<div class="text-xs sm:text-sm font-medium">{stat.draw_count}</div>
								<div class="text-xs opacity-60">순위 {index + 1}</div>
							</td>
							<td class="text-xs sm:text-sm">
								{stat.bonus_count}
							</td>
							<td class="text-xs sm:text-sm">
								{stat.average_frequency}%
							</td>
							<td class="text-xs sm:text-sm {getDeviationClass(stat.deviation)}">
								{Number(stat.deviation) > 0 ? '+' : ''}{stat.deviation}
							</td>
							<td class="text-xs sm:text-sm">
								{stat.last_draw_round ? `${stat.last_draw_round}회차` : '-'}
							</td>
						</tr>
					{/each}
				</tbody>
				</table>
			</div>
		</div>
	</div>

	<!-- 분석 가이드 -->
	<div class="mt-4 sm:mt-6 lg:mt-8 bg-blue-50 rounded-lg p-3 sm:p-4 lg:p-6">
		<h3 class="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-blue-600 dark:text-blue-400">📊 분석 가이드</h3>
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
			<div>
				<h4 class="font-semibold mb-2 text-sm sm:text-base">통계 해석</h4>
				<ul class="space-y-1 text-gray-700 dark:text-gray-300">
					<li>• <strong>출현률</strong>: 해당 번호가 전체 회차에서 출현한 비율</li>
					<li>• <strong>편차</strong>: 기댓값 대비 실제 출현 횟수 차이</li>
					<li>• <strong>양의 편차</strong>: 평균보다 많이 출현한 번호</li>
					<li>• <strong>음의 편차</strong>: 평균보다 적게 출현한 번호</li>
				</ul>
			</div>
			<div>
				<h4 class="font-semibold mb-2 text-sm sm:text-base">색깔별 분포</h4>
				<ul class="space-y-1 text-gray-700 dark:text-gray-300">
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
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 50%;
		color: white;
		font-weight: bold;
		font-size: 0.75rem;
	}
	
	@media (min-width: 640px) {
		.lotto-ball {
			width: 2rem;
			height: 2rem;
			font-size: 0.875rem;
		}
	}
</style>
