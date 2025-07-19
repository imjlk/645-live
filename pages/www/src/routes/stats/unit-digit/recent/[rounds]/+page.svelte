<script lang="ts">
import { goto } from "$app/navigation";
import { page } from "$app/state";
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";
import LinkButton from "$lib/ui/LinkButton.svelte";
import { JsonLd, MetaTags } from "svelte-meta-tags";
import type { PageData } from "./$types";

interface Props {
	data: PageData;
}

let { data }: Props = $props();

// 사용자 입력 상태
let inputValue = $state(String(data.selectedRounds));

// Breadcrumbs 데이터
const breadcrumbItems = $derived([
	{ label: "홈", href: "/" },
	{ label: "통계", href: "/stats" },
	{ label: "끝자리수", href: "/stats/unit-digit" },
	{
		label: `최근 ${data.selectedRounds}회차`,
		href: `/stats/unit-digit/recent/${data.selectedRounds}`,
		current: true,
	},
]);

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
			await goto(`/stats/unit-digit/recent/${rounds}`);
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

// 끝자리수별 정보
const digitInfo = {
	digit0: {
		name: "0",
		class: "bg-gray-500",
		bgClass: "bg-gray-100",
		textClass: "text-gray-800",
	},
	digit1: {
		name: "1",
		class: "bg-red-500",
		bgClass: "bg-red-100",
		textClass: "text-red-800",
	},
	digit2: {
		name: "2",
		class: "bg-orange-500",
		bgClass: "bg-orange-100",
		textClass: "text-orange-800",
	},
	digit3: {
		name: "3",
		class: "bg-yellow-500",
		bgClass: "bg-yellow-100",
		textClass: "text-yellow-800",
	},
	digit4: {
		name: "4",
		class: "bg-green-500",
		bgClass: "bg-green-100",
		textClass: "text-green-800",
	},
	digit5: {
		name: "5",
		class: "bg-blue-500",
		bgClass: "bg-blue-100",
		textClass: "text-blue-800",
	},
	digit6: {
		name: "6",
		class: "bg-purple-500",
		bgClass: "bg-purple-100",
		textClass: "text-purple-800",
	},
	digit7: {
		name: "7",
		class: "bg-pink-500",
		bgClass: "bg-pink-100",
		textClass: "text-pink-800",
	},
	digit8: {
		name: "8",
		class: "bg-indigo-500",
		bgClass: "bg-indigo-100",
		textClass: "text-indigo-800",
	},
	digit9: {
		name: "9",
		class: "bg-teal-500",
		bgClass: "bg-teal-100",
		textClass: "text-teal-800",
	},
} as const;

// 백분율 계산
const getPercentage = (count: number, total: number): string => {
	return total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
};

// 끝자리수 패턴 정렬 (출현 빈도순)
const sortedPatterns = $derived(
	Object.entries(data.unitDigitStats.summary.distribution)
		.sort(([, a], [, b]) => Number(b) - Number(a))
		.slice(0, 10), // 상위 10개만 표시
);
</script>

