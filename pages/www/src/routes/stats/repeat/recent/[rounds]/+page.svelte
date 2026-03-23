<script lang="ts">
import { goto } from "$app/navigation";
import { resolveRoute } from "$app/paths";
import { page } from "$app/state";
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";
import LinkButton from "$lib/ui/LinkButton.svelte";
import { JsonLd, MetaTags } from "svelte-meta-tags";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();

// 사용자 입력 상태
let inputValue = $state("");

$effect(() => {
	inputValue = String(data.selectedRounds);
});

// Breadcrumbs 데이터
const breadcrumbItems = [
	{ label: "홈", href: "/" },
	{ label: "통계", href: "/stats" },
	{ label: "연속번호", href: "/stats/repeat" },
	{ label: "최근 회차 분석", current: true },
];

// 입력값 유효성 검사
const validateInput = (value: string): boolean => {
	const str = String(value || "");
	if (str.trim() === "") return false;
	const num = Number(str);
	return !Number.isNaN(num) && num > 0 && num <= data.totalRounds;
};

// 분석 페이지로 이동
const navigateToAnalysis = async () => {
	const inputStr = String(inputValue || "");

	if (inputStr.trim() === "") {
		alert("분석할 회차 수를 입력해주세요.");
		return;
	}

	if (validateInput(inputStr)) {
		const rounds = Number(inputStr);
		try {
			await goto(
				resolveRoute("/stats/repeat/recent/[rounds]", {
					rounds: String(rounds),
				}),
			);
		} catch (error) {
			console.error("Navigation error:", error);
			alert("페이지 이동 중 오류가 발생했습니다.");
		}
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

// 중복 개수별 라벨
const getRepeatLabel = (count: number): string => {
	const labels = {
		0: "중복 없음",
		1: "1개 중복",
		2: "2개 중복",
		3: "3개 중복",
		4: "4개 중복",
		5: "5개 중복",
		6: "모두 중복",
	};
	return labels[count as keyof typeof labels] || `${count}개 중복`;
};

// 중복 패턴 분석
const getRepeatAnalysis = (
	count: number,
): { type: string; description: string; color: string } => {
	if (count === 0) {
		return {
			type: "완전 새로움",
			description: "이전 회차와 중복 번호 없음",
			color: "success",
		};
	}
	if (count === 1 || count === 2) {
		return {
			type: "일반적 중복",
			description: "평범한 수준의 연속성",
			color: "info",
		};
	}
	if (count === 3) {
		return {
			type: "높은 중복",
			description: "높은 연속성",
			color: "warning",
		};
	}
	return {
		type: "매우 높은 중복",
		description: "매우 높은 연속성 (드문 경우)",
		color: "error",
	};
};

// 백분율 계산
const getPercentage = (count: number, total: number): string => {
	return total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
};

// 중복 개수별 정렬 (출현 빈도순)
const sortedRepeatCounts = $derived(
	Object.entries(data.repeatStats.summary.repeatCounts || {}).sort(
		([, a], [, b]) => Number(b) - Number(a),
	),
);
</script>

<MetaTags
	title="로또 6/45 연속번호 중복 분석 통계 | 회차간 중복 패턴 분석"
	titleTemplate="%s | 645.live"
	description={`로또 6/45 연속 회차 간 중복 번호 패턴을 분석합니다 (최근 ${data.selectedRounds}회차). 이전 회차와의 번호 중복 빈도와 연속성 트렌드를 제공합니다.`}
	canonical={`https://645.live/stats/repeat/recent/${data.selectedRounds}`}
	keywords={["로또", "연속번호", "중복번호", "로또통계", "번호패턴", "연속성분석", "로또예측", "6/45통계", "로또연속성", "번호중복분석"]}
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
		type: 'article',
		url: `https://645.live/stats/repeat/recent/${data.selectedRounds}`,
		title: `로또 6/45 연속번호 중복 분석 통계 | 회차간 중복 패턴 (최근 ${data.selectedRounds}회차)`,
		description: `로또 6/45 연속 회차 간 중복 번호 패턴을 분석합니다 (최근 ${data.selectedRounds}회차). 이전 회차와의 번호 중복 빈도와 연속성 트렌드를 제공합니다.`,
		locale: 'ko_KR',
		images: [{
			url: 'https://645.live/images/lotto-repeat-stats.png',
			width: 1200,
			height: 630,
			alt: '로또 6/45 연속번호 중복 분석 통계',
			secureUrl: 'https://645.live/images/lotto-repeat-stats.png',
			type: 'image/png'
		}],
		siteName: '645.live',
		article: {
			section: '로또 통계',
			tags: ['로또', '연속번호', '중복번호', '로또통계', '번호패턴', '연속성분석', '6/45통계', '로또연속성'],
			publishedTime: '2024-01-01T00:00:00.000Z',
			modifiedTime: new Date().toISOString()
		}
	}}
	twitter={{
		cardType: 'summary_large_image',
		site: '@645live',
		title: `로또 6/45 연속번호 중복 분석 통계 (최근 ${data.selectedRounds}회차)`,
		description: '회차간 중복 패턴 분석으로 로또 번호 연속성을 파악하세요.',
		image: 'https://645.live/images/lotto-repeat-stats.png',
		imageAlt: '로또 6/45 연속번호 중복 분석 통계'
	}}
