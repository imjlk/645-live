<script lang="ts">
import { goto } from "$app/navigation";
import { page } from "$app/stores";
import LottoBall from "$lib/modules/lotto/components/LottoBall.svelte";
import ValueIncrementEffect from "$lib/modules/lotto/components/ValueIncrementEffect.svelte";
import {
	type LottoDrawScanCount,
	getScanDataSafely,
	subscribeToScanCountUpdates,
} from "$lib/stores/streamStore";
import { calculateDisplayRound } from "$lib/utils/lotto-api";
import { onDestroy, onMount } from "svelte";
import { MetaTags } from "svelte-meta-tags";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();

// Get ballNumber from URL params - ensure it updates when route changes
const ballNumber = $derived(Number($page.params.index));

// Reactive states for real-time updates
let ballValue = $state(0);
let isUpdated = $state(false);

// 전역 스트림 구독 해제 함수
let unsubscribeStream: (() => void) | null = null;

onMount(async () => {
	const displayRound = calculateDisplayRound();
	const scanData = await getScanDataSafely(displayRound);

	if (scanData) {
		const scanCountField =
			`scan_count_${ballNumber}` as keyof LottoDrawScanCount;
		const ballScanCount = Number(scanData[scanCountField]) || 0;
		ballValue = ballScanCount;
	} else {
		ballValue = 0;
	}

	unsubscribeStream = subscribeToScanCountUpdates(
		`ball-${ballNumber}`,
		(scanData) => {
			if (scanData.round === data.latestRound) {
				const scanCountField =
					`scan_count_${ballNumber}` as keyof LottoDrawScanCount;
				const newScanCount = Number(scanData[scanCountField]) || 0;

				if (newScanCount > ballValue) {
					isUpdated = true;
					setTimeout(() => {
						isUpdated = false;
					}, 1000);
				}
				ballValue = newScanCount;
			}
		},
	);
});

onDestroy(() => {
	if (unsubscribeStream) {
		unsubscribeStream();
	}
});

// Navigation functions
const goToPrevious = () => {
	if (ballNumber > 1) {
		goto(`/n/${ballNumber - 1}`);
	}
};

const goToNext = () => {
	if (ballNumber < 45) {
		goto(`/n/${ballNumber + 1}`);
	}
};

// Keyboard navigation
const handleKeydown = (event: KeyboardEvent) => {
	if (event.key === "ArrowLeft") {
		goToPrevious();
	} else if (event.key === "ArrowRight") {
		goToNext();
	}
};

const getColorClass = (color: string | undefined) => {
	const colorMap: Record<string, string> = {
		yellow: "bg-yellow-400 text-black",
		blue: "bg-blue-500 text-white",
		red: "bg-red-500 text-white",
		gray: "bg-gray-500 text-white",
		green: "bg-green-500 text-white",
	};
	return color ? colorMap[color] : "bg-gray-300 text-black";
};
</script>

