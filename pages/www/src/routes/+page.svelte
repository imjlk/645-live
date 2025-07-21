<script lang="ts">
import LottoBall from "$lib/modules/lotto/components/LottoBall.svelte";
import ValueIncrementEffect from "$lib/modules/lotto/components/ValueIncrementEffect.svelte";
import type { BallNumber } from "$lib/modules/lotto/types";
import {
	type LottoDrawScanCount,
	getLatestScanData,
	getScanCountApi,
	getScanDataSafely,
	subscribeToScanCountUpdates,
} from "$lib/stores/streamStore";
import LinkButton from "$lib/ui/LinkButton.svelte";
import { onDestroy, onMount } from "svelte";
import { JsonLd, MetaTags } from "svelte-meta-tags";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();

// Track which balls have recently changed value to show animation
let recentlyUpdated = $state<Record<number, boolean>>({});

// Client-side initial data and error state
let error = $state<string | null>(null);

// Initialize numbers with a default empty array - will be generated for 1-45
let numbers = $state<BallNumber[]>([]);
// Create a reactive state for the values from scan counts
let ballValues = $state<Record<number, number>>({});
// Store the current round data
let currentRound = $state<number | null>(null);
// Store total scan count
let totalScans = $state(0);

// 전역 스트림 구독 해제 함수
let unsubscribeStream: (() => void) | null = null;

// Function to fetch initial lotto scan counts from Trailbase
async function loadInitialData() {
	// Use the display round from server data (this is the round we should show scan data for)
	const targetRound = data.displayRound || data.latestRound;
	if (targetRound) {
		currentRound = targetRound;
	}

	try {
		// Try to get the specific round's scan data directly
		if (targetRound) {
			const scanData = await getScanDataSafely(targetRound);

			if (scanData) {
				currentRound = targetRound;
				totalScans = Number(scanData.total_scans) || 0;

				// Convert scan count data to ball values
				const values: Record<number, number> = {};
				for (let i = 1; i <= 45; i++) {
					const scanCountField = `scan_count_${i}` as keyof LottoDrawScanCount;
					values[i] = Number(scanData[scanCountField]) || 0;
				}
				ballValues = values;

				// Generate numbers array for rendering (1-45)
				numbers = Array.from({ length: 45 }, (_, i) => ({
					id: i + 1,
					value: values[i + 1] || 0,
				}));
				return; // Successfully loaded target round data
			}

			// Round not found, initialize with zeros for the target round
			currentRound = targetRound;
			totalScans = 0;

			const values: Record<number, number> = {};
			for (let i = 1; i <= 45; i++) {
				values[i] = 0;
			}
			ballValues = values;

			// Generate numbers array for rendering (1-45)
			numbers = Array.from({ length: 45 }, (_, i) => ({
				id: i + 1,
				value: 0,
			}));
			return;
		}

		// Fallback: get the latest available data if no target round specified
		const latestRound = await getLatestScanData();

		if (latestRound) {
			// Use display round if available, otherwise use database round
			currentRound = targetRound || Number(latestRound.round) || null;
			totalScans = Number(latestRound.total_scans) || 0;

			// Convert scan count data to ball values
			const values: Record<number, number> = {};
			for (let i = 1; i <= 45; i++) {
				const scanCountField = `scan_count_${i}` as keyof LottoDrawScanCount;
				values[i] = Number(latestRound[scanCountField]) || 0;
			}
			ballValues = values;

			// Generate numbers array for rendering (1-45)
			numbers = Array.from({ length: 45 }, (_, i) => ({
				id: i + 1,
				value: values[i + 1] || 0,
			}));
		} else {
			// No scan data yet, use display round and initialize with zeros
			currentRound = targetRound || null;
			totalScans = 0;

			const values: Record<number, number> = {};
			for (let i = 1; i <= 45; i++) {
				values[i] = 0;
			}
			ballValues = values;

			// Generate numbers array for rendering (1-45)
			numbers = Array.from({ length: 45 }, (_, i) => ({
				id: i + 1,
				value: 0,
			}));
		}
	} catch (err: unknown) {
		error = (err as Error)?.message || "초기 데이터 로딩에 실패했습니다.";
	}
}

