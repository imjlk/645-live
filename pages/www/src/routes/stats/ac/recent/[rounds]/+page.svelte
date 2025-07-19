<script lang="ts">
import { page } from "$app/state";
import { goto } from "$app/navigation";
import { MetaTags, JsonLd } from 'svelte-meta-tags';
import LinkButton from "$lib/ui/LinkButton.svelte";
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";
import type { PageData } from "./$types";

export let data: PageData;

// 사용자 입력 상태
let inputValue = String(data.selectedRounds);

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
			await goto(`/stats/ac/recent/${rounds}`);
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

// 백분율 계산
const getPercentage = (count: number, total: number): string => {
	return total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
};

// AC값별 색상 클래스
const getACColorClass = (ac: number): string => {
	if (ac <= 1) return "bg-red-100 text-red-800";
	if (ac <= 3) return "bg-orange-100 text-orange-800";
	if (ac <= 5) return "bg-yellow-100 text-yellow-800";
	if (ac <= 7) return "bg-green-100 text-green-800";
	if (ac <= 9) return "bg-blue-100 text-blue-800";
	return "bg-purple-100 text-purple-800";
};

// Breadcrumbs 데이터
const breadcrumbItems = [
	{ label: "홈", href: "/" },
	{ label: "통계", href: "/stats" },
	{ label: "AC값", href: "/stats/ac" },
	{ label: `최근 ${data.selectedRounds}회차`, current: true }
];
</script>

<MetaTags
	title={`로또 6/45 AC값 분석 (최근 ${data.selectedRounds}회차) | 산술적 복잡도 상세 분석`}
	titleTemplate="%s | 645.live"
	description={`로또 6/45 최근 ${data.selectedRounds}회차 AC값 상세 분석. 평균 AC값 ${data.acStats.summary.avgAC.toFixed(2)}, 분포 패턴 및 복잡도 분석을 통한 당첨번호 예측 정보 제공.`}
	canonical={`https://645.live/stats/ac/recent/${data.selectedRounds}`}
	keywords={[`로또 ${data.selectedRounds}회차`, "AC값 분석", "산술적복잡도", "당첨번호패턴", "로또통계", "복잡도분석", "6/45통계", "번호예측"]}
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
		url: `https://645.live/stats/ac/recent/${data.selectedRounds}`,
		title: `로또 6/45 AC값 분석 (최근 ${data.selectedRounds}회차) | 상세 통계`,
		description: `최근 ${data.selectedRounds}회차 AC값 상세 분석 - 평균 ${data.acStats.summary.avgAC.toFixed(2)}, 최대 ${data.acStats.summary.maxAC}, 최소 ${data.acStats.summary.minAC}`,
		locale: 'ko_KR',
		images: [{
			url: 'https://645.live/images/lotto-ac-analysis.png',
			width: 1200,
			height: 630,
			alt: `로또 6/45 AC값 ${data.selectedRounds}회차 분석`,
			secureUrl: 'https://645.live/images/lotto-ac-analysis.png',
			type: 'image/png'
		}],
		siteName: '645.live',
		article: {
			section: '로또 통계',
			tags: ['로또', 'AC값', '산술적복잡도', '당첨번호', '통계분석', '6/45', `${data.selectedRounds}회차`],
			publishedTime: '2024-01-01T00:00:00.000Z',
			modifiedTime: new Date().toISOString()
		}
	}}
	twitter={{
		cardType: 'summary_large_image',
		site: '@645live',
		title: `로또 6/45 AC값 ${data.selectedRounds}회차 분석`,
		description: `평균 AC값 ${data.acStats.summary.avgAC.toFixed(2)} | 최대 ${data.acStats.summary.maxAC} | 최소 ${data.acStats.summary.minAC}`,
		image: 'https://645.live/images/lotto-ac-analysis.png',
		imageAlt: `로또 6/45 AC값 ${data.selectedRounds}회차 분석`
	}}
/>

<JsonLd
	schema={{
		'@type': 'Dataset',
		name: `로또 6/45 AC값 ${data.selectedRounds}회차 분석 데이터`,
		description: `로또 6/45 최근 ${data.selectedRounds}회차의 산술적 복잡도(AC값) 상세 분석 데이터. 평균 AC값 ${data.acStats.summary.avgAC.toFixed(2)}, 분포 패턴 및 통계 정보를 제공합니다.`,
		url: `https://645.live/stats/ac/recent/${data.selectedRounds}`,
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
				name: '평균 AC값',
				value: data.acStats.summary.avgAC.toFixed(2)
			},
			{
				'@type': 'PropertyValue',
				name: '최대 AC값',
				value: data.acStats.summary.maxAC
			},
			{
				'@type': 'PropertyValue',
				name: '최소 AC값',
				value: data.acStats.summary.minAC
			},
			{
				'@type': 'PropertyValue',
				name: '분석 회차수',
				value: data.selectedRounds
			}
		],
		mainEntity: {
			'@type': 'StatisticalPopulation',
			name: '로또 6/45 당첨번호',
			populationSize: data.selectedRounds
		}
	}}
/>

