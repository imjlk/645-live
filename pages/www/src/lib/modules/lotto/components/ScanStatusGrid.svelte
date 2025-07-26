<script lang="ts">
import { goto } from "$app/navigation";
import ScreenReaderStatus from "$lib/components/ui/ScreenReaderStatus.svelte";
import LottoBall from "$lib/modules/lotto/components/LottoBall.svelte";
import ValueIncrementEffect from "$lib/modules/lotto/components/ValueIncrementEffect.svelte";
import type { BallNumber } from "$lib/modules/lotto/types";
import {
	useBallValues,
	useConnectionStatus,
} from "$lib/trailbase/composables.svelte";
import {
	announceToScreenReader,
	focusElement,
	handleGridNavigation,
} from "$lib/utils/keyboard-navigation";
import { onDestroy, onMount, untrack } from "svelte";

interface Props {
	// Initial round to display
	initialRound: number;
	// Latest available round for comparison
	latestRound?: number;
	// Whether to show navigation to individual number pages
	enableNavigation?: boolean;
	// Whether to show the header with round info
	showHeader?: boolean;
	// Grid columns configuration for different screen sizes
	gridColumns?: {
		mobile?: number; // default: 5
		tablet?: number; // default: 3
		desktop?: number; // default: 4
		large?: number; // default: 5
	};
	// Custom increment effect configuration
	incrementEffectConfig?: {
		show: boolean;
		message?: string;
		color?: string;
	};
}

let {
	initialRound,
	latestRound,
	enableNavigation = true,
	showHeader = true,
	gridColumns = { mobile: 5, tablet: 3, desktop: 4, large: 5 },
	incrementEffectConfig = {
		show: true,
		message: "+1",
		color: "text-green-600 dark:text-green-400",
	},
}: Props = $props();

