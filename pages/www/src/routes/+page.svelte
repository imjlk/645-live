<script lang="ts">
import LottoBall from "$lib/modules/lotto/components/LottoBall.svelte";
import ValueIncrementEffect from "$lib/modules/lotto/components/ValueIncrementEffect.svelte";
import type { BallNumber } from "$lib/modules/lotto/types";
import {
	useBallValues,
	useConnectionStatus,
} from "$lib/trailbase/composables.svelte";
import { handleGridNavigation, focusElement, announceToScreenReader } from "$lib/utils/keyboard-navigation";
import { onDestroy, onMount } from "svelte";
import { JsonLd, MetaTags } from "svelte-meta-tags";
import type { PageData } from "./$types";
import { goto } from "$app/navigation";
import ScreenReaderStatus from "$lib/components/ui/ScreenReaderStatus.svelte";

let { data }: { data: PageData } = $props();

// Use the new composables for state management
const ballValuesComposable = useBallValues({
	initialRound: data.displayRound || data.latestRound,
	onBallUpdate: (ballNumber, newValue, oldValue) => {
		// Debug animation trigger
		console.log(
			`🎾 Ball ${ballNumber} updated: ${oldValue} → ${newValue}`,
			ballValuesComposable.recentlyUpdated,
		);
	},
});

const connectionStatus = useConnectionStatus();

// Generate numbers array for rendering based on ballValues
let numbers = $derived<BallNumber[]>(
	Array.from({ length: 45 }, (_, i) => ({
		id: i + 1,
		value: ballValuesComposable.ballValues[i + 1] || 0,
	})),
);

// Subscription cleanup function
let unsubscribeBallValues: (() => void) | null = null;

// 키보드 네비게이션을 위한 현재 포커스 인덱스
let focusedBallIndex = $state<number | null>(null);

// 스크린 리더용 실시간 업데이트 메시지
let screenReaderMessage = $state('');

// 실시간 업데이트를 스크린 리더에 알림
$effect(() => {
	if (ballValuesComposable.recentlyUpdated && Object.keys(ballValuesComposable.recentlyUpdated).length > 0) {
		const updatedBalls = Object.keys(ballValuesComposable.recentlyUpdated)
			.filter(key => ballValuesComposable.recentlyUpdated[Number.parseInt(key)])
			.map(key => `${key}번`)
			.join(', ');
		
		if (updatedBalls) {
			screenReaderMessage = `로또 번호 ${updatedBalls}이 업데이트되었습니다.`;
			
			// 메시지를 일정 시간 후 초기화
			setTimeout(() => {
				screenReaderMessage = '';
			}, 2000);
		}
	}
});

// 연결 상태 변경을 스크린 리더에 알림
let previousConnectionStatus = $state<boolean | null>(null);
$effect(() => {
	if (previousConnectionStatus !== null && previousConnectionStatus !== connectionStatus.connected) {
		screenReaderMessage = connectionStatus.connected ? 
			'서버와 연결되었습니다. 실시간 업데이트가 시작됩니다.' : 
			'서버 연결이 끊어졌습니다. 재연결을 시도하고 있습니다.';
	}
	previousConnectionStatus = connectionStatus.connected;
});

// 그리드 키보드 네비게이션 핸들러
function handleBallGridKeydown(event: KeyboardEvent, ballIndex: number) {
	const nextIndex = handleGridNavigation(event, ballIndex - 1, {
		gridColumns: window.innerWidth < 640 ? 2 : window.innerWidth < 768 ? 3 : window.innerWidth < 1024 ? 4 : 5,
		maxItems: 45,
		onActivate: (index) => {
			const ballNumber = index + 1;
			goto(`/n/${ballNumber}`);
		},
		onEscape: () => {
			focusedBallIndex = null;
			// 포커스를 메인 영역으로 이동
			const mainElement = document.querySelector('main');
			if (mainElement) {
				(mainElement as HTMLElement).focus();
			}
		}
	});
	
	if (nextIndex !== null) {
		const nextBallNumber = nextIndex + 1;
		focusedBallIndex = nextBallNumber;
		
		// 다음 프레임에서 포커스 이동
		requestAnimationFrame(() => {
			const nextElement = document.querySelector(`[data-ball-number="${nextBallNumber}"]`);
			focusElement(nextElement as HTMLElement);
			announceToScreenReader(`${nextBallNumber}번으로 이동`);
		});
	}
}

// Initialize data using the new composable
async function initializeData() {
	const targetRound = data.displayRound || data.latestRound;
	if (targetRound) {
		await ballValuesComposable.loadInitialData(targetRound);
		console.log(`🎯 Initialized with target round: ${targetRound}`);
	}
}

onMount(async () => {
	// Initialize data first to ensure values are loaded
	await initializeData();

	// Small delay to ensure initialization is complete
	await new Promise((resolve) => setTimeout(resolve, 50));

	// Set up ball values subscription after initialization
	unsubscribeBallValues = ballValuesComposable.subscribe();
});

// Clean up on component unmount
onDestroy(() => {
	if (unsubscribeBallValues) {
		unsubscribeBallValues();
		unsubscribeBallValues = null;
	}

	// connectionStatus auto-unsubscribes when component is destroyed
	connectionStatus.unsubscribe();
});
</script>