<MetaTags
	title="로또 6/45 끝자리수 분석 통계 | 끝자리 숫자 분포 분석"
	titleTemplate="%s | 645.live"
	description={`로또 6/45 끝자리수 분포를 분석합니다 (최근 ${data.selectedRounds}회차). 0부터 9까지 각 끝자리 숫자의 출현 빈도와 패턴을 제공합니다.`}
	canonical={`https://645.live/stats/unit-digit/recent/${data.selectedRounds}`}
	keywords={["로또", "끝자리수", "끝자리분석", "로또통계", "숫자패턴", "끝자리패턴", "로또예측", "6/45통계", "끝자리수분석", "숫자분포분석"]}
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
		url: `https://645.live/stats/unit-digit/recent/${data.selectedRounds}`,
		title: `로또 6/45 끝자리수 분석 통계 | 끝자리 숫자 분포 패턴 (최근 ${data.selectedRounds}회차)`,
		description: `로또 6/45 끝자리수 분포를 분석합니다 (최근 ${data.selectedRounds}회차). 0부터 9까지 각 끝자리 숫자의 출현 빈도와 균형성을 제공합니다.`,
		locale: 'ko_KR',
		images: [{
			url: 'https://645.live/images/lotto-unit-digit-stats.png',
			width: 1200,
			height: 630,
			alt: '로또 6/45 끝자리수 분석 통계',
			secureUrl: 'https://645.live/images/lotto-unit-digit-stats.png',
			type: 'image/png'
		}],
		siteName: '645.live',
		article: {
			section: '로또 통계',
			tags: ['로또', '끝자리수', '끝자리분석', '로또통계', '숫자패턴', '끝자리패턴', '6/45통계', '끝자리수분석'],
			publishedTime: '2024-01-01T00:00:00.000Z',
			modifiedTime: new Date().toISOString()
		}
	}}
	twitter={{
		cardType: 'summary_large_image',
		site: '@645live',
		title: `로또 6/45 끝자리수 분석 통계 (최근 ${data.selectedRounds}회차)`,
		description: '끝자리 숫자 분포 분석으로 로또 번호 패턴을 파악하세요.',
		image: 'https://645.live/images/lotto-unit-digit-stats.png',
		imageAlt: '로또 6/45 끝자리수 분석 통계'
	}}
/>

<JsonLd
	schema={{
		'@type': 'Dataset',
		name: `로또 6/45 끝자리수 분석 통계 (최근 ${data.selectedRounds}회차)`,
		description: `로또 6/45 끝자리수 분포를 분석한 통계 데이터입니다 (최근 ${data.selectedRounds}회차).`,
		url: `https://645.live/stats/unit-digit/recent/${data.selectedRounds}`,
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
				name: '0 끝자리 평균',
				value: data.unitDigitStats.summary.digitAverages.digit0
			},
			{
				'@type': 'PropertyValue',
				name: '1 끝자리 평균',
				value: data.unitDigitStats.summary.digitAverages.digit1
			},
			{
				'@type': 'PropertyValue',
				name: '2 끝자리 평균',
				value: data.unitDigitStats.summary.digitAverages.digit2
			},
			{
				'@type': 'PropertyValue',
				name: '3 끝자리 평균',
				value: data.unitDigitStats.summary.digitAverages.digit3
			},
			{
				'@type': 'PropertyValue',
				name: '4 끝자리 평균',
				value: data.unitDigitStats.summary.digitAverages.digit4
			}
		]
	}}
/>