/>

<JsonLd
	schema={{
		'@type': 'Dataset',
		name: `로또 6/45 연속번호 중복 분석 통계 (최근 ${data.selectedRounds}회차)`,
		description: `로또 6/45 연속 회차 간 중복 번호 패턴을 분석한 통계 데이터입니다 (최근 ${data.selectedRounds}회차).`,
		url: `https://645.live/stats/repeat/recent/${data.selectedRounds}`,
		creator: {
			'@type': 'Organization',
			name: '645.live'
		},
		temporalCoverage: `최근 ${data.selectedRounds}회차`,
		spatial: {
			'@type': 'Country',
			name: '대한민국'
		},
		variableMeasured: [
			{
				'@type': 'PropertyValue',
				name: '평균 중복 개수',
				value: data.repeatStats.summary.avgRepeatCount
			},
			{
				'@type': 'PropertyValue',
				name: '최대 중복 개수',
				value: data.repeatStats.summary.maxRepeatCount
			},
			{
				'@type': 'PropertyValue',
				name: '중복 없음 비율',
				value: `${data.repeatStats.summary.zeroRepeatRate}%`
			},
			{
				'@type': 'PropertyValue',
				name: '높은 중복 비율',
				value: `${data.repeatStats.summary.highRepeatRate}%`
			}
		]
	}}
/>

