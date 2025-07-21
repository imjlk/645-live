<script lang="ts">
import LottoBall from "$lib/modules/lotto/components/LottoBall.svelte";
import ValueIncrementEffect from "$lib/modules/lotto/components/ValueIncrementEffect.svelte";
import type { BallNumber } from "$lib/modules/lotto/types";
import { useBallValues, useConnectionStatus } from "$lib/trailbase/composables.svelte";
import { onDestroy, onMount } from "svelte";
import { JsonLd, MetaTags } from "svelte-meta-tags";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();

// Use the new composables for state management
const ballValuesComposable = useBallValues({
	initialRound: data.displayRound || data.latestRound,
	onBallUpdate: (ballNumber, newValue, oldValue) => {
		// This will be handled by the composable's recentlyUpdated state
		console.log(`Ball ${ballNumber} updated from ${oldValue} to ${newValue}`);
	}
});

const connectionStatus = useConnectionStatus();

// Generate numbers array for rendering based on ballValues
let numbers = $derived<BallNumber[]>(
	Array.from({ length: 45 }, (_, i) => ({
		id: i + 1,
		value: ballValuesComposable.ballValues[i + 1] || 0,
	}))
);

// Subscription cleanup functions
let unsubscribeBallValues: (() => void) | null = null;
let unsubscribeConnection: (() => void) | null = null;

// Initialize data using the new composable
async function initializeData() {
	const targetRound = data.displayRound || data.latestRound;
	if (targetRound) {
		await ballValuesComposable.loadInitialData(targetRound);
	}
}

onMount(async () => {
	// Initialize data
	await initializeData();
	
	// Set up subscriptions
	unsubscribeBallValues = ballValuesComposable.subscribe();
	unsubscribeConnection = connectionStatus.subscribe();
});

// Clean up on component unmount
onDestroy(() => {
	if (unsubscribeBallValues) {
		unsubscribeBallValues();
		unsubscribeBallValues = null;
	}
	
	if (unsubscribeConnection) {
		unsubscribeConnection();
		unsubscribeConnection = null;
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
				url: `https://www.645.live/og?title=${encodeURIComponent('로또 6/45 실시간 스캔 현황')}&description=${encodeURIComponent(`${ballValuesComposable.currentRound ? ballValuesComposable.currentRound + '회차 ' : ''}번호별 실시간 스캔 현황 - 총 ${ballValuesComposable.totalScans.toLocaleString()}회 스캔`)}&layout=hero&theme=dark`,
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
		image: `https://www.645.live/og?title=${encodeURIComponent('로또 6/45 실시간 스캔 현황')}&description=${encodeURIComponent(`${ballValuesComposable.currentRound ? ballValuesComposable.currentRound + '회차 ' : ''}번호별 실시간 스캔 현황 - 총 ${ballValuesComposable.totalScans.toLocaleString()}회 스캔`)}&layout=hero&theme=dark`,
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

{#if ballValuesComposable.error}
    <div class="text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg mx-4 mt-4">
        <p>데이터 로딩 오류: {ballValuesComposable.error.message}</p>
        {#if !connectionStatus.connected}
            <p class="text-sm mt-2">연결 상태: {connectionStatus.connecting ? '연결 중...' : '연결 끊김'}</p>
        {/if}
    </div>
{:else if numbers.length > 0}
    <!-- Header with round and total scans info -->
    <div class="px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-xl mt-4 mb-3 max-sm:mx-0 mx-4 border border-blue-100 dark:border-gray-600 shadow-lg">
        <div class="flex justify-between items-center">
            <div class="flex items-center gap-3">
                <div class="w-3 h-3 {connectionStatus.connected ? 'bg-green-500' : connectionStatus.connecting ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'} rounded-full"></div>
                <span class="text-lg font-bold text-gray-800 dark:text-white">
                    {#if ballValuesComposable.currentRound}
                        {ballValuesComposable.currentRound}회차
                        {#if data.latestRound && ballValuesComposable.currentRound === data.latestRound}
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
                    총 스캔: {ballValuesComposable.totalScans.toLocaleString()}회
                </span>
            </div>
        </div>
    </div>
    
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 p-0 py-4 sm:p-4 gap-4">
        {#each numbers as ball (ball.id)}
            {@const isUpdated = ballValuesComposable.recentlyUpdated[ball.id] || false}
            <a href="/n/{ball.id}" class="ball-grid-item">
                <ValueIncrementEffect show={isUpdated} message="+1" color="text-green-500" />
                <LottoBall 
                    ballNumber={ball.id} 
                    initialValue={ball.value}
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
