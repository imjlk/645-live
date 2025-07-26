<script lang="ts">
/**
 * 마이그레이션된 ScanStatusGrid 컴포넌트
 * 새로운 TrailBase adapter와 composables 사용
 */
import { onMount, onDestroy } from 'svelte';
import { useRealtimeData, useRealtimeSubscription } from '@645live/trailbase-adapter/svelte';
import { getAdapter } from '@645live/trailbase-adapter';
import type { BaseRecord } from '@645live/trailbase-adapter';

// 로또 데이터 타입 정의
interface LottoDrawScanCount extends BaseRecord {
	round: number;
	scan_count_1: number;
	scan_count_2: number;
	scan_count_3: number;
	scan_count_4: number;
	scan_count_5: number;
	scan_count_6: number;
	scan_count_7: number;
	scan_count_8: number;
	scan_count_9: number;
	scan_count_10: number;
	scan_count_11: number;
	scan_count_12: number;
	scan_count_13: number;
	scan_count_14: number;
	scan_count_15: number;
	scan_count_16: number;
	scan_count_17: number;
	scan_count_18: number;
	scan_count_19: number;
	scan_count_20: number;
	scan_count_21: number;
	scan_count_22: number;
	scan_count_23: number;
	scan_count_24: number;
	scan_count_25: number;
	scan_count_26: number;
	scan_count_27: number;
	scan_count_28: number;
	scan_count_29: number;
	scan_count_30: number;
	scan_count_31: number;
	scan_count_32: number;
	scan_count_33: number;
	scan_count_34: number;
	scan_count_35: number;
	scan_count_36: number;
	scan_count_37: number;
	scan_count_38: number;
	scan_count_39: number;
	scan_count_40: number;
	scan_count_41: number;
	scan_count_42: number;
	scan_count_43: number;
	scan_count_44: number;
	scan_count_45: number;
	total_scans: number;
	updated_at: string;
}

interface Props {
	targetRound?: number;
	autoLoad?: boolean;
	showAnimations?: boolean;
}

let { 
	targetRound, 
	autoLoad = true, 
	showAnimations = true 
}: Props = $props();

// 어댑터 인스턴스 가져오기
const adapter = getAdapter<LottoDrawScanCount>();

// 초기 데이터 로드
const scanData = useRealtimeData(adapter, {
	table: 'lotto_draw_scan_counts',
	id: targetRound,
	autoLoad,
	onError: (error) => {
		console.error('Scan data load error:', error);
	}
});

// 실시간 업데이트 구독
const realtimeUpdates = useRealtimeSubscription(adapter, {
	table: 'lotto_draw_scan_counts',
	filter: targetRound ? { round: targetRound } : undefined,
	onUpdate: (data) => {
		console.log('Real-time scan data update:', data);
		// 애니메이션 트리거
		if (showAnimations) {
			triggerUpdateAnimations(data);
		}
	}
});

// 애니메이션 상태
let recentlyUpdated = $state<Record<number, boolean>>({});
let ballValues = $state<Record<number, number>>({});
let totalScans = $state(0);
let currentRound = $state<number | null>(null);

// 구독 정리 함수들
let unsubscribeCallbacks: (() => void)[] = [];

// 볼 값 추출 함수
const extractBallValues = (data: LottoDrawScanCount): Record<number, number> => {
	const values: Record<number, number> = {};
	for (let i = 1; i <= 45; i++) {
		const scanCountField = `scan_count_${i}` as keyof LottoDrawScanCount;
		values[i] = Number(data[scanCountField]) || 0;
	}
	return values;
};

// 애니메이션 트리거 함수
const triggerUpdateAnimations = (newData: LottoDrawScanCount) => {
	const newValues = extractBallValues(newData);
	const updatedBalls: Record<number, boolean> = {};

	for (let i = 1; i <= 45; i++) {
		const newValue = newValues[i];
		const currentValue = ballValues[i] || 0;

		if (newValue !== currentValue) {
			updatedBalls[i] = true;
			
			// 애니메이션 제거 (1.2초 후)
			setTimeout(() => {
				recentlyUpdated = {
					...recentlyUpdated,
					[i]: false,
				};
			}, 1200);
		}
	}

	// 상태 업데이트
	ballValues = newValues;
	totalScans = Number(newData.total_scans) || 0;
	currentRound = newData.round;
	recentlyUpdated = { ...recentlyUpdated, ...updatedBalls };
};

// 초기 데이터 처리
$effect(() => {
	if (scanData.data && !Array.isArray(scanData.data)) {
		const data = scanData.data as LottoDrawScanCount;
		ballValues = extractBallValues(data);
		totalScans = Number(data.total_scans) || 0;
		currentRound = data.round;
	}
});

// 최신 업데이트 처리
$effect(() => {
	if (realtimeUpdates.latestUpdate) {
		triggerUpdateAnimations(realtimeUpdates.latestUpdate);
	}
});

onMount(() => {
	// 구독 시작
	unsubscribeCallbacks.push(
		scanData.subscribe(),
		realtimeUpdates.subscribe()
	);
});

onDestroy(() => {
	// 구독 정리
	unsubscribeCallbacks.forEach(unsubscribe => unsubscribe());
});

// 볼 번호 배열 생성
const ballNumbers = Array.from({ length: 45 }, (_, i) => i + 1);