<div class="p-6 space-y-6">
	<!-- Breadcrumbs -->
	<Breadcrumbs items={breadcrumbItems} />

	<!-- 페이지 헤더 -->
	<div class="text-center space-y-2">
		<h1 class="text-3xl font-bold text-primary">로또 6/45 AC값 상세 분석</h1>
		<p class="text-base-content/70">
			최근 <strong class="text-primary">{data.selectedRounds}회차</strong>의 <strong>AC값(Arithmetic Complexity)</strong> 분포와 패턴을 상세히 분석합니다.<br />
			평균 AC값 <strong class="text-secondary">{data.acStats.summary.avgAC.toFixed(2)}</strong>, 범위 <strong class="text-accent">{data.acStats.summary.minAC}~{data.acStats.summary.maxAC}</strong>의 복잡도 분석을 통해 
			당첨번호 패턴을 파악해보세요.
		</p>
		<div class="flex justify-center gap-4 text-sm text-base-content/60 mt-4">
			<span>📊 평균 AC값: <strong class="text-primary">{data.acStats.summary.avgAC.toFixed(2)}</strong></span>
			<span>📈 분석 회차: <strong class="text-secondary">{data.selectedRounds}회</strong></span>
			<span>🎯 범위: <strong class="text-accent">{data.acStats.summary.minAC}~{data.acStats.summary.maxAC}</strong></span>
		</div>
	</div>

	<!-- 최근 회차 분석 변경 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-4">
			<h2 class="card-title text-lg">최근 회차 분석</h2>
			<div class="flex items-center gap-4 flex-wrap">
				<div class="flex items-center gap-2">
					<label for="rounds-input" class="text-sm font-medium">최근 몇 회차:</label>
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
					href="/stats/ac"
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
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="stat bg-primary text-primary-content rounded-lg">
			<div class="stat-title text-primary-content/70">평균 AC값</div>
			<div class="stat-value text-2xl">{data.acStats.summary.avgAC.toFixed(2)}</div>
			<div class="stat-desc text-primary-content/70">최근 {data.selectedRounds}회차</div>
		</div>
		
		<div class="stat bg-secondary text-secondary-content rounded-lg">
			<div class="stat-title text-secondary-content/70">최대 AC값</div>
			<div class="stat-value text-2xl">{data.acStats.summary.maxAC}</div>
			<div class="stat-desc text-secondary-content/70">{getComplexityLabel(data.acStats.summary.maxAC)}</div>
		</div>
		
		<div class="stat bg-accent text-accent-content rounded-lg">
			<div class="stat-title text-accent-content/70">최소 AC값</div>
			<div class="stat-value text-2xl">{data.acStats.summary.minAC}</div>
			<div class="stat-desc text-accent-content/70">{getComplexityLabel(data.acStats.summary.minAC)}</div>
		</div>
		
		<div class="stat bg-info text-info-content rounded-lg">
			<div class="stat-title text-info-content/70">분석 회차</div>
			<div class="stat-value text-2xl">{data.acStats.summary.totalDraws}</div>
			<div class="stat-desc text-info-content/70">총 추첨 회수</div>
		</div>
	</div>

	<!-- AC값 분포 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">AC값 상세 분포</h2>
			
			<div class="overflow-x-auto">
				<table class="table table-zebra w-full">
					<thead>
						<tr>
							<th>AC값</th>
							<th>출현 횟수</th>
							<th>출현 비율</th>
							<th>복잡도</th>
							<th>설명</th>
						</tr>
					</thead>
					<tbody>
						{#each Object.entries(data.acStats.summary.distribution)
							.filter(([_, count]) => count > 0)
							.sort(([a], [b]) => Number(a) - Number(b)) as [ac, count]}
							<tr>
								<td class="font-semibold text-lg">{ac}</td>
								<td>{count}회</td>
								<td>{getPercentage(Number(count), data.acStats.summary.totalDraws)}%</td>
								<td>
									<div class="badge badge-outline">
										{getComplexityLabel(Number(ac))}
									</div>
								</td>
								<td class="text-sm text-base-content/70">
									{getComplexityDescription(Number(ac))}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
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
							<th>AC값</th>
							<th>복잡도</th>
							<th>설명</th>
						</tr>
					</thead>
					<tbody>
						{#each data.acStats.records as record}
							<tr>
								<td class="font-semibold">{record.round}회</td>
								<td class="text-lg font-bold text-primary">{record.ac_value}</td>
								<td>
									<div class="badge badge-outline">
										{getComplexityLabel(record.ac_value)}
									</div>
								</td>
								<td class="text-sm text-base-content/70">
									{getComplexityDescription(record.ac_value)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>

	<!-- AC값 가이드 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">AC값 분석 요약</h2>
			<div class="space-y-4 text-sm">
				<p class="text-base leading-relaxed">
					최근 <strong class="text-primary">{data.selectedRounds}회차</strong>의 AC값을 분석한 결과입니다. 
					평균 AC값은 <strong class="text-secondary">{data.acStats.summary.avgAC.toFixed(2)}</strong>이며, 
					{data.acStats.summary.minAC}~{data.acStats.summary.maxAC} 범위에서 분포하고 있습니다.
				</p>
				
				<div class="bg-info/5 p-4 rounded-lg">
					<h3 class="font-semibold text-info mb-2">💡 이 분석으로 알 수 있는 것</h3>
					<ul class="list-disc list-inside space-y-1 text-base-content/70">
						<li><strong>복잡도 패턴:</strong> 번호 조합의 복잡성 분포</li>
						<li><strong>출현 빈도:</strong> 각 AC값의 출현 횟수와 비율</li>
						<li><strong>트렌드 분석:</strong> 최근 {data.selectedRounds}회차의 AC값 변화 추이</li>
						<li><strong>예측 참고:</strong> 통계적 패턴을 통한 향후 번호 선택 가이드</li>
					</ul>
				</div>
			</div>
		</div>
	</div>
</div>