<div class="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 max-sm:px-0">
	<!-- Breadcrumbs -->
	<Breadcrumbs items={breadcrumbItems} />

	<!-- 페이지 헤더 -->
	<div class="text-center space-y-2">
		<h1 class="text-2xl sm:text-3xl font-bold text-primary">연속번호 중복 분석 통계</h1>
		<p class="text-sm sm:text-base text-base-content/70">
			최근 <span class="font-semibold text-primary">{data.selectedRounds}회차</span>의 연속 회차 간 중복 번호 패턴을 분석합니다.<br />
			이전 회차와 현재 회차의 번호 중복 빈도와 연속성을 확인하세요.
		</p>
	</div>

	<!-- 최근 회차 분석 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-4">
			<h2 class="card-title text-base sm:text-lg">최근 회차 분석</h2>
			<div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
				<div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
					<label for="rounds-input" class="text-xs sm:text-sm font-medium">분석 회차 (1-{data.totalRounds}):</label>
					<input
						id="rounds-input"
						type="text"
						inputmode="numeric"
						pattern="[0-9]*"
						bind:value={inputValue}
						onkeydown={handleKeydown}
						class="input input-bordered input-sm w-full sm:w-20 text-center"
						placeholder="100"
					/>
				</div>
				<div class="flex flex-col sm:flex-row gap-2 sm:gap-4">
					<button
						type="button"
						onclick={navigateToAnalysis}
						class="btn btn-primary btn-sm w-full sm:w-auto min-h-[2.5rem] sm:min-h-[2rem]"
					>
						분석하기
					</button>
					<LinkButton
						href="/stats/repeat"
						class="btn btn-outline btn-sm w-full sm:w-auto min-h-[2.5rem] sm:min-h-[2rem]"
					>
						전체 회차 보기
					</LinkButton>
				</div>
			</div>
			<p class="text-xs sm:text-sm text-base-content/60">
				현재 최근 <span class="font-semibold text-primary">{data.selectedRounds}회차</span> 데이터를 분석 중입니다.
			</p>
		</div>
	</div>

	<!-- 요약 통계 -->
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
		<div class="stat bg-primary text-primary-content rounded-lg p-3 sm:p-6">
			<div class="stat-title text-primary-content/70 text-xs sm:text-sm">평균 중복 개수</div>
			<div class="stat-value text-lg sm:text-2xl">{data.repeatStats.summary.averageRepeatCount}</div>
			<div class="stat-desc text-primary-content/70 text-xs sm:text-sm">최근 {data.selectedRounds}회차</div>
		</div>
		
		<div class="stat bg-secondary text-secondary-content rounded-lg p-3 sm:p-6">
			<div class="stat-title text-secondary-content/70 text-xs sm:text-sm">최대 중복 개수</div>
			<div class="stat-value text-lg sm:text-2xl">{data.repeatStats.summary.maxRepeatCount}</div>
			<div class="stat-desc text-secondary-content/70 text-xs sm:text-sm">기록상 최고치</div>
		</div>
		
		<div class="stat bg-accent text-accent-content rounded-lg p-3 sm:p-6">
			<div class="stat-title text-accent-content/70 text-xs sm:text-sm">중복 없음</div>
			<div class="stat-value text-lg sm:text-2xl">{data.repeatStats.summary.zeroRepeatRate}%</div>
			<div class="stat-desc text-accent-content/70 text-xs sm:text-sm">{data.repeatStats.summary.zeroRepeatCount}회 중복 없음</div>
		</div>
		
		<div class="stat bg-info text-info-content rounded-lg p-3 sm:p-6">
			<div class="stat-title text-info-content/70 text-xs sm:text-sm">높은 중복</div>
			<div class="stat-value text-lg sm:text-2xl">{data.repeatStats.summary.highRepeatRate}%</div>
			<div class="stat-desc text-info-content/70 text-xs sm:text-sm">3개 이상 중복</div>
		</div>
	</div>

	<!-- 중복 개수별 분포 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-6">
			<h2 class="card-title text-base sm:text-lg">중복 개수별 분포</h2>
			<p class="text-xs sm:text-sm text-base-content/60 mb-3 sm:mb-4">
				이전 회차와 중복되는 번호의 개수별 분포를 나타냅니다.
			</p>
			
			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-4">
				{#each sortedRepeatCounts as [repeatCount, count]}
					{@const percentage = data.repeatStats.summary.totalDraws > 0 ? ((Number(count) / data.repeatStats.summary.totalDraws) * 100).toFixed(1) : "0.0"}
					{@const analysis = getRepeatAnalysis(Number(repeatCount))}
					
					<div class="text-center space-y-1 sm:space-y-2 p-2 sm:p-4 bg-base-200 rounded-lg">
						<div class="text-xs text-base-content/70">중복</div>
						<div class="text-lg sm:text-2xl font-bold text-primary">{repeatCount}개</div>
						<div class="text-sm sm:text-lg font-semibold">{count}회</div>
						<div class="text-xs sm:text-sm text-base-content/60">{percentage}%</div>
						<div class="text-xs badge badge-outline badge-{analysis.color} whitespace-nowrap">
							{analysis.type}
						</div>
					</div>
				{/each}
			</div>

			<!-- 중복 패턴 분석 -->
			<div class="mt-4 sm:mt-6 p-3 sm:p-4 bg-base-200 rounded-lg">
				<h3 class="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">중복 패턴 분석</h3>
				<div class="grid grid-cols-1 gap-3 sm:gap-4 text-xs sm:text-sm">
					{#each sortedRepeatCounts as [repeatCount, count]}
						{@const percentage = data.repeatStats.summary.totalDraws > 0 ? ((Number(count) / data.repeatStats.summary.totalDraws) * 100).toFixed(1) : "0.0"}
						{@const analysis = getRepeatAnalysis(Number(repeatCount))}
						
						<div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
							<span class="font-medium">{getRepeatLabel(Number(repeatCount))}:</span>
							<div class="text-left sm:text-right">
								<span class="font-bold text-{analysis.color}">{percentage}%</span>
								<div class="text-xs text-base-content/60">{analysis.description}</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<!-- 최근 회차별 상세 데이터 -->
	{#if data.repeatStats.records && data.repeatStats.records.length > 0}
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-6">
			<h2 class="card-title text-base sm:text-lg">최근 20회차 중복 데이터</h2>
			
			<div class="overflow-x-auto -mx-3 sm:mx-0">
				<table class="table table-zebra w-full">
					<thead>
						<tr>
							<th class="sticky left-0 bg-base-200 z-10 text-xs sm:text-sm min-w-[60px]">회차</th>
							<th class="min-w-[70px] text-center text-xs sm:text-sm">중복 개수</th>
							<th class="min-w-[80px] text-center text-xs sm:text-sm">연속성</th>
							<th class="min-w-[80px] text-center text-xs sm:text-sm">패턴 유형</th>
						</tr>
					</thead>
					<tbody>
						{#each data.repeatStats.records.slice(0, 20) as stat}
							{@const statRecord = stat as { round: number; repeat_count: number }}
							{@const analysis = getRepeatAnalysis(statRecord.repeat_count)}
							<tr>
								<td class="sticky left-0 bg-base-100 z-10 font-semibold text-xs sm:text-sm">{statRecord.round}회</td>
								<td class="text-sm sm:text-lg font-bold text-primary text-center">{statRecord.repeat_count}개</td>
								<td class="text-center">
									<div class="badge badge-outline badge-sm whitespace-nowrap">
										{getRepeatLabel(statRecord.repeat_count)}
									</div>
								</td>
								<td class="text-center">
									<div class="badge badge-{analysis.color} badge-sm whitespace-nowrap">
										{analysis.type}
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

	<!-- 연속 번호 분석 가이드 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-6">
			<h2 class="card-title text-base sm:text-lg">연속 번호 분석 가이드</h2>
			<div class="space-y-2 sm:space-y-3 text-xs sm:text-sm">
				<p>
					연속 회차 간 중복 번호는 로또의 연속성을 파악하는 중요한 지표입니다.
				</p>
				<div class="grid grid-cols-1 gap-3 sm:gap-4">
					<div class="space-y-3">
						<div>
							<h4 class="font-semibold text-primary mb-1 sm:mb-2 text-sm sm:text-base">일반적인 패턴</h4>
							<ul class="list-disc list-inside space-y-1 text-base-content/70">
								<li><strong>중복 없음:</strong> 완전히 새로운 번호 조합</li>
								<li><strong>1-2개 중복:</strong> 가장 일반적인 패턴</li>
								<li><strong>평균 중복:</strong> 약 1-2개 수준</li>
							</ul>
						</div>
						<div>
							<h4 class="font-semibold text-secondary mb-1 sm:mb-2 text-sm sm:text-base">특별한 패턴</h4>
							<ul class="list-disc list-inside space-y-1 text-base-content/70">
								<li><strong>3개 이상 중복:</strong> 높은 연속성 (드문 경우)</li>
								<li><strong>0개 중복:</strong> 완전 새로운 패턴</li>
								<li><strong>4개 이상:</strong> 매우 드문 극단적 연속성</li>
							</ul>
						</div>
					</div>
				</div>
				<div class="mt-3 sm:mt-4 p-2 sm:p-3 bg-info/10 rounded-lg">
					<p class="text-info font-medium text-xs sm:text-sm">
						💡 팁: 대부분의 회차에서 이전 회차와 1-2개 번호가 중복되며, 
						완전히 새로운 조합이나 높은 중복은 상대적으로 드뭅니다.
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