<MetaTags
	title={`로또 번호 ${ballNumber} 실시간 스캔 현황 - 당첨 통계 및 궁합번호`}
	description={`🎯 로또 번호 ${ballNumber}의 완전분석! ${data.numberStats ? `총 ${data.numberStats.frequency}회 출현(${data.numberStats.averageFrequency}%) | ${data.latestRound && data.numberStats.lastDrawRound ? `${data.latestRound - data.numberStats.lastDrawRound}회차째 미출현` : '최근 당첨 기록'} | 궁합번호와 실시간 스캔현황까지!` : '실시간 스캔 현황과 상세 통계를 지금 확인하세요! 당첨 패턴 분석과 궁합번호까지 한번에!'}`}
	canonical={`https://www.645.live/n/${ballNumber}`}
	keywords={[
		`로또${ballNumber}`,
		`로또번호${ballNumber}`,
		`${ballNumber}번스캔`,
		`로또${ballNumber}번스캔현황`,
		`로또${ballNumber}번궁합`,
		"로또스캔",
		"로또실시간", 
		"로또당첨번호",
		"로또스캔현황",
		"로또번호스캔",
		"645로또",
		"로또현황"
	]}
	openGraph={{
		title: `로또 번호 ${ballNumber} 실시간 스캔 현황`,
		description: `🎯 로또 번호 ${ballNumber}의 실시간 스캔 현황 공개! 지금 이 순간도 스캔이 진행중입니다.`,
		url: `https://www.645.live/n/${ballNumber}`,
		type: "article",
		siteName: "645.live",
		locale: "ko_KR",
		images: [
			{
				url: `https://www.645.live/og/?title=${encodeURIComponent(`로또 번호 ${ballNumber} 완전분석`)}&description=${encodeURIComponent(`${data.numberStats ? `총 ${data.numberStats.frequency}회 출현 - ${data.latestRound && data.numberStats.lastDrawRound ? `${data.latestRound - data.numberStats.lastDrawRound}회차째 미출현` : '최근 당첨'} - 궁합번호와 실시간 스캔현황까지` : '실시간 스캔현황과 상세 통계를 지금 확인하세요'}`)}&layout=centered&theme=dark&format=svg`,
				width: 1200,
				height: 630,
				alt: `로또 번호 ${ballNumber} 스캔 현황`
			}
		]
	}}
	twitter={{
		cardType: "summary_large_image",
		site: "@645live",
		title: `로또 번호 ${ballNumber} 실시간 스캔 현황`,
		description: `🎯 로또 번호 ${ballNumber}의 실시간 스캔 현황 공개! 지금 이 순간도 스캔이 진행중입니다.`,
		image: `https://www.645.live/og/?title=${encodeURIComponent(`로또 번호 ${ballNumber} 완전분석`)}&description=${encodeURIComponent(`${data.numberStats ? `총 ${data.numberStats.frequency}회 출현 - ${data.latestRound && data.numberStats.lastDrawRound ? `${data.latestRound - data.numberStats.lastDrawRound}회차째 미출현` : '최근 당첨'} - 궁합번호와 실시간 스캔현황까지` : '실시간 스캔현황과 상세 통계를 지금 확인하세요'}`)}&layout=centered&theme=dark&format=svg`
	}}
	additionalMetaTags={[
		{
			name: "robots",
			content: "index,follow"
		},
		{
			name: "author",
			content: "645.live"
		},
		{
			property: "article:section",
			content: "로또스캔현황"
		},
		{
			property: "article:tag", 
			content: `로또${ballNumber},로또스캔,로또현황`
		}
	]}
/>

<svelte:window onkeydown={handleKeydown} />

