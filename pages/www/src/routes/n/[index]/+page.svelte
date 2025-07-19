<script lang="ts">
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
import { type Writable, writable } from "svelte/store";
import type { PageData } from "./$types";

export let data: PageData;

const ballNumber = Number($page.params.index);

// Reactive stores for real-time updates
const ballValue: Writable<number> = writable(0);
const isUpdated: Writable<boolean> = writable(false);

// 전역 스트림 구독 해제 함수
let unsubscribeStream: (() => void) | null = null;

onMount(async () => {
	const displayRound = calculateDisplayRound();
	const scanData = await getScanDataSafely(displayRound);

	if (scanData) {
		const scanCountField =
			`scan_count_${ballNumber}` as keyof LottoDrawScanCount;
		const ballScanCount = Number(scanData[scanCountField]) || 0;
		ballValue.set(ballScanCount);
	} else {
		console.log(
			`No scan data for round ${displayRound}, ball ${ballNumber}, init with 0`,
		);
		ballValue.set(0);
	}

	unsubscribeStream = subscribeToScanCountUpdates(
		`ball-${ballNumber}`,
		(scanData) => {
			if (scanData.round === data.latestRound) {
				const scanCountField =
					`scan_count_${ballNumber}` as keyof LottoDrawScanCount;
				const newScanCount = Number(scanData[scanCountField]) || 0;

				ballValue.update((currentValue) => {
					if (newScanCount > currentValue) {
						isUpdated.set(true);
						setTimeout(() => isUpdated.set(false), 1000);
					}
					return newScanCount;
				});
			}
		},
	);
});

onDestroy(() => {
	if (unsubscribeStream) {
		unsubscribeStream();
	}
});

