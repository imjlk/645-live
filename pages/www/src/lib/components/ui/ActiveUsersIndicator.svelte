<script lang="ts">
/**
 * 실시간 접속자 수 표시 컴포넌트 (단순화된 구조)
 */
import { onMount, onDestroy } from "svelte";
import { 
	subscribeToActiveUsers,
	type ActiveUsersStats 
} from "$lib/trailbase/active-users-client";

interface Props {
	showPeakUsers?: boolean;
	compact?: boolean;
	showConnectionStatus?: boolean;
}

let { 
	showPeakUsers = false, 
	compact = false, 
	showConnectionStatus = true 
}: Props = $props();

// State
let currentUsers = $state(0);
let peakUsers = $state(0);
let isConnected = $state(false);
let isVisible = $state(false);

// Subscription cleanup function
let unsubscribeUsers: (() => void) | null = null;

// Animation state
let recentlyUpdated = $state(false);

onMount(() => {
	console.log('[ActiveUsersIndicator] Component mounted, subscribing to users');
	
	// 활성 유저 통계 구독
	unsubscribeUsers = subscribeToActiveUsers("active-users-indicator", (stats: ActiveUsersStats) => {
		console.log(`[ActiveUsersIndicator] Users update: ${currentUsers} → ${stats.current_count}, peak: ${stats.peak_count}`);
		
		if (stats.current_count !== currentUsers) {
			recentlyUpdated = true;
			setTimeout(() => {
				recentlyUpdated = false;
			}, 1000);
		}
		
		currentUsers = stats.current_count;
		peakUsers = stats.peak_count;
		isConnected = true;
		isVisible = true;
	});
});

onDestroy(() => {
	if (unsubscribeUsers) {
		unsubscribeUsers();
	}
});

// 연결 상태에 따른 스타일 클래스
const getConnectionStatusClass = (connected: boolean): string => {
	return connected 
		? "text-green-600 dark:text-green-400"
		: "text-red-600 dark:text-red-400";
};

// 접속자 수에 따른 아이콘
const getUserIcon = (count: number): string => {
	if (count >= 100) return "👥";
	if (count >= 50) return "👫";
	if (count >= 10) return "👬";
	return "👤";
};
</script>

{#if isVisible}
	<div 
		class="active-users-indicator flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-all duration-300"
		class:animate-pulse={recentlyUpdated}
		class:compact
	>
		<!-- 연결 상태 표시 -->
		{#if showConnectionStatus}
			<div class="flex items-center gap-1">
				<div 
					class="w-2 h-2 rounded-full transition-colors duration-300 {isConnected ? 'bg-green-500 shadow-green-500/50 shadow-sm' : 'bg-red-500'}"
				></div>
				{#if !compact}
					<span class="text-xs {getConnectionStatusClass(isConnected)}">
						{isConnected ? '온라인' : '오프라인'}
					</span>
				{/if}
			</div>
		{/if}
		
		<!-- 접속자 수 표시 -->
		<div class="flex items-center gap-1.5">
			<span class="text-sm" title="현재 접속자 수">
				{getUserIcon(currentUsers)}
			</span>
			<div class="flex items-center gap-1">
				<span class="font-semibold text-sm text-gray-800 dark:text-gray-200">
					{currentUsers.toLocaleString()}
				</span>
				{#if !compact}
					<span class="text-xs text-gray-500 dark:text-gray-400">
						{currentUsers === 1 ? '명' : '명'}
					</span>
				{/if}
			</div>
		</div>
		
		<!-- 최고 접속자 수 표시 (옵션) -->
		{#if showPeakUsers && peakUsers > currentUsers}
			<div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
				<span>최고</span>
				<span class="font-medium">{peakUsers.toLocaleString()}</span>
			</div>
		{/if}
		
		<!-- 업데이트 인디케이터 -->
		{#if recentlyUpdated}
			<div class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></div>
		{/if}
	</div>
{/if}

<style>
.active-users-indicator.compact {
	padding: 0.375rem 0.5rem;
	font-size: 0.75rem;
}

.active-users-indicator:hover {
	transform: translateY(-1px);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

@media (max-width: 640px) {
	.active-users-indicator {
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
	}
}
</style>