<script lang="ts">
import { goto } from "$app/navigation";
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";
import LinkButton from "$lib/ui/LinkButton.svelte";
import { JsonLd, MetaTags } from "svelte-meta-tags";
import type { PageData } from "./$types";

export let data: PageData;

// 사용자 입력 상태
let inputValue = "";

// Breadcrumbs 데이터
const breadcrumbItems = [
	{ label: "홈", href: "/" },
	{ label: "통계", href: "/stats" },
	{ label: "구간분석", href: "/stats/sections", current: true },
];

// 구간 정보 매핑
const sectionInfo = {
	section1: {
		name: "1구간",
		range: "1-10",
		class: "bg-red-500",
		bgClass: "bg-red-500/20 dark:bg-red-400/20",
		textClass: "text-red-600 dark:text-red-400",
	},
	section2: {
		name: "2구간",
		range: "11-20",
		class: "bg-orange-500",
		bgClass: "bg-orange-500/20 dark:bg-orange-400/20",
		textClass: "text-orange-600 dark:text-orange-400",
	},
	section3: {
		name: "3구간",
		range: "21-30",
		class: "bg-yellow-500",
		bgClass: "bg-yellow-500/20 dark:bg-yellow-400/20",
		textClass: "text-yellow-600 dark:text-yellow-400",
	},
	section4: {
		name: "4구간",
		range: "31-40",
		class: "bg-blue-500",
		bgClass: "bg-blue-500/20 dark:bg-blue-400/20",
		textClass: "text-blue-600 dark:text-blue-400",
	},
	section5: {
		name: "5구간",
		range: "41-45",
		class: "bg-green-500",
		bgClass: "bg-green-500/20 dark:bg-green-400/20",
		textClass: "text-green-600 dark:text-green-400",
	},
};

// 백분율 계산
const getPercentage = (count: number, total: number): string => {
	return total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
};

// 구간별 데이터 매핑 (데이터 검증 포함)
$: sectionMappedData = {
	section1:
		data.sectionDistribution?.section_1_10 &&
		typeof data.sectionDistribution.section_1_10.average === "number" &&
		typeof data.sectionDistribution.section_1_10.total === "number"
			? data.sectionDistribution.section_1_10
			: { average: 0, total: 0 },
	section2:
		data.sectionDistribution?.section_11_20 &&
		typeof data.sectionDistribution.section_11_20.average === "number" &&
		typeof data.sectionDistribution.section_11_20.total === "number"
			? data.sectionDistribution.section_11_20
			: { average: 0, total: 0 },
	section3:
		data.sectionDistribution?.section_21_30 &&
		typeof data.sectionDistribution.section_21_30.average === "number" &&
		typeof data.sectionDistribution.section_21_30.total === "number"
			? data.sectionDistribution.section_21_30
			: { average: 0, total: 0 },
	section4:
		data.sectionDistribution?.section_31_40 &&
		typeof data.sectionDistribution.section_31_40.average === "number" &&
		typeof data.sectionDistribution.section_31_40.total === "number"
			? data.sectionDistribution.section_31_40
			: { average: 0, total: 0 },
	section5:
		data.sectionDistribution?.section_41_45 &&
		typeof data.sectionDistribution.section_41_45.average === "number" &&
		typeof data.sectionDistribution.section_41_45.total === "number"
			? data.sectionDistribution.section_41_45
			: { average: 0, total: 0 },
};

