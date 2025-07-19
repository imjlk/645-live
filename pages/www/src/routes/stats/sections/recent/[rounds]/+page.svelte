<script lang="ts">
import { goto } from "$app/navigation";
import { page } from "$app/state";
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";
import LinkButton from "$lib/ui/LinkButton.svelte";
import { JsonLd, MetaTags } from "svelte-meta-tags";
import type { PageData } from "./$types";

export let data: PageData;

// 사용자 입력 상태
let inputValue = String(data.selectedRounds);

// Breadcrumbs 데이터
const breadcrumbItems = [
	{ label: "홈", href: "/" },
	{ label: "통계", href: "/stats" },
	{ label: "구간별분석", href: "/stats/sections" },
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

// 구간별 정보
const sectionInfo = {
	section1: {
		name: "1구간",
		range: "1-9",
		class: "bg-red-500",
		bgClass: "bg-red-100",
		textClass: "text-red-800",
	},
	section2: {
		name: "2구간",
		range: "10-18",
		class: "bg-orange-500",
		bgClass: "bg-orange-100",
		textClass: "text-orange-800",
	},
	section3: {
		name: "3구간",
		range: "19-27",
		class: "bg-yellow-500",
		bgClass: "bg-yellow-100",
		textClass: "text-yellow-800",
	},
	section4: {
		name: "4구간",
		range: "28-36",
		class: "bg-blue-500",
		bgClass: "bg-blue-100",
		textClass: "text-blue-800",
	},
	section5: {
		name: "5구간",
		range: "37-45",
		class: "bg-green-500",
		bgClass: "bg-green-100",
		textClass: "text-green-800",
	},
} as const;

// 백분율 계산
const getPercentage = (count: number, total: number): string => {
	return total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
};

// 구간 패턴 정렬 (출현 빈도순)
$: sortedPatterns = Object.entries(data.sectionStats.summary.distribution)
	.sort(([, a], [, b]) => Number(b) - Number(a))
	.slice(0, 10); // 상위 10개만 표시
</script>

<MetaTags
	title="로또 6/45 구간별 분석 통계 | 구간별 번호 분포 분석"
	titleTemplate="%s | 645.live"
	description={`로또 6/45 구간별 번호 분포를 분석합니다 (최근 ${data.selectedRounds}회차). 1구간(1-9), 2구간(10-18), 3구간(19-27), 4구간(28-36), 5구간(37-45)의 분포 패턴과 균형성을 제공합니다.`}
	canonical={`https://645.live/stats/sections/recent/${data.selectedRounds}`}
	keywords={["로또", "구간별분석", "번호분포", "로또통계", "구간패턴", "번호균형", "로또예측", "6/45통계", "구간별통계", "번호구간분석"]}
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
		url: `https://645.live/stats/sections/recent/${data.selectedRounds}`,
		title: `로또 6/45 구간별 분석 통계 | 번호 분포 패턴 (최근 ${data.selectedRounds}회차)`,
		description: `로또 6/45 구간별 번호 분포를 분석합니다 (최근 ${data.selectedRounds}회차). 1구간부터 5구간까지의 균형성과 분포 패턴을 제공합니다.`,
		locale: 'ko_KR',
		images: [{
			url: 'https://645.live/images/lotto-section-stats.png',
			width: 1200,
			height: 630,
			alt: '로또 6/45 구간별 분석 통계',
			secureUrl: 'https://645.live/images/lotto-section-stats.png',
			type: 'image/png'
		}],
		siteName: '645.live',
		article: {
			section: '로또 통계',
			tags: ['로또', '구간별분석', '번호분포', '로또통계', '구간패턴', '번호균형', '6/45통계', '구간별통계'],
			publishedTime: '2024-01-01T00:00:00.000Z',
			modifiedTime: new Date().toISOString()
		}
	}}
	twitter={{
		cardType: 'summary_large_image',
		site: '@645live',
		title: `로또 6/45 구간별 분석 통계 (최근 ${data.selectedRounds}회차)`,
		description: '구간별 번호 분포 분석으로 로또 번호 균형성을 파악하세요.',
		image: 'https://645.live/images/lotto-section-stats.png',
		imageAlt: '로또 6/45 구간별 분석 통계'
	}}
/>

<JsonLd
	schema={{
		'@type': 'Dataset',
		name: `로또 6/45 구간별 분석 통계 (최근 ${data.selectedRounds}회차)`,
		description: `로또 6/45 구간별 번호 분포를 분석한 통계 데이터입니다 (최근 ${data.selectedRounds}회차).`,
		url: `https://645.live/stats/sections/recent/${data.selectedRounds}`,
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
				name: '1구간 평균',
				value: data.sectionStats.summary.sectionAverages.section1
			},
			{
				'@type': 'PropertyValue',
				name: '2구간 평균',
				value: data.sectionStats.summary.sectionAverages.section2
			},
			{
				'@type': 'PropertyValue',
				name: '3구간 평균',
				value: data.sectionStats.summary.sectionAverages.section3
			},
			{
				'@type': 'PropertyValue',
				name: '4구간 평균',
				value: data.sectionStats.summary.sectionAverages.section4
			},
			{
				'@type': 'PropertyValue',
				name: '5구간 평균',
				value: data.sectionStats.summary.sectionAverages.section5
			}
		]
	}}
