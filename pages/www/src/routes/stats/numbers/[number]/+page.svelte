<script lang="ts">
import { goto } from "$app/navigation";
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";
import LinkButton from "$lib/ui/LinkButton.svelte";
import { JsonLd, MetaTags } from "svelte-meta-tags";
import type { PageData } from "./$types";

export let data: PageData;

// 사용자 입력 상태
let inputValue = String(data.selectedNumber);

// 입력값 유효성 검사
const validateInput = (value: string): boolean => {
	const str = String(value || "");
	if (str.trim() === "") return false;
	const num = Number(str);
	return !Number.isNaN(num) && num >= 1 && num <= 45;
};

// 다른 번호 분석 페이지로 이동
const navigateToNumber = async () => {
	const inputStr = String(inputValue || "");

	if (inputStr.trim() === "") {
		alert("분석할 번호를 입력해주세요.");
		return;
	}

	if (validateInput(inputStr)) {
		const number = Number(inputStr);
		try {
			await goto(`/stats/numbers/${number}`);
		} catch (error) {
			console.error("Navigation error:", error);
			alert("페이지 이동 중 오류가 발생했습니다.");
		}
	} else {
		alert("1부터 45까지의 번호를 입력해주세요.");
	}
};

// Enter 키 처리
const handleKeydown = (event: KeyboardEvent) => {
	if (event.key === "Enter") {
		navigateToNumber();
	}
};

// 출현 빈도 분석
const getFrequencyAnalysis = (frequency: string): string => {
	const freq = Number.parseFloat(frequency);
	const expected = (6 / 45) * 100; // 약 13.33%

	if (freq > expected + 2) return "높음";
	if (freq < expected - 2) return "낮음";
	return "보통";
};

// 색상 정보
$: colorDetail =
	data.colorInfo[data.numberStats.color as keyof typeof data.colorInfo];

// Breadcrumbs 데이터
const breadcrumbItems = [
	{ label: "홈", href: "/" },
	{ label: "통계", href: "/stats" },
	{ label: "번호별통계", href: "/stats/numbers" },
	{ label: "번호별 상세", current: true },
];
</script>

<MetaTags
	title={`로또 번호 ${data.selectedNumber}번 상세 분석 | 출현 빈도 및 패턴 분석`}
	titleTemplate="%s | 645.live"
	description={`로또 6/45 번호 ${data.selectedNumber}번 상세 분석. 총 ${data.numberStats.draw_count}회 출현, 출현율 ${data.numberStats.averageFrequency}%. 최근 당첨 이력과 패턴을 분석합니다.`}
	canonical={`https://www.645.live/stats/numbers/${data.selectedNumber}`}
	keywords={[`로또 ${data.selectedNumber}번`, "번호분석", "출현빈도", "당첨패턴", "로또통계", "번호별통계", "6/45통계", "번호예측"]}
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
			content: 'https://www.645.live'
		}
	]}
	openGraph={{
		type: 'article',
		url: `https://www.645.live/stats/numbers/${data.selectedNumber}`,
		title: `로또 번호 ${data.selectedNumber}번 상세 분석 | 출현 빈도 ${data.numberStats.averageFrequency}%`,
		description: `로또 6/45 번호 ${data.selectedNumber}번 상세 분석 - 총 ${data.numberStats.draw_count}회 출현, 보너스 ${data.numberStats.bonus_count}회. 최근 당첨 이력과 패턴 분석.`,
		locale: 'ko_KR',
		images: [{
			url: `https://www.645.live/og?${new URLSearchParams({
				title: encodeURIComponent(`${data.selectedNumber}번 상세 분석`),
				description: encodeURIComponent(`출현 ${data.numberStats.draw_count}회 (${data.numberStats.averageFrequency}%) | 보너스 ${data.numberStats.bonus_count}회 | ${colorDetail?.name || data.numberStats.color}색 | 편차 ${data.numberStats.deviation}`),
				layout: 'minimal',
				theme: data.numberStats.color === 'yellow' ? 'light' : 'dark',
				format: 'svg'
			}).toString()}`,
			width: 1200,
			height: 630,
			alt: `로또 번호 ${data.selectedNumber}번 분석`,
			type: 'image/svg+xml'
		}],
		siteName: '645.live',
		article: {
			section: '로또 통계',
			tags: ['로또', '번호분석', '출현빈도', '당첨번호', '통계분석', '6/45', `${data.selectedNumber}번`],
			publishedTime: '2024-01-01T00:00:00.000Z',
			modifiedTime: new Date().toISOString()
		}
	}}
	twitter={{
		cardType: 'summary_large_image',
		site: '@645live',
		title: `로또 번호 ${data.selectedNumber}번 분석`,
		description: `출현 ${data.numberStats.draw_count}회 (${data.numberStats.averageFrequency}%) | 보너스 ${data.numberStats.bonus_count}회`,
		image: `https://www.645.live/og?${new URLSearchParams({
			title: encodeURIComponent(`로또 ${data.selectedNumber}번 분석`),
			description: encodeURIComponent(`출현 ${data.numberStats.draw_count}회 | 출현률 ${data.numberStats.averageFrequency}%`),
			layout: 'minimal',
			theme: data.numberStats.color === 'yellow' ? 'light' : 'dark',
			format: 'svg'
		}).toString()}`,
		imageAlt: `로또 번호 ${data.selectedNumber}번 분석`
	}}
