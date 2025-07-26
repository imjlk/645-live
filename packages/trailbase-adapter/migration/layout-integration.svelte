<script lang="ts">
/**
 * 마이그레이션된 레이아웃 파일 예시
 * +layout.svelte에서 TrailBase adapter 초기화
 */
import { onMount, onDestroy } from 'svelte';
import { browser } from '$app/environment';
import { initializeTrailBaseAdapter, cleanupTrailBaseAdapter } from './app-setup.js';

// 기존 imports
import '../app.css';
import Header from '$lib/layout/Header.svelte';
import Footer from '$lib/layout/Footer.svelte';
import PageTransition from '$lib/layout/PageTransition.svelte';

// 새로운 adapter 기반 컴포넌트들
import ConnectionStatus from './ConnectionStatus-migrated.svelte';

let isAdapterInitialized = $state(false);
let initializationError = $state<string | null>(null);

onMount(async () => {
	if (browser) {
		try {
			await initializeTrailBaseAdapter();
			isAdapterInitialized = true;
			console.log('✅ App layout: TrailBase adapter ready');
		} catch (error) {
			console.error('❌ App layout: TrailBase adapter initialization failed:', error);
			initializationError = error instanceof Error ? error.message : 'Unknown error';
		}
	}
});

onDestroy(() => {
	if (browser && isAdapterInitialized) {
		cleanupTrailBaseAdapter();
	}
});
</script>

<svelte:head>
	<title>645.live - 로또 통계 분석</title>
	<meta name="description" content="실시간 로또 번호 통계 및 분석 서비스" />
</svelte:head>

<div class="app">
	<!-- 헤더 -->
	<Header />
	
	<!-- TrailBase 연결 상태 표시 -->
	{#if browser}
		<div class="connection-status-bar">
			{#if isAdapterInitialized}
				<ConnectionStatus showDetails={false} size="small" />
			{:else if initializationError}
				<div class="error-status">
					<span class="text-red-500 text-xs">
						⚠️ 실시간 연결 실패: {initializationError}
					</span>
				</div>
			{:else}
				<div class="loading-status">
					<span class="text-yellow-500 text-xs">
						⏳ 실시간 연결 초기화 중...
					</span>
				</div>
			{/if}
		</div>
	{/if}

	<!-- 메인 콘텐츠 -->
	<main class="main-content">
		<PageTransition>
			<slot />
		</PageTransition>
	</main>

	<!-- 푸터 -->
	<Footer />
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	.connection-status-bar {
		position: sticky;
		top: 0;
		z-index: 50;
		background-color: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(8px);
		border-bottom: 1px solid rgba(0, 0, 0, 0.1);
		padding: 4px 16px;
		display: flex;
		justify-content: flex-end;
	}

	.main-content {
		flex: 1;
		padding: 20px;
	}

	.error-status,
	.loading-status {
		padding: 4px 8px;
		border-radius: 4px;
	}

	.error-status {
		background-color: rgba(239, 68, 68, 0.1);
	}

	.loading-status {
		background-color: rgba(245, 158, 11, 0.1);
	}

	@media (max-width: 768px) {
		.main-content {
			padding: 10px;
		}
		
		.connection-status-bar {
			padding: 2px 8px;
		}
	}
</style>