<div class="p-6 space-y-6">
	<!-- Breadcrumbs -->
	<Breadcrumbs items={breadcrumbItems} />

	<!-- 페이지 헤더 -->
	<div class="text-center space-y-2">
		<h1 class="text-3xl font-bold text-primary">로또 6/45 끝자리수 분석 상세 분석</h1>
		<p class="text-base-content/70">
			최근 <strong class="text-primary">{data.selectedRounds}회차</strong>의 <strong>끝자리 숫자 분포</strong>와 패턴을 상세히 분석합니다.<br />
			0 끝자리 평균 <strong class="text-secondary">{data.unitDigitStats.summary.digitAverages.digit0}개</strong>, 1 끝자리 평균 <strong class="text-accent">{data.unitDigitStats.summary.digitAverages.digit1}개</strong>의 끝자리수 분포 분석을 통해 
			당첨번호 패턴을 파악해보세요.
		</p>
		<div class="flex justify-center gap-4 text-sm text-base-content/60 mt-4">
			<span>📊 최빈 끝자리: <strong class="text-primary">{digitInfo[data.unitDigitStats.summary.mostFrequentDigit[0] as keyof typeof digitInfo]?.name}</strong></span>
			<span>📈 분석 회차: <strong class="text-secondary">{data.selectedRounds}회</strong></span>
			<span>🎯 평균 개수: <strong class="text-accent">{data.unitDigitStats.summary.mostFrequentDigit[1]}개</strong></span>
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
						onkeydown={handleKeydown}
						class="input input-bordered input-sm w-24 text-center"
						placeholder="100"
					/>
					<span class="text-sm opacity-60">회차 (최대 {data.totalRounds})</span>
				</div>
				<button
					type="button"
					onclick={navigateToAnalysis}
					class="btn btn-primary btn-sm"
				>
					분석하기
				</button>
				<LinkButton
					href="/stats/unit-digit"
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
		{#each Object.entries(data.unitDigitStats.summary.digitAverages).slice(0, 5) as [digitKey, average]}
			{@const info = digitInfo[digitKey as keyof typeof digitInfo]}
			
			<div class="stat bg-primary text-primary-content rounded-lg">
				<div class="stat-title text-primary-content/70">{info.name} 끝자리</div>
				<div class="stat-value text-2xl">{average}</div>
				<div class="stat-desc text-primary-content/70">평균 개수</div>
			</div>
		{/each}
	</div>

	<!-- 끝자리수별 통계 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">끝자리수별 출현 빈도</h2>
			<div class="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-4">
				{#each Object.entries(digitInfo) as [key, info]}
					{@const count = data.unitDigitStats.summary.digitCounts[key as keyof typeof data.unitDigitStats.summary.digitCounts]}
					{@const totalNumbers = data.unitDigitStats.summary.totalDraws * 6}
					<div class="p-4 rounded-lg border {info.bgClass}">
						<div class="flex items-center justify-center mb-2">
							<div class="w-8 h-8 rounded-full {info.class} flex items-center justify-center text-white font-bold">
								{info.name}
							</div>
						</div>
						<div class="text-center text-lg font-bold {info.textClass} mb-1">{count}</div>
						<div class="text-center text-xs {info.textClass} mb-2">
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

	<!-- 자주 나오는 끝자리수 패턴 -->
	<div class="card bg-base-100 shadow-sm">
		<h2 class="card-title">자주 나오는 끝자리수 패턴 (상위 10개)</h2>
		<div class="card-body">
			<div class="space-y-3">
				{#each sortedPatterns as [pattern, count]}
					{@const digits = pattern.split('-')}
					<div class="flex items-center justify-between p-3 bg-base-200 rounded-lg">
						<div class="flex items-center space-x-4">
							<div class="flex items-center space-x-1">
								{#each digits as digitCount, index}
									{@const digitKey = Object.keys(digitInfo)[index] as keyof typeof digitInfo}
									{@const info = digitInfo[digitKey]}
									<div class="flex items-center">
										<div class="w-3 h-3 rounded-full {info.class}"></div>
										<span class="text-sm font-medium ml-1">{digitCount}</span>
									</div>
								{/each}
							</div>
							<div class="text-sm text-base-content/60">
								({digits.map((c, i) => `${digitInfo[Object.keys(digitInfo)[i] as keyof typeof digitInfo].name} ${c}개`).join(', ')})
							</div>
						</div>
						<div class="flex items-center space-x-2">
							<span class="font-semibold">{count}회</span>
							<span class="text-sm text-base-content/60">
								({getPercentage(Number(count), data.unitDigitStats.summary.totalDraws)}%)
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
							<th class="text-gray-600">0</th>
							<th class="text-red-600">1</th>
							<th class="text-orange-600">2</th>
							<th class="text-yellow-600">3</th>
							<th class="text-green-600">4</th>
							<th class="text-blue-600">5</th>
							<th class="text-purple-600">6</th>
							<th class="text-pink-600">7</th>
							<th class="text-indigo-600">8</th>
							<th class="text-teal-600">9</th>
							<th>분포 균형</th>
						</tr>
					</thead>
					<tbody>
						{#each data.unitDigitStats.records as record}
							{@const digitCounts = [
								record.digit_0_count,
								record.digit_1_count,
								record.digit_2_count,
								record.digit_3_count,
								record.digit_4_count,
								record.digit_5_count,
								record.digit_6_count,
								record.digit_7_count,
								record.digit_8_count,
								record.digit_9_count
							]}
							{@const hasAllDigits = digitCounts.every(count => count > 0)}
							
							<tr>
								<td class="font-semibold">{record.round}회</td>
								<td class="text-center">
									<span class="badge {record.digit_0_count > 0 ? 'badge-neutral' : 'badge-ghost'}">
										{record.digit_0_count}
									</span>
								</td>
								<td class="text-center">
									<span class="badge {record.digit_1_count > 0 ? 'badge-error' : 'badge-ghost'}">
										{record.digit_1_count}
									</span>
								</td>
								<td class="text-center">
									<span class="badge {record.digit_2_count > 0 ? 'badge-warning' : 'badge-ghost'}">
										{record.digit_2_count}
									</span>
								</td>
								<td class="text-center">
									<span class="badge {record.digit_3_count > 0 ? 'badge-accent' : 'badge-ghost'}">
										{record.digit_3_count}
									</span>
								</td>
								<td class="text-center">
									<span class="badge {record.digit_4_count > 0 ? 'badge-success' : 'badge-ghost'}">
										{record.digit_4_count}
									</span>
								</td>
								<td class="text-center">
									<span class="badge {record.digit_5_count > 0 ? 'badge-info' : 'badge-ghost'}">
										{record.digit_5_count}
									</span>
								</td>
								<td class="text-center">
									<span class="badge {record.digit_6_count > 0 ? 'badge-secondary' : 'badge-ghost'}">
										{record.digit_6_count}
									</span>
								</td>
								<td class="text-center">
									<span class="badge {record.digit_7_count > 0 ? 'badge-primary' : 'badge-ghost'}">
										{record.digit_7_count}
									</span>
								</td>
								<td class="text-center">
									<span class="badge {record.digit_8_count > 0 ? 'badge-neutral' : 'badge-ghost'}">
										{record.digit_8_count}
									</span>
								</td>
								<td class="text-center">
									<span class="badge {record.digit_9_count > 0 ? 'badge-accent' : 'badge-ghost'}">
										{record.digit_9_count}
									</span>
								</td>
								<td>
									{#if digitCounts.filter(c => c > 0).length >= 7}
										<span class="badge badge-success">매우 분산</span>
									{:else if digitCounts.filter(c => c > 0).length >= 5}
										<span class="badge badge-info">균형</span>
									{:else if digitCounts.filter(c => c > 0).length >= 3}
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

	<!-- 끝자리수 분석 요약 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">끝자리수 분석 요약</h2>
			<div class="space-y-4 text-sm">
				<p class="text-base leading-relaxed">
					최근 <strong class="text-primary">{data.selectedRounds}회차</strong>의 끝자리수 분포를 분석한 결과입니다. 
					0 끝자리 평균 <strong class="text-secondary">{data.unitDigitStats.summary.digitAverages.digit0}개</strong>, 
					1 끝자리 평균 <strong class="text-accent">{data.unitDigitStats.summary.digitAverages.digit1}개</strong> 등의 분포를 보이고 있습니다.
				</p>
				
				<div class="bg-info/5 p-4 rounded-lg">
					<h3 class="font-semibold text-info mb-2">💡 이 분석으로 알 수 있는 것</h3>
					<ul class="list-disc list-inside space-y-1 text-base-content/70">
						<li><strong>끝자리 분포 균형:</strong> 0부터 9까지 각 끝자리 숫자의 출현 빈도</li>
						<li><strong>편중 패턴:</strong> 특정 끝자리 숫자에 집중되는 경향이나 분산 패턴</li>
						<li><strong>트렌드 분석:</strong> 최근 {data.selectedRounds}회차의 끝자리수 분포 변화 추이</li>
						<li><strong>예측 참고:</strong> 끝자리수 균형성을 통한 향후 번호 선택 가이드</li>
					</ul>
				</div>
			</div>
		</div>
	</div>
</div>