// 입력값 유효성 검사 (데이터 검증 강화)
const validateInput = (value: string): boolean => {
	const str = String(value || "");
	if (str.trim() === "") return false;
	const num = Number(str);
	const maxRounds = typeof data.totalRounds === "number" ? data.totalRounds : 0;
	return (
		!Number.isNaN(num) && Number.isInteger(num) && num > 0 && num <= maxRounds
	);
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
			await goto(`/stats/sections/recent/${rounds}`);
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

// 구간별 균형도 분석
const getSectionBalance = (s1: number, s2: number, s3: number): string => {
	if (s1 >= 2 && s2 >= 2 && s3 >= 2) return "완전 균형";
	if (s1 >= 1 && s2 >= 1 && s3 >= 1) return "균형";
	if ([s1, s2, s3].filter((s) => s === 0).length === 1) return "부분 편중";
	return "심한 편중";
};
</script>

<MetaTags
	title="로또 6/45 구간 분석 통계 | 번호 구간별 분포 패턴"
	titleTemplate="%s | 645.live"
	description="로또 6/45 당첨번호의 구간별(1-10, 11-20, 21-30, 31-40, 41-45) 분포를 분석합니다. 구간별 균형도와 패턴을 통해 번호 선택에 도움을 제공합니다."
	canonical="https://645.live/stats/sections"
	keywords={["로또", "구간분석", "번호구간", "로또통계", "구간패턴", "로또예측", "6/45통계", "구간균형", "번호분포", "로또구간분석"]}
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
		url: 'https://645.live/stats/sections',
		title: '로또 6/45 구간 분석 통계 | 번호 구간별 분포 패턴',
		description: '로또 6/45 당첨번호의 구간별(1-10, 11-20, 21-30, 31-40, 41-45) 분포를 분석합니다. 구간별 균형도와 패턴을 통해 번호 선택에 도움을 제공합니다.',
		locale: 'ko_KR',
		images: [{
			url: 'https://645.live/images/lotto-sections-stats.png',
			width: 1200,
			height: 630,
			alt: '로또 6/45 구간 분석 통계',
			secureUrl: 'https://645.live/images/lotto-sections-stats.png',
			type: 'image/png'
		}],
		siteName: '645.live',
		article: {
			section: '로또 통계',
			tags: ['로또', '구간분석', '번호구간', '로또통계', '구간패턴', '6/45통계', '구간균형', '번호분포'],
			publishedTime: '2024-01-01T00:00:00.000Z',
			modifiedTime: new Date().toISOString()
		}
	}}
	twitter={{
		cardType: 'summary_large_image',
		site: '@645live',
		title: '로또 6/45 구간 분석 통계',
		description: '번호 구간별 분포 패턴으로 로또 번호 균형을 파악하세요.',
		image: 'https://645.live/images/lotto-sections-stats.png',
		imageAlt: '로또 6/45 구간 분석 통계'
	}}
/>

<JsonLd
	schema={{
		'@type': 'Dataset',
		name: '로또 6/45 구간 분석 통계',
		description: '로또 6/45 당첨번호의 구간별(1-10, 11-20, 21-30, 31-40, 41-45) 분포를 분석한 통계 데이터입니다.',
		url: 'https://645.live/stats/sections',
		creator: {
			'@type': 'Organization',
			name: '645.live'
		},
		temporalCoverage: `전체 ${data.totalRounds}회차`,
		spatial: {
			'@type': 'Country',
			name: '대한민국'
		},
		variableMeasured: [
			{
				'@type': 'PropertyValue',
				name: '1-10구간 평균',
				value: data.sectionDistribution?.section_1_10?.average || 0
			},
			{
				'@type': 'PropertyValue',
				name: '11-20구간 평균',
				value: data.sectionDistribution?.section_11_20?.average || 0
			},
			{
				'@type': 'PropertyValue',
				name: '21-30구간 평균',
				value: data.sectionDistribution?.section_21_30?.average || 0
			},
			{
				'@type': 'PropertyValue',
				name: '31-40구간 평균',
				value: data.sectionDistribution?.section_31_40?.average || 0
			},
			{
				'@type': 'PropertyValue',
				name: '41-45구간 평균',
				value: data.sectionDistribution?.section_41_45?.average || 0
			}
		]
	}}
/>