// 볼 색상 결정 함수
const getBallColor = (ballNumber: number): string => {
	if (ballNumber <= 10) return 'bg-yellow-400 text-yellow-900';
	if (ballNumber <= 20) return 'bg-blue-400 text-blue-900';
	if (ballNumber <= 30) return 'bg-red-400 text-red-900';
	if (ballNumber <= 40) return 'bg-gray-400 text-gray-900';
	return 'bg-green-400 text-green-900';
};

// 스캔 수에 따른 강도 클래스
const getIntensityClass = (scanCount: number): string => {
	if (scanCount === 0) return 'opacity-30';
	if (scanCount < 10) return 'opacity-50';
	if (scanCount < 50) return 'opacity-70';
	if (scanCount < 100) return 'opacity-85';
	return 'opacity-100';
};
</script>

<div class="scan-status-grid">
	<!-- 헤더 정보 -->
	<div class="grid-header mb-4">
		<div class="flex justify-between items-center">
			<h3 class="text-lg font-semibold">
				{#if currentRound}
					Round {currentRound} 스캔 현황
				{:else}
					로또 스캔 현황
				{/if}
			</h3>
			<div class="text-sm text-gray-600">
				총 스캔: <span class="font-bold">{totalScans.toLocaleString()}</span>
			</div>
		</div>
		
		{#if scanData.loading}
			<div class="text-sm text-gray-500">데이터 로딩 중...</div>
		{:else if scanData.error}
			<div class="text-sm text-red-500">
				오류: {scanData.error.message}
				<button 
					class="ml-2 px-2 py-1 text-xs bg-red-500 text-white rounded"
					onclick={() => scanData.refetch()}
				>
					재시도
				</button>
			</div>
		{/if}
	</div>

	<!-- 볼 그리드 -->
	<div class="balls-grid grid grid-cols-9 gap-2 sm:gap-3">
		{#each ballNumbers as ballNumber}
			{@const scanCount = ballValues[ballNumber] || 0}
			{@const isUpdated = recentlyUpdated[ballNumber] || false}
			
			<div 
				class="ball-item relative flex flex-col items-center p-2 rounded-lg border transition-all duration-300 {getBallColor(ballNumber)} {getIntensityClass(scanCount)}"
				class:animate-pulse={isUpdated && showAnimations}
				class:ring-2={isUpdated && showAnimations}
				class:ring-yellow-400={isUpdated && showAnimations}
			>
				<!-- 볼 번호 -->
				<div class="ball-number w-8 h-8 rounded-full bg-white bg-opacity-90 flex items-center justify-center font-bold text-sm mb-1">
					{ballNumber}
				</div>
				
				<!-- 스캔 수 -->
				<div class="scan-count text-xs font-medium">
					{scanCount}
				</div>
				
				<!-- 업데이트 인디케이터 -->
				{#if isUpdated && showAnimations}
					<div class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
				{/if}
			</div>
		{/each}
	</div>

	<!-- 범례 -->
	<div class="legend mt-4 text-xs text-gray-600">
		<div class="flex flex-wrap gap-4">
			<div class="flex items-center gap-1">
				<div class="w-3 h-3 bg-yellow-400 rounded"></div>
				<span>1-10</span>
			</div>
			<div class="flex items-center gap-1">
				<div class="w-3 h-3 bg-blue-400 rounded"></div>
				<span>11-20</span>
			</div>
			<div class="flex items-center gap-1">
				<div class="w-3 h-3 bg-red-400 rounded"></div>
				<span>21-30</span>
			</div>
			<div class="flex items-center gap-1">
				<div class="w-3 h-3 bg-gray-400 rounded"></div>
				<span>31-40</span>
			</div>
			<div class="flex items-center gap-1">
				<div class="w-3 h-3 bg-green-400 rounded"></div>
				<span>41-45</span>
			</div>
		</div>
	</div>

	<!-- 연결 상태 -->
	<div class="connection-info mt-2 text-xs">
		{#if realtimeUpdates.connectionState.connected}
			<span class="text-green-600">✓ 실시간 연결됨</span>
		{:else if realtimeUpdates.connectionState.connecting}
			<span class="text-yellow-600">⏳ 연결 중...</span>
		{:else}
			<span class="text-red-600">✗ 연결 끊김</span>
			<button 
				class="ml-2 px-2 py-1 bg-blue-500 text-white rounded"
				onclick={() => realtimeUpdates.reconnect()}
			>
				재연결
			</button>
		{/if}
	</div>
</div>

<style>
	.balls-grid {
		max-width: 100%;
	}

	.ball-item {
		min-height: 60px;
		transition: all 0.3s ease;
	}

	.ball-item:hover {
		transform: scale(1.05);
		z-index: 10;
	}

	@media (max-width: 640px) {
		.balls-grid {
			grid-template-columns: repeat(7, 1fr);
			gap: 0.5rem;
		}
		
		.ball-item {
			min-height: 50px;
			padding: 0.25rem;
		}
		
		.ball-number {
			width: 1.5rem;
			height: 1.5rem;
			font-size: 0.75rem;
		}
	}

	@keyframes pulse-update {
		0%, 100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.1);
		}
	}

	.animate-pulse {
		animation: pulse-update 0.6s ease-in-out;
	}
</style>