// Use the new composables for state management
const ballValuesComposable = useBallValues({
	initialRound,
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
let screenReaderMessage = $state("");


// 실시간 업데이트를 스크린 리더에 알림 - untrack으로 무한 루프 방지
let ballUpdateTimeoutId: ReturnType<typeof setTimeout> | null = null;
$effect(() => {
	const recentlyUpdated = ballValuesComposable.recentlyUpdated;
	if (recentlyUpdated && Object.keys(recentlyUpdated).length > 0) {
		// 이전 타임아웃 취소
		if (ballUpdateTimeoutId) {
			clearTimeout(ballUpdateTimeoutId);
		}
		
		const updatedBalls = Object.keys(recentlyUpdated)
			.filter((key) => recentlyUpdated[Number.parseInt(key)])
			.map((key) => `${key}번`)
			.join(", ");

		if (updatedBalls) {
			const message = `로또 번호 ${updatedBalls}이 업데이트되었습니다.`;
			// untrack을 사용하여 리액티비티 체인 차단
			untrack(() => {
				screenReaderMessage = message;
			});
			
			// 메시지 초기화 타임아웃 설정
			ballUpdateTimeoutId = setTimeout(() => {
				untrack(() => {
					screenReaderMessage = "";
				});
				ballUpdateTimeoutId = null;
			}, 2000);
		}
	}
});

// 연결 상태 변경을 스크린 리더에 알림 - 무한 루프 방지
let previousConnectionStatus = $state<boolean | null>(null);
let connectionTimeoutId: ReturnType<typeof setTimeout> | null = null;
$effect(() => {
	const currentStatus = connectionStatus.connected;
	if (
		previousConnectionStatus !== null &&
		previousConnectionStatus !== currentStatus
	) {
		// 이전 타임아웃 취소
		if (connectionTimeoutId) {
			clearTimeout(connectionTimeoutId);
		}
		
		const message = currentStatus
			? "서버와 연결되었습니다. 실시간 업데이트가 시작됩니다."
			: "서버 연결이 끊어졌습니다. 재연결을 시도하고 있습니다.";
		
		// untrack을 사용하여 리액티비티 체인 차단
		connectionTimeoutId = setTimeout(() => {
			untrack(() => {
				screenReaderMessage = message;
			});
			connectionTimeoutId = null;
		}, 100); // 짧은 딘레이로 우선순위 조정
	}
	// untrack을 사용하여 previousConnectionStatus 업데이트 시 리액티비티 방지
	untrack(() => {
		previousConnectionStatus = currentStatus;
	});
});

// 그리드 키보드 네비게이션 핸들러
function handleBallGridKeydown(event: KeyboardEvent, ballIndex: number) {
	if (!enableNavigation) return;

	// 현재 화면 크기에 따라 컬럼 수 결정
	const getCurrentColumns = () => {
		const width = window.innerWidth;
		if (width < 640) return gridColumns.mobile || 5;
		if (width < 768) return gridColumns.tablet || 3;
		if (width < 1024) return gridColumns.desktop || 4;
		return gridColumns.large || 5;
	};

	const nextIndex = handleGridNavigation(event, ballIndex - 1, {
		gridColumns: getCurrentColumns(),
		maxItems: 45,
		onActivate: (index) => {
			const ballNumber = index + 1;
			goto(`/n/${ballNumber}`);
		},
		onEscape: () => {
			focusedBallIndex = null;
			// 포커스를 메인 영역으로 이동
			const mainElement = document.querySelector("main");
			if (mainElement) {
				(mainElement as HTMLElement).focus();
			}
		},
	});

	if (nextIndex !== null) {
		const nextBallNumber = nextIndex + 1;
		focusedBallIndex = nextBallNumber;

		// 다음 프레임에서 포커스 이동
		requestAnimationFrame(() => {
			const nextElement = document.querySelector(
				`[data-ball-number="${nextBallNumber}"]`,
			);
			focusElement(nextElement as HTMLElement);
			announceToScreenReader(`${nextBallNumber}번으로 이동`);
		});
	}
}

// Initialize data using the new composable
async function initializeData() {
	if (initialRound) {
		await ballValuesComposable.loadInitialData(initialRound);
	}
}

// Public method to update the round
export function updateRound(newRound: number) {
	ballValuesComposable.loadInitialData(newRound);
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

	// Clear any pending timeouts
	if (ballUpdateTimeoutId) {
		clearTimeout(ballUpdateTimeoutId);
		ballUpdateTimeoutId = null;
	}
	
	if (connectionTimeoutId) {
		clearTimeout(connectionTimeoutId);
		connectionTimeoutId = null;
	}

	// connectionStatus auto-unsubscribes when component is destroyed
	connectionStatus.unsubscribe();
});
</script>

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
	{#if showHeader}
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
							{#if latestRound && ballValuesComposable.currentRound === latestRound}
								<span class="ml-2 px-2 py-1 bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 text-xs font-medium rounded-full">발표됨</span>
							{/if}
						{:else if initialRound}
							{initialRound}회차
							{#if latestRound && initialRound === latestRound}
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
	{/if}
	
	<div 
		class="grid grid-cols-5 sm:grid-cols-5 md:grid-cols-5 lg:grid-cols-5 p-0 py-4 sm:p-4 gap-2 sm:gap-3 md:gap-4"
		role="grid"
		aria-label="로또 번호별 스캔 현황"
	>
		{#each numbers as ball (ball.id)}
			{@const isUpdated = ballValuesComposable.recentlyUpdated[ball.id] || false}
			{@const hasData = ballValuesComposable.totalScans > 0}
			{#if enableNavigation}
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
					{#if incrementEffectConfig.show}
						<ValueIncrementEffect 
							show={isUpdated} 
							message={incrementEffectConfig.message || "+1"} 
							color={incrementEffectConfig.color || "text-green-600 dark:text-green-400"} 
						/>
					{/if}
					<LottoBall 
						ballNumber={ball.id} 
						initialValue={ball.value}
						size="small"
						interactive={true}
					/>
				</a>
			{:else}
				<div 
					class="ball-grid-item {hasData ? '' : 'opacity-75'}"
					aria-label="로또 번호 {ball.id}번. 현재 {ball.value}회 스캔됨"
					role="gridcell"
					data-ball-number={ball.id}
				>
					{#if incrementEffectConfig.show}
						<ValueIncrementEffect 
							show={isUpdated} 
							message={incrementEffectConfig.message || "+1"} 
							color={incrementEffectConfig.color || "text-green-600 dark:text-green-400"} 
						/>
					{/if}
					<LottoBall 
						ballNumber={ball.id} 
						initialValue={ball.value}
						size="small"
						interactive={false}
					/>
				</div>
			{/if}
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
	{#if showHeader}
		<div class="skeleton h-14 mx-4 mt-4 mb-3 rounded-xl"></div>
	{/if}
	
	<div class="grid grid-cols-5 sm:grid-cols-5 md:grid-cols-5 lg:grid-cols-5 p-0 py-4 sm:p-4 gap-2 sm:gap-3 md:gap-4">
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