<div class="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
	<!-- Breadcrumbs -->
	<Breadcrumbs items={breadcrumbItems} />

	<!-- 페이지 헤더 -->
	<div class="text-center space-y-3 sm:space-y-4">
		<h1 class="text-xl sm:text-2xl lg:text-3xl font-bold text-primary px-2">로또 6/45 구간별 분석 통계</h1>
		<p class="text-sm sm:text-base text-base-content/70 px-2 leading-relaxed">
			로또 6/45 당첨번호의 <strong>구간별 분포</strong>와 패턴을 분석합니다.<br class="hidden sm:block" />
			<span class="block sm:inline mt-2 sm:mt-0">1구간 평균 <strong class="text-secondary">{sectionMappedData.section1.average.toFixed(2)}개</strong>, 2구간 평균 <strong class="text-accent">{sectionMappedData.section2.average.toFixed(2)}개</strong>의 구간별 분포 분석을 통해 당첨번호 패턴을 파악해보세요.</span>
		</p>
		<div class="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4 text-xs sm:text-sm text-base-content/60 mt-3 sm:mt-4">
			<span>📊 전체 분석: <strong class="text-primary">{data.totalRounds}회차</strong></span>
			<span>📈 구간 수: <strong class="text-secondary">5개 구간</strong></span>
			<span>🎯 분석 범위: <strong class="text-accent">1-45번</strong></span>
		</div>
	</div>

	<!-- 최근 회차 분석 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-4">
			<h2 class="card-title text-base sm:text-lg mb-3">최근 회차 분석</h2>
			<div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
				<div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
					<label for="rounds-input" class="text-sm font-medium whitespace-nowrap mb-1 sm:mb-0">분석 회차 (1-{data.totalRounds}):</label>
					<input
						id="rounds-input"
						type="text"
						inputmode="numeric"
						pattern="[0-9]*"
						bind:value={inputValue}
						onkeydown={handleKeydown}
						class="input input-bordered input-sm w-full sm:w-24 text-center min-h-[44px]"
						placeholder="100"
					/>
				</div>
				<button
					type="button"
					onclick={navigateToAnalysis}
					class="btn btn-primary btn-sm w-full sm:w-auto min-h-[44px]"
				>
					분석하기
				</button>
			</div>
			<p class="text-xs sm:text-sm text-base-content/60 mt-2">
				현재 <span class="font-semibold text-primary">전체 {data.totalRounds}회차</span> 데이터를 분석 중입니다.
			</p>
		</div>
	</div>

	<!-- 요약 통계 -->
	<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
		{#each Object.entries(sectionMappedData) as [sectionKey, sectionData]}
			{@const info = sectionInfo[sectionKey as keyof typeof sectionInfo]}
			
			<div class="stat bg-primary text-primary-content rounded-lg p-3 sm:p-4 min-h-[120px] sm:min-h-[140px]">
				<div class="stat-title text-primary-content/70 text-xs sm:text-sm truncate">{info.name}</div>
				<div class="stat-value text-lg sm:text-xl lg:text-2xl">{sectionData.average.toFixed(2)}</div>
				<div class="stat-desc text-primary-content/70 text-xs sm:text-sm">평균 개수</div>
			</div>
		{/each}
	</div>

	<!-- 구간별 통계 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-4 lg:p-6">
			<h2 class="card-title text-base sm:text-lg mb-3 sm:mb-4">구간별 출현 빈도</h2>
			<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
				{#each Object.entries(sectionInfo) as [, info]}
					{@const sectionData = sectionMappedData[Object.keys(sectionMappedData).find(k => sectionInfo[k as keyof typeof sectionInfo].name === info.name) as keyof typeof sectionMappedData]}
					{@const totalNumbers = data.totalRounds * 6}
					<div class="stat bg-base-200 rounded-lg p-3 sm:p-4 min-h-[120px] sm:min-h-[140px]">
						<div class="stat-title text-base-content/70 text-xs sm:text-sm truncate">{info.name}</div>
						<div class="stat-value text-base sm:text-lg lg:text-xl">{sectionData.total.toLocaleString()}</div>
						<div class="stat-desc text-xs sm:text-sm">
							<span class="font-semibold">{getPercentage(sectionData.total, totalNumbers)}%</span>
							<span class="text-base-content/60 block sm:inline"> • {info.range}</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>



	<!-- 최근 회차별 상세 데이터 -->
	{#if data.sectionStats && data.sectionStats.length > 0}
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-4 lg:p-6">
			<h2 class="card-title text-base sm:text-lg mb-3 sm:mb-4">최근 20회차 구간 분포</h2>
			
			<div class="overflow-x-auto -mx-3 sm:mx-0">
				<table class="table table-zebra w-full text-xs sm:text-sm">
					<thead>
						<tr>
							<th class="sticky left-0 bg-base-200 z-10 min-w-[60px] text-xs sm:text-sm">회차</th>
							<th class="text-red-600 min-w-[60px] text-xs sm:text-sm whitespace-nowrap">1구간 <span class="text-xs opacity-60">(1-10)</span></th>
							<th class="text-orange-600 min-w-[60px] text-xs sm:text-sm whitespace-nowrap">2구간 <span class="text-xs opacity-60">(11-20)</span></th>
							<th class="text-yellow-600 min-w-[60px] text-xs sm:text-sm whitespace-nowrap">3구간 <span class="text-xs opacity-60">(21-30)</span></th>
							<th class="text-blue-600 min-w-[60px] text-xs sm:text-sm whitespace-nowrap">4구간 <span class="text-xs opacity-60">(31-40)</span></th>
							<th class="text-green-600 min-w-[60px] text-xs sm:text-sm whitespace-nowrap">5구간 <span class="text-xs opacity-60">(41-45)</span></th>
							<th class="min-w-[90px] text-xs sm:text-sm">구간 조합</th>
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
							{@const sectionCounts = [
								statRecord.section_1_10,
								statRecord.section_11_20,
								statRecord.section_21_30,
								statRecord.section_31_40,
								statRecord.section_41_45
							]}
							{@const hasAllSections = sectionCounts.every(count => count > 0)}
							
							<tr>
								<td class="sticky left-0 bg-base-100 z-10 font-semibold text-xs sm:text-sm">{statRecord.round}회</td>
								<td class="text-center">
									<span class="badge badge-sm whitespace-nowrap {statRecord.section_1_10 > 0 ? 'badge-error' : 'badge-ghost'}">
										{statRecord.section_1_10}
									</span>
								</td>
								<td class="text-center">
									<span class="badge badge-sm whitespace-nowrap {statRecord.section_11_20 > 0 ? 'badge-warning' : 'badge-ghost'}">
										{statRecord.section_11_20}
									</span>
								</td>
								<td class="text-center">
									<span class="badge badge-sm whitespace-nowrap {statRecord.section_21_30 > 0 ? 'badge-accent' : 'badge-ghost'}">
										{statRecord.section_21_30}
									</span>
								</td>
								<td class="text-center">
									<span class="badge badge-sm whitespace-nowrap {statRecord.section_31_40 > 0 ? 'badge-info' : 'badge-ghost'}">
										{statRecord.section_31_40}
									</span>
								</td>
								<td class="text-center">
									<span class="badge badge-sm whitespace-nowrap {statRecord.section_41_45 > 0 ? 'badge-success' : 'badge-ghost'}">
										{statRecord.section_41_45}
									</span>
								</td>
								<td class="text-center text-xs sm:text-sm">
									{#if hasAllSections}
										<span class="badge badge-sm whitespace-nowrap badge-success">완전 분산</span>
									{:else if sectionCounts.filter(c => c > 0).length >= 4}
										<span class="badge badge-sm whitespace-nowrap badge-info">균형</span>
									{:else if sectionCounts.filter(c => c > 0).length >= 3}
										<span class="badge badge-sm whitespace-nowrap badge-warning">부분 편중</span>
									{:else}
										<span class="badge badge-sm whitespace-nowrap badge-error">심한 편중</span>
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


	<!-- 구간 분석 요약 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-4 lg:p-6">
			<h2 class="card-title text-base sm:text-lg mb-3 sm:mb-4">구간 분석 요약</h2>
			<div class="space-y-3 sm:space-y-4 text-sm">
				<p class="text-sm sm:text-base leading-relaxed">
					전체 <strong class="text-primary">{data.totalRounds}회차</strong>의 구간별 분포를 분석한 결과입니다. 
					1구간 평균 <strong class="text-secondary">{sectionMappedData.section1.average.toFixed(2)}개</strong>, 
					2구간 평균 <strong class="text-accent">{sectionMappedData.section2.average.toFixed(2)}개</strong> 등의 분포를 보이고 있습니다.
				</p>
				
				<div class="bg-info/5 p-3 sm:p-4 rounded-lg">
					<h3 class="font-semibold text-info mb-2 text-sm sm:text-base">💡 이 분석으로 알 수 있는 것</h3>
					<ul class="list-disc list-inside space-y-1 text-xs sm:text-sm text-base-content/70">
						<li><strong>구간별 분포 균형:</strong> 각 구간에서 번호가 얼마나 균등하게 선택되는지</li>
						<li><strong>출현 패턴:</strong> 특정 구간에 집중되는 경향이나 분산 패턴</li>
						<li><strong>트렌드 분석:</strong> 전체 {data.totalRounds}회차의 구간별 분포 변화 추이</li>
						<li><strong>예측 참고:</strong> 구간별 균형성을 통한 향후 번호 선택 가이드</li>
					</ul>
				</div>
				
				<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-3">
					{#each Object.entries(sectionInfo) as [, info]}
						<div class="flex items-center p-2 bg-base-200 rounded min-h-[40px]">
							<div class="w-3 h-3 rounded-full {info.class} mr-2 flex-shrink-0"></div>
							<span class="text-xs font-medium">{info.name} ({info.range})</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