onMount(async () => {
	// First load initial data
	await loadInitialData();
	if (error) return;

	// Set up global stream subscription for real-time updates
	unsubscribeStream = subscribeToScanCountUpdates("main-page", (scanData) => {
		// Only update if this is for the current round we're displaying
		if (scanData.round !== currentRound) {
			// Update current round if it changed
			currentRound = scanData.round;
		}

		// Update the ballValues with new scan counts
		const newValues = { ...ballValues };
		let hasChanges = false;

		// Check each scan count field for changes
		for (let i = 1; i <= 45; i++) {
			const scanCountField = `scan_count_${i}` as keyof LottoDrawScanCount;
			const newCount = Number(scanData[scanCountField]) || 0;
			const currentCount = ballValues[i] || 0;

			if (newCount !== currentCount) {
				newValues[i] = newCount;
				hasChanges = true;

				// Trigger animation for this ball
				recentlyUpdated = {
					...recentlyUpdated,
					[i]: true,
				};

				// Remove the animation after a delay
				setTimeout(() => {
					recentlyUpdated = {
						...recentlyUpdated,
						[i]: false,
					};
				}, 1000);
			}
		}

		if (hasChanges) {
			ballValues = newValues;
		}

		// Update total scans
		const newTotalScans = Number(scanData.total_scans) || 0;
		if (newTotalScans !== totalScans) {
			totalScans = newTotalScans;
		}
	});
});

// Clean up on component unmount
onDestroy(() => {
	if (unsubscribeStream) {
		unsubscribeStream();
		unsubscribeStream = null;
	}
});
</script>

<MetaTags
	title="645.live - 로또 6/45 실시간 스캔 현황 및 통계 분석"
	description="🔥 로또 6/45 실시간 스캔 현황 공개! 지금 이 순간 어떤 번호가 가장 많이 선택되고 있는지 확인하고, 빅데이터 통계로 다음 당첨번호를 예측해보세요!"
	canonical="https://645.live"
	keywords={["로또", "로또645", "로또당첨번호", "로또스캔", "로또통계", "로또분석", "로또번호생성기", "로또예측", "실시간로또", "로또현황", "동행복권", "한국로또", "로또번호추천", "로또패턴분석"]}
	robots="index,follow"
	openGraph={{
		type: "website",
		url: "https://645.live",
		title: "로또 6/45 실시간 스캔 현황 및 통계 분석",
		description: "🔥 로또 6/45 실시간 스캔 현황 공개! 지금 이 순간 어떤 번호가 가장 많이 선택되고 있는지 확인하고, 빅데이터 통계로 다음 당첨번호를 예측해보세요!",
		siteName: "645.live",
		locale: "ko_KR",
		images: [
			{
				url: `https://www.645.live/og?title=${encodeURIComponent('로또 6/45 실시간 스캔 현황')}&description=${encodeURIComponent(`${currentRound ? currentRound + '회차 ' : ''}번호별 실시간 스캔 현황 - 총 ${totalScans.toLocaleString()}회 스캔`)}&layout=hero&theme=dark&format=svg`,
				width: 1200,
				height: 630,
				alt: "로또 6/45 실시간 스캔 현황",
				type: "image/svg+xml"
			}
		]
	}}
	twitter={{
		cardType: "summary_large_image",
		site: "@645live",
		creator: "@645live",
		title: "로또 6/45 실시간 스캔 현황 및 통계 분석",
		description: "🔥 로또 6/45 실시간 스캔 현황 공개! 지금 이 순간 어떤 번호가 가장 많이 선택되고 있는지 확인하고, 빅데이터 통계로 다음 당첨번호를 예측해보세요!",
		image: `https://www.645.live/og?title=${encodeURIComponent('로또 6/45 실시간 스캔 현황')}&description=${encodeURIComponent(`${currentRound ? currentRound + '회차 ' : ''}번호별 실시간 스캔 현황 - 총 ${totalScans.toLocaleString()}회 스캔`)}&layout=hero&theme=dark&format=svg`,
		imageAlt: "로또 6/45 실시간 스캔 현황"
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
			name: "theme-color",
			content: "#3b82f6"
		},
		{
			property: "og:locale:alternate",
			content: "en_US"
		}
	]}