/>

<div class="p-6 space-y-6">
	<!-- Breadcrumbs -->
	<Breadcrumbs items={breadcrumbItems} />

	<!-- 페이지 헤더 -->
	<div class="text-center space-y-2">
		<h1 class="text-3xl font-bold text-primary">로또 6/45 구간별 분석 상세 분석</h1>
		<p class="text-base-content/70">
			최근 <strong class="text-primary">{data.selectedRounds}회차</strong>의 <strong>구간별 번호 분포</strong>와 패턴을 상세히 분석합니다.<br />
			1구간 평균 <strong class="text-secondary">{data.sectionStats.summary.sectionAverages.section1}개</strong>, 2구간 평균 <strong class="text-accent">{data.sectionStats.summary.sectionAverages.section2}개</strong>의 구간별 분포 분석을 통해 
			당첨번호 패턴을 파악해보세요.
		</p>
		<div class="flex justify-center gap-4 text-sm text-base-content/60 mt-4">
			<span>📊 최빈 구간: <strong class="text-primary">{sectionInfo[data.sectionStats.summary.mostFrequentSection[0] as keyof typeof sectionInfo]?.name}</strong></span>
			<span>📈 분석 회차: <strong class="text-secondary">{data.selectedRounds}회</strong></span>
			<span>🎯 평균 개수: <strong class="text-accent">{data.sectionStats.summary.mostFrequentSection[1]}개</strong></span>
		</div>
	</div>

	<!-- 최근 회차 분석 변경 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-4">
			<h2 class="card-title text-lg">최근 회차 분석</h2>
			<div class="flex items-center gap-4 flex-wrap">
				<div class="flex items-center gap-2">
					<label for="rounds-input" class="text-sm font-medium">최근:</label>
					<input
						id="rounds-input"
						type="text"
						inputmode="numeric"
						pattern="[0-9]*"
						bind:value={inputValue}
						on:keydown={handleKeydown}
						class="input input-bordered input-sm w-24 text-center"
						placeholder="100"
					/>
					<span class="text-sm opacity-60">회차 (최대 {data.totalRounds})</span>
				</div>
				<button
					type="button"
					on:click={navigateToAnalysis}
					class="btn btn-primary btn-sm"
				>
					분석하기
				</button>
				<LinkButton
					href="/stats/sections"
					class="btn btn-outline btn-sm"
				>
					전체 회차 보기
				</LinkButton>
			</div>
			<p class="text-sm text-base-content/60">
				현재 최근 <span class="font-semibold text-primary">{data.selectedRounds}회차</span> 데이터를 분석 중입니다. 다른 회차 수를 입력하여 비교 분석해보세요.
			</p>
		</div>
	</div>

	<!-- 요약 통계 -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
		{#each Object.entries(data.sectionStats.summary.sectionAverages) as [sectionKey, average]}
			{@const info = sectionInfo[sectionKey as keyof typeof sectionInfo]}
			
			<div class="stat bg-primary text-primary-content rounded-lg">
				<div class="stat-title text-primary-content/70">{info.name}</div>
				<div class="stat-value text-2xl">{average}</div>
				<div class="stat-desc text-primary-content/70">평균 개수</div>
			</div>
		{/each}
	</div>

	<!-- 구간별 통계 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">구간별 출현 빈도</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
				{#each Object.entries(sectionInfo) as [key, info]}
					{@const count = data.sectionStats.summary.sectionCounts[key as keyof typeof data.sectionStats.summary.sectionCounts]}
					{@const totalNumbers = data.sectionStats.summary.totalDraws * 6}
					<div class="p-4 rounded-lg border {info.bgClass}">
						<div class="flex items-center mb-2">
							<div class="w-4 h-4 rounded-full {info.class} mr-2"></div>
							<span class="font-semibold {info.textClass}">{info.name}</span>
						</div>
						<div class="text-xs text-gray-600 mb-2">{info.range}</div>
						<div class="text-lg font-bold {info.textClass} mb-1">{count}</div>
						<div class="text-xs {info.textClass} mb-2">
							{getPercentage(count, totalNumbers)}%
						</div>
						<div class="w-full bg-white/50 rounded-full h-2">
							<div
								class="{info.class} h-2 rounded-full transition-all duration-300"
								style="width: {getPercentage(count, totalNumbers)}%"
							></div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- 자주 나오는 구간 패턴 -->
	<div class="card bg-base-100 shadow-sm">
		<h2 class="card-title">자주 나오는 구간 패턴 (상위 10개)</h2>
		<div class="card-body">
			<div class="space-y-3">
				{#each sortedPatterns as [pattern, count]}
					{@const sections = pattern.split('-')}
					<div class="flex items-center justify-between p-3 bg-base-200 rounded-lg">
						<div class="flex items-center space-x-4">
							<div class="flex items-center space-x-1">
								{#each sections as sectionCount, index}
									{@const sectionKey = Object.keys(sectionInfo)[index] as keyof typeof sectionInfo}
									{@const info = sectionInfo[sectionKey]}
									<div class="flex items-center">
										<div class="w-3 h-3 rounded-full {info.class}"></div>
										<span class="text-sm font-medium ml-1">{sectionCount}</span>
									</div>
								{/each}
							</div>
							<div class="text-sm text-base-content/60">
								({sections.map((c, i) => `${sectionInfo[Object.keys(sectionInfo)[i] as keyof typeof sectionInfo].name} ${c}개`).join(', ')})
							</div>
						</div>
						<div class="flex items-center space-x-2">
							<span class="font-semibold">{count}회</span>
							<span class="text-sm text-base-content/60">
								({getPercentage(Number(count), data.sectionStats.summary.totalDraws)}%)
							</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- 추첨 결과 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">추첨 결과 ({data.selectedRounds}회차)</h2>
			
			<div class="overflow-x-auto">
				<table class="table table-zebra w-full">
					<thead>
						<tr>
							<th>회차</th>
							<th class="text-red-600">1구간</th>
							<th class="text-orange-600">2구간</th>
							<th class="text-yellow-600">3구간</th>
							<th class="text-blue-600">4구간</th>
							<th class="text-green-600">5구간</th>
							<th>구간 조합</th>
						</tr>
					</thead>
					<tbody>
						{#each data.sectionStats.records as record}
							{@const sectionCounts = [
								record.section1_count,
								record.section2_count,
								record.section3_count,
								record.section4_count,
								record.section5_count
							]}
							{@const hasAllSections = sectionCounts.every(count => count > 0)}
							
							<tr>
								<td class="font-semibold">{record.round}회</td>
								<td class="text-center">
									<span class="badge {record.section1_count > 0 ? 'badge-error' : 'badge-ghost'}">
										{record.section1_count}
									</span>
								</td>
								<td class="text-center">
									<span class="badge {record.section2_count > 0 ? 'badge-warning' : 'badge-ghost'}">
										{record.section2_count}
									</span>
								</td>
								<td class="text-center">
									<span class="badge {record.section3_count > 0 ? 'badge-accent' : 'badge-ghost'}">
										{record.section3_count}
									</span>
								</td>
								<td class="text-center">
									<span class="badge {record.section4_count > 0 ? 'badge-info' : 'badge-ghost'}">
										{record.section4_count}
									</span>
								</td>
								<td class="text-center">
									<span class="badge {record.section5_count > 0 ? 'badge-success' : 'badge-ghost'}">
										{record.section5_count}
									</span>
								</td>
								<td>
									{#if hasAllSections}
										<span class="badge badge-success">완전 분산</span>
									{:else if sectionCounts.filter(c => c > 0).length >= 4}
										<span class="badge badge-info">균형</span>
									{:else if sectionCounts.filter(c => c > 0).length >= 3}
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

	<!-- 구간 분석 요약 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">구간 분석 요약</h2>
			<div class="space-y-4 text-sm">
				<p class="text-base leading-relaxed">
					최근 <strong class="text-primary">{data.selectedRounds}회차</strong>의 구간별 분포를 분석한 결과입니다. 
					1구간 평균 <strong class="text-secondary">{data.sectionStats.summary.sectionAverages.section1}개</strong>, 
					2구간 평균 <strong class="text-accent">{data.sectionStats.summary.sectionAverages.section2}개</strong> 등의 분포를 보이고 있습니다.
				</p>
				
				<div class="bg-info/5 p-4 rounded-lg">
					<h3 class="font-semibold text-info mb-2">💡 이 분석으로 알 수 있는 것</h3>
					<ul class="list-disc list-inside space-y-1 text-base-content/70">
						<li><strong>구간별 분포 균형:</strong> 각 구간에서 번호가 얼마나 균등하게 선택되는지</li>
						<li><strong>출현 패턴:</strong> 특정 구간에 집중되는 경향이나 분산 패턴</li>
						<li><strong>트렌드 분석:</strong> 최근 {data.selectedRounds}회차의 구간별 분포 변화 추이</li>
						<li><strong>예측 참고:</strong> 구간별 균형성을 통한 향후 번호 선택 가이드</li>
					</ul>
				</div>
				
				<div class="grid grid-cols-1 sm:grid-cols-5 gap-2 mt-3">
					{#each Object.entries(sectionInfo) as [key, info]}
						<div class="flex items-center p-2 bg-base-200 rounded">
							<div class="w-3 h-3 rounded-full {info.class} mr-2"></div>
							<span class="text-xs font-medium">{info.name} ({info.range})</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