const getDeviationClass = (deviation: number) => {
	if (deviation > 10) return "text-red-600 font-bold";
	if (deviation > 5) return "text-orange-600";
	if (deviation < -10) return "text-blue-600 font-bold";
	if (deviation < -5) return "text-blue-500";
	return "text-gray-600";
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
	description={`로또 번호 ${ballNumber}의 실시간 스캔 현황과 과거 당첨 통계를 확인하세요. ${data.numberStats ? `총 ${data.numberStats.frequency}회 출현, 출현률 ${data.numberStats.averageFrequency}%` : '실시간 스캔 데이터 제공'}`}
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
		description: `로또 번호 ${ballNumber}의 실시간 스캔 현황과 과거 당첨 통계를 확인하세요.`,
		url: `https://www.645.live/n/${ballNumber}`,
		type: "article",
		siteName: "645.live",
		locale: "ko_KR",
		images: [
			{
				url: `https://www.645.live/og-number-${ballNumber}.png`,
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
		description: `로또 번호 ${ballNumber}의 실시간 스캔 현황과 과거 당첨 통계를 확인하세요.`,
		image: `https://www.645.live/og-number-${ballNumber}.png`
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

<div class="container mx-auto p-4">
	<div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
		<div class="aspect-square w-full max-w-md mx-auto relative">
			<ValueIncrementEffect show={$isUpdated} message="+1" color="text-green-500" />
			<LottoBall {ballNumber} initialValue={$ballValue} size="large" interactive={false} />
		</div>

		<div class="space-y-6">
			<div class="p-6 rounded-lg bg-gray-50 dark:bg-gray-800 shadow-sm">
				<h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">번호 {ballNumber} 기본 통계</h2>
				{#if data.numberStats}
					<div class="space-y-3 text-base text-gray-700 dark:text-gray-300">
						<div class="flex justify-between">
							<span>총 출현 횟수:</span>
							<span class="font-semibold text-gray-900 dark:text-gray-100">{data.numberStats.frequency}회</span>
						</div>
						<div class="flex justify-between">
							<span>마지막 당첨:</span>
							<span class="font-semibold text-gray-900 dark:text-gray-100">{data.numberStats.lastDrawRound}회차</span>
						</div>
						{#if data.latestRound && data.numberStats.lastDrawRound}
							<div class="flex justify-between">
								<span>미출현 기간:</span>
								<span class="font-semibold text-gray-900 dark:text-gray-100">{data.latestRound - data.numberStats.lastDrawRound}회</span>
							</div>
						{/if}
						<div class="flex justify-between">
							<span>출현률:</span>
							<span class="font-semibold text-gray-900 dark:text-gray-100">{data.numberStats.averageFrequency}%</span>
						</div>
						<div class="flex justify-between">
							<span>기대 편차:</span>
							<span class={getDeviationClass(data.numberStats.deviation)}>{data.numberStats.deviation.toFixed(2)}</span>
						</div>
					</div>
				{:else}
					<p class="text-gray-500">아직 이 번호에 대한 통계 정보가 없습니다.</p>
				{/if}
			</div>

			{#if data.numberDetails}
				<div class="p-6 rounded-lg bg-gray-50 dark:bg-gray-800 shadow-sm">
					<h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">번호 상세 정보</h2>
					<div class="space-y-3 text-base text-gray-700 dark:text-gray-300">
						<div class="flex justify-between items-center">
							<span>색상:</span>
							<span class="px-3 py-1 text-sm font-semibold rounded-full {getColorClass(data.numberDetails.color)}">{data.numberDetails.color}</span>
						</div>
						<div class="flex justify-between">
							<span>구간:</span>
							<span class="font-semibold text-gray-900 dark:text-gray-100">{data.numberDetails.section}구간</span>
						</div>
					</div>
				</div>
			{/if}

			{#if data.mathematicalProperties}
				<div class="p-6 rounded-lg bg-gray-50 dark:bg-gray-800 shadow-sm">
					<h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">수학적 속성</h2>
					<div class="grid grid-cols-2 gap-4">
						<div class="flex items-center gap-2">
							<span class="text-sm text-gray-600 dark:text-gray-400">소수:</span>
							<span class="font-semibold {data.mathematicalProperties.isPrime ? 'text-green-600' : 'text-gray-500'}">{data.mathematicalProperties.isPrime ? '✓' : '✗'}</span>
						</div>
						<div class="flex items-center gap-2">
							<span class="text-sm text-gray-600 dark:text-gray-400">완전제곱수:</span>
							<span class="font-semibold {data.mathematicalProperties.isPerfectSquare ? 'text-green-600' : 'text-gray-500'}">{data.mathematicalProperties.isPerfectSquare ? '✓' : '✗'}</span>
						</div>
						<div class="flex items-center gap-2">
							<span class="text-sm text-gray-600 dark:text-gray-400">피보나치:</span>
							<span class="font-semibold {data.mathematicalProperties.isFibonacci ? 'text-green-600' : 'text-gray-500'}">{data.mathematicalProperties.isFibonacci ? '✓' : '✗'}</span>
						</div>
						<div class="flex items-center gap-2">
							<span class="text-sm text-gray-600 dark:text-gray-400">홀/짝:</span>
							<span class="font-semibold text-gray-900 dark:text-gray-100">{data.mathematicalProperties.isEven ? '짝수' : '홀수'}</span>
						</div>
					</div>
				</div>
			{/if}

			{#if data.topPairs && data.topPairs.length > 0}
				<div class="p-6 rounded-lg bg-gray-50 dark:bg-gray-800 shadow-sm">
					<h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">궁합 번호 Top 5</h2>
					<div class="space-y-3">
						{#each data.topPairs as pair}
							<div class="flex items-center justify-between p-2 rounded-md bg-white dark:bg-gray-700">
								<div class="flex items-center gap-3">
									<div class="w-10 h-10 flex items-center justify-center rounded-full {getColorClass(pair.otherNumberDetails?.color)} text-lg font-bold">{pair.otherNumber}</div>
									<span class="font-medium text-gray-800 dark:text-gray-200">번호 {pair.otherNumber}</span>
								</div>
								<span class="font-semibold text-lg text-green-600">{pair.pair_count}회</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			{#if data.bottomPairs && data.bottomPairs.length > 0}
				<div class="p-6 rounded-lg bg-gray-50 dark:bg-gray-800 shadow-sm">
					<h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">궁합 번호 Bottom 5</h2>
					<div class="space-y-3">
						{#each data.bottomPairs as pair}
							<div class="flex items-center justify-between p-2 rounded-md bg-white dark:bg-gray-700">
								<div class="flex items-center gap-3">
									<div class="w-10 h-10 flex items-center justify-center rounded-full {getColorClass(pair.otherNumberDetails?.color)} text-lg font-bold">{pair.otherNumber}</div>
									<span class="font-medium text-gray-800 dark:text-gray-200">번호 {pair.otherNumber}</span>
								</div>
								<span class="font-semibold text-lg text-red-600">{pair.pair_count}회</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}



			<div class="mt-6 text-center">
				<a href="/stats/numbers" class="text-blue-600 dark:text-blue-400 hover:underline font-medium">
					전체 번호 통계 보기 &rarr;
				</a>
			</div>
		</div>
	</div>
</div>