/>

<JsonLd
	schema={{
		"@context": "https://schema.org",
		"@type": "WebSite",
		"name": "645.live",
		"description": "로또 6/45 실시간 스캔 현황 및 통계 분석 서비스",
		"url": "https://645.live",
		"potentialAction": {
			"@type": "SearchAction",
			"target": "https://645.live/n/{search_term_string}",
			"query-input": "required name=search_term_string"
		},
		"publisher": {
			"@type": "Organization",
			"name": "645.live",
			"url": "https://645.live"
		},
		"mainEntity": {
			"@type": "WebApplication",
			"name": "로또 6/45 스캔 현황",
			"description": "로또 번호별 실시간 스캔 현황 및 통계 분석",
			"applicationCategory": "Entertainment",
			"operatingSystem": "Web Browser",
			"offers": {
				"@type": "Offer",
				"price": "0",
				"priceCurrency": "KRW"
			}
		}
	}}
/>

{#if error}
    <p class="text-red-500 p-4">Error loading data: {error}</p>
{:else if numbers.length > 0}
    <!-- Header with round and total scans info -->
    <div class="px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-xl mt-4 mb-3 max-sm:mx-0 mx-4 border border-blue-100 dark:border-gray-600 shadow-lg">
        <div class="flex justify-between items-center">
            <div class="flex items-center gap-3">
                <div class="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <span class="text-lg font-bold text-gray-800 dark:text-white">
                    {#if currentRound}
                        {currentRound}회차
                        {#if data.latestRound && currentRound === data.latestRound}
                            <span class="ml-2 px-2 py-1 bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 text-xs font-medium rounded-full">발표됨</span>
                        {/if}
                    {:else if data.displayRound}
                        {data.displayRound}회차
                        {#if data.latestRound && data.displayRound === data.latestRound}
                            <span class="ml-2 px-2 py-1 bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 text-xs font-medium rounded-full">발표됨</span>
                        {/if}
                    {:else}
                        로또 스캔 현황
                    {/if}
                </span>
            </div>
            <div class="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span class="text-blue-600 dark:text-blue-400 font-bold text-sm">
                    총 스캔: {totalScans.toLocaleString()}회
                </span>
            </div>
        </div>
    </div>
    
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 p-0 py-4 sm:p-4 gap-4">
        {#each numbers as ball (ball.id)}
            {@const value = ballValues[ball.id] || 0}
            {@const isUpdated = recentlyUpdated[ball.id] || false}
            <a href="/n/{ball.id}" class="ball-grid-item">
                <ValueIncrementEffect show={isUpdated} message="+1" color="text-green-500" />
                <LottoBall 
                    ballNumber={ball.id} 
                    initialValue={value}
                    size="small"
                    interactive={true}
                />
            </a>
        {/each}
    </div>
{:else}
    <!-- Skeleton loading state with round info -->
    <div class="skeleton h-14 mx-4 mt-4 mb-3 rounded-xl"></div>
    
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 p-0 py-4 sm:p-4 gap-4">
        {#each Array(45) as _}
            <div class="skeleton aspect-square w-full min-h-20 rounded-full"></div>
        {/each}
    </div>
{/if}

<style>
.ball-grid-item {
    aspect-ratio: 1;
    width: 100%;
    position: relative;
    display: block;
    transition: all 0.2s ease-in-out;
    border-radius: 50%;
    min-height: 80px;
}

.ball-grid-item:hover {
    transform: scale(1.05);
    z-index: 10;
}

.ball-grid-item:focus {
    outline: none;
    box-shadow: 0 0 0 2px oklch(var(--p));
    transform: scale(1.05);
}

@media (max-width: 640px) {
    .ball-grid-item {
        min-height: 70px;
    }
}
</style>