/>

<JsonLd
	schema={{
		'@type': 'Dataset',
		name: `로또 번호 ${data.selectedNumber}번 분석 데이터`,
		description: `로또 6/45 번호 ${data.selectedNumber}번의 상세 분석 데이터. 출현 빈도 ${data.numberStats.averageFrequency}%, 총 ${data.numberStats.draw_count}회 출현 및 최근 당첨 이력을 포함합니다.`,
		url: `https://www.645.live/stats/numbers/${data.selectedNumber}`,
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
				name: '출현 횟수',
				value: data.numberStats.draw_count
			},
			{
				'@type': 'PropertyValue',
				name: '보너스 출현 횟수',
				value: data.numberStats.bonus_count
			},
			{
				'@type': 'PropertyValue',
				name: '출현 빈도',
				value: `${data.numberStats.averageFrequency}%`
			},
			{
				'@type': 'PropertyValue',
				name: '마지막 출현 회차',
				value: data.numberStats.last_draw_round
			}
		],
		mainEntity: {
			'@type': 'Thing',
			name: `로또 번호 ${data.selectedNumber}`,
			description: `로또 6/45 번호 ${data.selectedNumber}번의 통계 정보`
		}
	}}
/>

<div class="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-5 lg:space-y-6">
	<!-- Breadcrumbs -->
	<Breadcrumbs items={breadcrumbItems} />

	<!-- 페이지 헤더 -->
	<div class="text-center space-y-2">
		<h1 class="text-xl sm:text-2xl lg:text-3xl font-bold text-primary">번호 {data.selectedNumber}번 상세 분석</h1>
		<p class="text-sm sm:text-base text-base-content/70">
			로또 6/45 번호 <strong class="text-primary">{data.selectedNumber}번</strong>의 상세 분석 정보입니다.<br />
			총 <strong class="text-secondary">{data.numberStats.draw_count}회</strong> 출현하여 <strong class="text-accent">{data.numberStats.averageFrequency}%</strong>의 출현율을 보입니다.
		</p>
		<div class="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 text-xs sm:text-sm text-base-content/60 mt-4">
			<span>🎯 출현 횟수: <strong class="text-primary">{data.numberStats.draw_count}회</strong></span>
			<span>🎁 보너스 출현: <strong class="text-secondary">{data.numberStats.bonus_count}회</strong></span>
			<span>📊 출현율: <strong class="text-accent">{data.numberStats.averageFrequency}%</strong></span>
		</div>
	</div>

	<!-- 번호 분석 변경 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-3 sm:p-4">
			<h2 class="card-title text-base sm:text-lg">다른 번호 분석</h2>
			<div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
				<div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-2 w-full">
					<label for="number-input" class="text-xs sm:text-sm font-medium whitespace-nowrap">번호 (1-45):</label>
					<input
						id="number-input"
						type="text"
						inputmode="numeric"
						pattern="[0-9]*"
						bind:value={inputValue}
						onkeydown={handleKeydown}
						class="input input-bordered input-sm w-full sm:w-20 text-center"
						placeholder="1"
					/>
				</div>
				<div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
					<button
						type="button"
						onclick={navigateToNumber}
						class="btn btn-primary btn-sm w-full sm:w-auto"
					>
						분석하기
					</button>
					<LinkButton
						href="/stats/numbers"
						class="btn btn-outline btn-sm w-full sm:w-auto"
					>
						전체 번호 보기
					</LinkButton>
				</div>
			</div>
		</div>
	</div>

	<!-- 번호 기본 정보 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">번호 기본 정보</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
				<!-- 번호 표시 -->
				<div class="text-center p-4 sm:p-6 bg-primary/10 rounded-lg">
					<div class="text-4xl sm:text-5xl lg:text-6xl font-bold text-primary mb-2">{data.selectedNumber}</div>
					<div class="text-xs sm:text-sm text-base-content/70">번호</div>
				</div>

				<!-- 색상 정보 -->
				{#if colorDetail}
				<div class="text-center p-4 sm:p-6 bg-base-200 rounded-lg">
					<div class="w-10 h-10 sm:w-12 sm:h-12 {colorDetail.bgClass} rounded-full mx-auto mb-3"></div>
					<div class="text-base sm:text-lg font-semibold {colorDetail.textClass}">{colorDetail.name}</div>
					<div class="text-xs sm:text-sm text-base-content/70">{colorDetail.range}</div>
				</div>
				{/if}

				<!-- 고저 구분 -->
				<div class="text-center p-4 sm:p-6 bg-base-200 rounded-lg">
					<div class="text-lg sm:text-xl lg:text-2xl font-bold mb-2 {data.isHighNumber ? 'text-red-600' : 'text-blue-600'}">
						{data.isHighNumber ? '고숫자' : '저숫자'}
					</div>
					<div class="text-xs sm:text-sm text-base-content/70">
						{data.isHighNumber ? '23-45 구간' : '1-22 구간'}
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- 출현 통계 -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
		<div class="stat bg-primary text-primary-content rounded-lg p-3 sm:p-4">
			<div class="stat-title text-primary-content/70 text-xs sm:text-sm">본 번호 출현</div>
			<div class="stat-value text-lg sm:text-xl lg:text-2xl">{data.numberStats.draw_count}회</div>
			<div class="stat-desc text-primary-content/70 text-xs sm:text-sm">전체 {data.totalRounds}회차 중</div>
		</div>
		
		<div class="stat bg-secondary text-secondary-content rounded-lg p-3 sm:p-4">
			<div class="stat-title text-secondary-content/70 text-xs sm:text-sm">보너스 출현</div>
			<div class="stat-value text-lg sm:text-xl lg:text-2xl">{data.numberStats.bonus_count}회</div>
			<div class="stat-desc text-secondary-content/70 text-xs sm:text-sm">보너스 번호로</div>
		</div>
		
		<div class="stat bg-accent text-accent-content rounded-lg p-3 sm:p-4">
			<div class="stat-title text-accent-content/70 text-xs sm:text-sm">출현율</div>
			<div class="stat-value text-lg sm:text-xl lg:text-2xl">{data.numberStats.averageFrequency}%</div>
			<div class="stat-desc text-accent-content/70 text-xs sm:text-sm">{getFrequencyAnalysis(data.numberStats.averageFrequency)}</div>
		</div>
		
		<div class="stat bg-info text-info-content rounded-lg p-3 sm:p-4">
			<div class="stat-title text-info-content/70 text-xs sm:text-sm">마지막 출현</div>
			<div class="stat-value text-lg sm:text-xl lg:text-2xl">{data.numberStats.last_draw_round}회</div>
			<div class="stat-desc text-info-content/70 text-xs sm:text-sm">최근 회차</div>
		</div>
	</div>

	<!-- 기대값 대비 분석 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">기대값 대비 분석</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
				<div class="text-center p-3 sm:p-4 bg-base-200 rounded-lg">
					<div class="text-sm sm:text-base lg:text-lg font-semibold text-primary">실제 출현</div>
					<div class="text-lg sm:text-xl lg:text-2xl font-bold">{data.numberStats.draw_count}회</div>
				</div>
				<div class="text-center p-3 sm:p-4 bg-base-200 rounded-lg">
					<div class="text-sm sm:text-base lg:text-lg font-semibold text-secondary">기대값</div>
					<div class="text-lg sm:text-xl lg:text-2xl font-bold">{data.numberStats.expectedFrequency}회</div>
				</div>
				<div class="text-center p-3 sm:p-4 bg-base-200 rounded-lg">
					<div class="text-sm sm:text-base lg:text-lg font-semibold text-accent">편차</div>
					<div class="text-lg sm:text-xl lg:text-2xl font-bold {Number(data.numberStats.deviation) > 0 ? 'text-success' : 'text-error'}">
						{Number(data.numberStats.deviation) > 0 ? '+' : ''}{data.numberStats.deviation}
					</div>
				</div>
			</div>
			<div class="mt-3 sm:mt-4 p-3 sm:p-4 bg-info/10 rounded-lg">
				<p class="text-xs sm:text-sm text-info">
					💡 각 번호의 이론적 출현 기대값은 전체 회차 × 6 ÷ 45 = {data.numberStats.expectedFrequency}회입니다.
					{Number(data.numberStats.deviation) > 0 ? '이 번호는 기대값보다 많이 출현했습니다.' : '이 번호는 기대값보다 적게 출현했습니다.'}
				</p>
			</div>
		</div>
	</div>

	<!-- 최근 출현 이력 -->
	{#if data.recentDraws.length > 0}
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title text-base sm:text-lg">최근 출현 이력 (최근 20회)</h2>
			
			<div class="overflow-x-auto">
				<table class="table table-zebra w-full min-w-[640px]">
					<thead>
						<tr>
							<th class="sticky left-0 bg-base-100 text-xs sm:text-sm min-w-[60px]">회차</th>
							<th class="text-xs sm:text-sm min-w-[200px]">당첨번호</th>
							<th class="text-xs sm:text-sm min-w-[60px]">보너스</th>
							<th class="text-xs sm:text-sm min-w-[80px]">출현 유형</th>
							<th class="text-xs sm:text-sm min-w-[80px]">추첨일</th>
						</tr>
					</thead>
					<tbody>
						{#each data.recentDraws as draw}
							<tr>
								<td class="sticky left-0 bg-base-100 font-semibold text-xs sm:text-sm">{draw.round}회</td>
								<td>
									<div class="flex gap-1 flex-wrap">
										{#each draw.numbers.sort((a, b) => a - b) as num}
											<span class="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold {num === data.selectedNumber ? 'bg-primary text-primary-content' : 'bg-base-300 text-base-content'}">
												{num}
											</span>
										{/each}
									</div>
								</td>
								<td class="text-center">
									<span class="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold mx-auto {draw.bonusNumber === data.selectedNumber ? 'bg-warning text-warning-content' : 'bg-base-300 text-base-content'}">
										{draw.bonusNumber}
									</span>
								</td>
								<td>
									{#if draw.isMain}
										<span class="badge badge-primary badge-sm">본 번호</span>
									{:else if draw.isBonus}
										<span class="badge badge-warning badge-sm">보너스</span>
									{:else}
										<span class="badge badge-ghost badge-sm">-</span>
									{/if}
								</td>
								<td class="text-xs sm:text-sm text-base-content/70">
									{new Date(draw.drawDate).toLocaleDateString('ko-KR')}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
	{/if}

	<!-- 번호 분석 정보 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title text-base sm:text-lg">번호 분석 정보</h2>
			<div class="space-y-3 sm:space-y-4 text-xs sm:text-sm">
				<p class="text-sm sm:text-base leading-relaxed">
					번호 <strong class="text-primary">{data.selectedNumber}번</strong>은 전체 {data.totalRounds}회차 중 
					<strong class="text-secondary">{data.numberStats.draw_count}회</strong> 출현하여 
					<strong class="text-accent">{data.numberStats.averageFrequency}%</strong>의 출현율을 보입니다.
				</p>
				
				<div class="bg-info/5 p-3 sm:p-4 rounded-lg">
					<h3 class="font-semibold text-info mb-2 text-sm sm:text-base">💡 이 번호의 특징</h3>
					<ul class="list-disc list-inside space-y-1 text-base-content/70 text-xs sm:text-sm">
						<li><strong>색상 구간:</strong> {colorDetail?.name} ({colorDetail?.range})</li>
						<li><strong>고저 구분:</strong> {data.isHighNumber ? '고숫자 (23-45)' : '저숫자 (1-22)'}</li>
						<li><strong>출현 빈도:</strong> {getFrequencyAnalysis(data.numberStats.averageFrequency)} (기대값 대비 {Number(data.numberStats.deviation) > 0 ? '+' : ''}{data.numberStats.deviation})</li>
						<li><strong>최근 출현:</strong> {data.numberStats.last_draw_round}회차</li>
					</ul>
				</div>
			</div>
		</div>
	</div>
</div>