{#key ballNumber}
<div class="container mx-auto p-4 max-w-6xl">
	<!-- 헤더 섹션 -->
	<div class="text-center mb-8">
		<h1 class="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">로또 번호 {ballNumber}</h1>
		<p class="text-lg text-gray-600 dark:text-gray-400">실시간 스캔 현황 및 당첨 통계</p>
	</div>

	<!-- 메인 콘텐츠 -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- 왼쪽: 볼 및 기본 정보 -->
		<div class="lg:col-span-1 space-y-6">
			<!-- 볼 컴포넌트 -->
			<div class="aspect-square w-full max-w-xs mx-auto relative">
				<ValueIncrementEffect show={isUpdated} message="+1" color="text-green-500" />
				<LottoBall {ballNumber} initialValue={ballValue} size="large" interactive={false} />
			</div>

			<!-- 번호 기본 정보 -->
			{#if data.numberDetails}
				<div class="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border border-blue-100 dark:border-gray-700">
					<h3 class="text-lg font-bold mb-3 text-gray-900 dark:text-gray-100">번호 정보</h3>
					<div class="space-y-2">
						<div class="flex justify-between items-center">
							<span class="text-gray-600 dark:text-gray-400">색상</span>
							<span class="px-3 py-1 text-sm font-semibold rounded-full {getColorClass(data.numberDetails.color)}">{data.numberDetails.color}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-600 dark:text-gray-400">구간</span>
							<span class="font-semibold text-gray-900 dark:text-gray-100">{data.numberDetails.section}구간 ({(data.numberDetails.section - 1) * 10 + 1}-{data.numberDetails.section * 10})</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-600 dark:text-gray-400">끝자리</span>
							<span class="font-semibold text-gray-900 dark:text-gray-100">{ballNumber % 10}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-600 dark:text-gray-400">홀/짝</span>
							<span class="font-semibold text-gray-900 dark:text-gray-100">{data.mathematicalProperties?.isEven ? '짝수' : '홀수'}</span>
						</div>
					</div>
				</div>
			{/if}

			<!-- 수학적 속성 -->
			{#if data.mathematicalProperties}
				<div class="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
					<h3 class="text-lg font-bold mb-3 text-gray-900 dark:text-gray-100">수학적 속성</h3>
					<div class="grid grid-cols-2 gap-3">
						<div class="flex items-center gap-2">
							<span class="text-sm text-gray-600 dark:text-gray-400">소수</span>
							<span class="font-semibold {data.mathematicalProperties.isPrime ? 'text-green-600' : 'text-gray-500'}">{data.mathematicalProperties.isPrime ? '✓' : '✗'}</span>
						</div>
						<div class="flex items-center gap-2">
							<span class="text-sm text-gray-600 dark:text-gray-400">완전제곱수</span>
							<span class="font-semibold {data.mathematicalProperties.isPerfectSquare ? 'text-green-600' : 'text-gray-500'}">{data.mathematicalProperties.isPerfectSquare ? '✓' : '✗'}</span>
						</div>
						<div class="flex items-center gap-2">
							<span class="text-sm text-gray-600 dark:text-gray-400">피보나치</span>
							<span class="font-semibold {data.mathematicalProperties.isFibonacci ? 'text-green-600' : 'text-gray-500'}">{data.mathematicalProperties.isFibonacci ? '✓' : '✗'}</span>
						</div>
						<div class="flex items-center gap-2">
							<span class="text-sm text-gray-600 dark:text-gray-400">합성수</span>
							<span class="font-semibold {!data.mathematicalProperties.isPrime && ballNumber > 1 ? 'text-green-600' : 'text-gray-500'}">{!data.mathematicalProperties.isPrime && ballNumber > 1 ? '✓' : '✗'}</span>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- 중앙 및 오른쪽: 통계 정보 -->
		<div class="lg:col-span-2 space-y-6">
			<!-- 당첨 통계 -->
			{#if data.numberStats}
				<div class="p-6 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900 border border-green-100 dark:border-gray-700">
					<h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
						<span class="text-green-600">📊</span> 당첨 통계
					</h2>
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						<div class="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-gray-600">
							<div class="text-2xl font-bold text-green-600 dark:text-green-400">{data.numberStats.frequency}</div>
							<div class="text-sm text-gray-600 dark:text-gray-400">총 출현 횟수</div>
						</div>
						<div class="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-gray-600">
							<div class="text-2xl font-bold text-blue-600 dark:text-blue-400">{data.numberStats.averageFrequency}%</div>
							<div class="text-sm text-gray-600 dark:text-gray-400">출현률</div>
						</div>
						<div class="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-gray-600">
							<div class="text-2xl font-bold {data.numberStats.deviation > 0 ? 'text-red-600' : data.numberStats.deviation < 0 ? 'text-blue-600' : 'text-gray-600'}">{data.numberStats.deviation > 0 ? '+' : ''}{data.numberStats.deviation.toFixed(1)}</div>
							<div class="text-sm text-gray-600 dark:text-gray-400">기대 편차</div>
						</div>
						<div class="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-gray-600">
							<div class="text-2xl font-bold text-purple-600 dark:text-purple-400">{data.numberStats.lastDrawRound}</div>
							<div class="text-sm text-gray-600 dark:text-gray-400">마지막 당첨 회차</div>
						</div>
						{#if data.latestRound && data.numberStats.lastDrawRound}
							<div class="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-gray-600">
								<div class="text-2xl font-bold text-orange-600 dark:text-orange-400">{data.latestRound - data.numberStats.lastDrawRound}</div>
								<div class="text-sm text-gray-600 dark:text-gray-400">미출현 기간</div>
							</div>
						{/if}
						<div class="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-gray-600">
							<div class="text-2xl font-bold text-gray-600 dark:text-gray-400">{data.numberStats.expectedFrequency.toFixed(1)}</div>
							<div class="text-sm text-gray-600 dark:text-gray-400">기대 출현 횟수</div>
						</div>
					</div>
				</div>
			{:else}
				<div class="p-6 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
					<p class="text-gray-500 text-center">아직 이 번호에 대한 통계 정보가 없습니다.</p>
				</div>
			{/if}

			<!-- 궁합 번호 -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				{#if data.topPairs && data.topPairs.length > 0}
					<div class="p-6 rounded-lg bg-gradient-to-br from-rose-50 to-pink-50 dark:from-gray-800 dark:to-gray-900 border border-rose-100 dark:border-gray-700">
						<h3 class="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
							<span class="text-rose-600">🤝</span> 최고 궁합 번호
						</h3>
						<div class="space-y-3">
							{#each data.topPairs as pair}
								<div class="flex items-center justify-between p-3 rounded-md bg-white dark:bg-gray-800 border border-rose-200 dark:border-gray-600">
									<div class="flex items-center gap-3">
										<div class="w-8 h-8 flex items-center justify-center rounded-full {getColorClass(pair.otherNumberDetails?.color)} text-sm font-bold">{pair.otherNumber}</div>
										<span class="font-medium text-gray-800 dark:text-gray-200">{pair.otherNumber}번</span>
									</div>
									<span class="font-semibold text-rose-600 dark:text-rose-400">{pair.pair_count}회</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				{#if data.bottomPairs && data.bottomPairs.length > 0}
					<div class="p-6 rounded-lg bg-gradient-to-br from-slate-50 to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-slate-100 dark:border-gray-700">
						<h3 class="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
							<span class="text-slate-600">💔</span> 최저 궁합 번호
						</h3>
						<div class="space-y-3">
							{#each data.bottomPairs as pair}
								<div class="flex items-center justify-between p-3 rounded-md bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600">
									<div class="flex items-center gap-3">
										<div class="w-8 h-8 flex items-center justify-center rounded-full {getColorClass(pair.otherNumberDetails?.color)} text-sm font-bold">{pair.otherNumber}</div>
										<span class="font-medium text-gray-800 dark:text-gray-200">{pair.otherNumber}번</span>
									</div>
									<span class="font-semibold text-slate-600 dark:text-slate-400">{pair.pair_count}회</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- 회차별 스캔 현황 -->
			{#if data.historicalScanData && data.historicalScanData.length > 0}
				<div class="p-6 rounded-lg bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-gray-800 dark:to-gray-900 border border-amber-100 dark:border-gray-700">
					<h3 class="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
						<span class="text-amber-600">📈</span> 최근 스캔 현황
					</h3>
					<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
						{#each data.historicalScanData as scanData}
							<div class="text-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-amber-200 dark:border-gray-600">
								<div class="text-lg font-bold text-amber-600 dark:text-amber-400">{scanData.scanCount.toLocaleString()}</div>
								<div class="text-xs text-gray-600 dark:text-gray-400">{scanData.round}회차</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- 하단 네비게이션 -->
	<div class="mt-8 text-center space-y-4">
		<div class="flex flex-wrap justify-center gap-4">
			<a href="/stats/numbers" class="btn btn-outline btn-primary">전체 번호 통계</a>
			<a href="/generator" class="btn btn-outline btn-secondary">번호 생성기</a>
			<a href="/" class="btn btn-outline">홈으로</a>
		</div>
		<div class="flex justify-center gap-2">
			{#if ballNumber > 1}
				<button onclick={goToPrevious} class="btn btn-circle btn-outline btn-sm">
					<span class="text-lg">←</span>
				</button>
			{/if}
			<span class="btn btn-circle btn-sm btn-disabled">{ballNumber}</span>
			{#if ballNumber < 45}
				<button onclick={goToNext} class="btn btn-circle btn-outline btn-sm">
					<span class="text-lg">→</span>
				</button>
			{/if}
		</div>
	</div>
</div>
{/key}