<MetaTags
	title="645.live - 로또 6/45 실시간 스캔 현황 및 통계 분석"
	description="로또 6/45 실시간 스캔 현황을 확인하세요. 번호별 선택 빈도와 통계 분석으로 다음 당첨번호를 예측해보세요. 총 {ballValuesComposable.totalScans.toLocaleString()}회 스캔 데이터 기반."
	canonical="https://645.live"
	keywords={["로또 6/45", "로또 실시간", "로또 통계", "로또 분석", "로또 스캔", "로또 번호", "로또 당첨", "로또 생성기", "동행복권", "로또 확률", "로또 패턴", "로또 예측"]}
	robots="index,follow"
	openGraph={{
		type: "website",
		url: "https://645.live",
		title: "로또 6/45 실시간 스캔 현황 및 통계 분석",
		description: "로또 6/45 실시간 스캔 현황을 확인하세요. 번호별 선택 빈도와 통계 분석으로 다음 당첨번호를 예측해보세요.",
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
		description: "로또 6/45 실시간 스캔 현황을 확인하세요. 번호별 선택 빈도와 통계 분석으로 다음 당첨번호를 예측해보세요.",
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
    <!-- Show data notice if all scan counts are zero -->
    {#if ballValuesComposable.totalScans === 0 && !ballValuesComposable.loading}
        <div class="alert alert-info mx-4 mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div class="flex-1">
                <h3 class="font-bold">스캔 데이터 준비 중</h3>
                <div class="text-xs">
                    {#if ballValuesComposable.currentRound}
                        {ballValuesComposable.currentRound}회차의 스캔 데이터가 아직 수집되지 않았습니다. 
                    {:else}
                        최신 회차의 스캔 데이터를 준비 중입니다.
                    {/if}
                    곧 실시간 데이터가 표시됩니다.
                </div>
            </div>
        </div>
    {/if}
    <!-- Header with round and total scans info -->
    <div class="px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-xl mt-4 mb-3 max-sm:mx-0 mx-4 border border-blue-100 dark:border-gray-600 shadow-lg">
        <div class="flex justify-between items-center">
            <div class="flex items-center gap-3">
                <div class="flex items-center gap-2">
                    <div class="w-3 h-3 {connectionStatus.connected ? 'bg-green-500' : connectionStatus.connecting ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'} rounded-full"></div>
                    <span class="text-xs text-gray-600 dark:text-gray-400">
                        {connectionStatus.connected ? '연결됨' : connectionStatus.connecting ? '연결 중...' : `(재시도: ${connectionStatus.retryCount})`}
                        {#if connectionStatus.error}
                            - {connectionStatus.error.message}
                        {/if}
                    </span>
                </div>
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
                {#if ballValuesComposable.totalScans > 0}
                    <svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span class="text-blue-600 dark:text-blue-400 font-bold text-sm">
                        총 스캔: {ballValuesComposable.totalScans.toLocaleString()}회
                    </span>
                {:else}
                    <svg class="w-4 h-4 text-amber-500 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                    <span class="text-amber-600 dark:text-amber-400 font-bold text-sm">
                        대기 중
                    </span>
                {/if}
            </div>
        </div>
    </div>
    
    <div 
        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 p-0 py-4 sm:p-4 gap-4"
        role="grid"
        aria-label="로또 번호별 스캔 현황"
    >
        {#each numbers as ball (ball.id)}
            {@const isUpdated = ballValuesComposable.recentlyUpdated[ball.id] || false}
            {@const hasData = ballValuesComposable.totalScans > 0}
            <a 
                href="/n/{ball.id}" 
                class="ball-grid-item {hasData ? '' : 'opacity-75'}"
                aria-label="로또 번호 {ball.id}번 상세 정보 보기. 현재 {ball.value}회 스캔됨"
                tabindex="0"
                role="gridcell"
                data-ball-number={ball.id}
                onkeydown={(e) => handleBallGridKeydown(e, ball.id)}
                onfocus={() => focusedBallIndex = ball.id}
            >
                <ValueIncrementEffect 
                    show={isUpdated} 
                    message="+1" 
                    color="text-green-600 dark:text-green-400" 
                />
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
    <!-- Loading state -->
    {#if ballValuesComposable.loading}
        <div class="alert mx-4 mt-4">
            <span class="loading loading-spinner loading-sm"></span>
            <div>
                <h3 class="font-bold">데이터 로딩 중...</h3>
                <div class="text-xs">
                    {#if !connectionStatus.connected}
                        TrailBase 연결을 초기화하고 있습니다...
                    {:else}
                        스캔 데이터를 가져오고 있습니다.
                    {/if}
                </div>
            </div>
        </div>
    {/if}
    
    <!-- Skeleton loading state with round info -->
    <div class="skeleton h-14 mx-4 mt-4 mb-3 rounded-xl"></div>
    
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 p-0 py-4 sm:p-4 gap-4">
        {#each Array(45) as _}
            <div class="skeleton aspect-square w-full min-h-20 rounded-full"></div>
        {/each}
    </div>
{/if}

<!-- 스크린 리더용 실시간 상태 알림 -->
<ScreenReaderStatus 
	message={screenReaderMessage} 
	liveMode="polite" 
/>

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
    outline: 2px solid oklch(var(--p));
    outline-offset: 2px;
    box-shadow: 0 0 0 2px oklch(var(--p));
    transform: scale(1.05);
}

@media (max-width: 640px) {
    .ball-grid-item {
        min-height: 70px;
    }
}
</style>
