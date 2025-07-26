<script lang="ts">
	/**
	 * Svelte 5 usage examples for TrailBase adapter
	 */
	
	import { onMount, onDestroy } from 'svelte';
	import { createAdapter } from '../src/index.js';
	import {
		useRealtimeData,
		useConnectionStatus,
		useRealtimeSubscription,
		useCachedData
	} from '../src/svelte/index.js';
	import type { BaseRecord } from '../src/types/index.js';

	// Define your record type
	interface LottoDrawScanCount extends BaseRecord {
		round: number;
		scan_count_1: number;
		scan_count_2: number;
		total_scans: number;
		updated_at: string;
	}

	// Create adapter instance
	const adapter = createAdapter<LottoDrawScanCount>('trailbase', {
		url: 'http://localhost:4000'
	});

	// Example 1: Real-time data with auto-loading
	const realtimeData = useRealtimeData(adapter, {
		table: 'lotto_draw_scan_counts',
		autoLoad: true,
		order: ['-round'],
		limit: 1,
		onUpdate: (data) => {
			console.log('Data updated:', data);
		},
		onError: (error) => {
			console.error('Data error:', error);
		}
	});

	// Example 2: Connection status monitoring
	const connectionStatus = useConnectionStatus(adapter);

	// Example 3: Pure subscription without initial loading
	const subscription = useRealtimeSubscription(adapter, {
		table: 'lotto_draw_scan_counts',
		filter: { round: 1234 },
		onUpdate: (data) => {
			console.log('Subscription update:', data);
		}
	});

	// Example 4: Cached data with automatic refresh
	const cachedData = useCachedData(adapter, {
		table: 'lotto_draw_scan_counts',
		id: 1234,
		refreshInterval: 30000,
		staleTime: 60000
	});

	let unsubscribeCallbacks: (() => void)[] = [];

	onMount(() => {
		// Set up subscriptions
		unsubscribeCallbacks.push(
			realtimeData.subscribe(),
			connectionStatus.subscribe(),
			subscription.subscribe()
		);
	});

	onDestroy(() => {
		// Clean up subscriptions
		unsubscribeCallbacks.forEach(unsubscribe => unsubscribe());
		adapter.destroy();
	});
</script>

<div class="trailbase-example">
	<h2>TrailBase Adapter Svelte Example</h2>

	<!-- Connection Status -->
	<div class="connection-status">
		<h3>Connection Status</h3>
		<div class="status" class:connected={connectionStatus.connected}>
			{#if connectionStatus.connecting}
				<span class="indicator connecting">⏳</span> Connecting...
			{:else if connectionStatus.connected}
				<span class="indicator connected">✅</span> Connected
			{:else}
				<span class="indicator disconnected">❌</span> Disconnected
			{/if}
		</div>
		
		{#if connectionStatus.error}
			<p class="error">Error: {connectionStatus.error.message}</p>
		{/if}
		
		{#if connectionStatus.retryCount > 0}
			<p class="retry">Retry attempts: {connectionStatus.retryCount}</p>
		{/if}

		<button onclick={() => connectionStatus.reconnect()}>
			Reconnect
		</button>
	</div>

	<!-- Real-time Data -->
	<div class="realtime-data">
		<h3>Real-time Data</h3>
		{#if realtimeData.loading}
			<p>Loading...</p>
		{:else if realtimeData.error}
			<p class="error">Error: {realtimeData.error.message}</p>
		{:else if realtimeData.data}
			{#if Array.isArray(realtimeData.data)}
				{#each realtimeData.data as item}
					<div class="data-item">
						Round: {item.round}, Total Scans: {item.total_scans}
					</div>
				{/each}
			{:else}
				<div class="data-item">
					Round: {realtimeData.data.round}, Total Scans: {realtimeData.data.total_scans}
				</div>
			{/if}
		{:else}
			<p>No data available</p>
		{/if}

		<button onclick={() => realtimeData.refetch()}>
			Refresh Data
		</button>
	</div>

	<!-- Latest Subscription Update -->
	<div class="subscription-data">
		<h3>Latest Subscription Update</h3>
		{#if subscription.latestUpdate}
			<div class="data-item">
				Round: {subscription.latestUpdate.round}
				<br>
				Total Scans: {subscription.latestUpdate.total_scans}
				<br>
				Updated: {subscription.latestUpdate.updated_at}
			</div>
		{:else}
			<p>Waiting for updates...</p>
		{/if}
	</div>

	<!-- Cached Data -->
	<div class="cached-data">
		<h3>Cached Data</h3>
		{#if cachedData.loading}
			<p>Loading cached data...</p>
		{:else if cachedData.error}
			<p class="error">Error: {cachedData.error.message}</p>
		{:else if cachedData.data}
			<div class="data-item">
				{#if Array.isArray(cachedData.data)}
					{#each cachedData.data as item}
						<div>Round: {item.round}, Total Scans: {item.total_scans}</div>
					{/each}
				{:else}
					Round: {cachedData.data.round}, Total Scans: {cachedData.data.total_scans}
				{/if}
			</div>
		{/if}
		
		<div class="cache-info">
			<p>Stale: {cachedData.isStale ? 'Yes' : 'No'}</p>
			{#if cachedData.lastFetched}
				<p>Last fetched: {cachedData.lastFetched.toLocaleTimeString()}</p>
			{/if}
		</div>

		<div class="cache-actions">
			<button onclick={() => cachedData.refetch()}>
				Refresh Cache
			</button>
			<button onclick={() => cachedData.invalidate()}>
				Invalidate Cache
			</button>
		</div>
	</div>
</div>

<style>
	.trailbase-example {
		padding: 20px;
		font-family: system-ui, sans-serif;
	}

	.connection-status,
	.realtime-data,
	.subscription-data,
	.cached-data {
		margin-bottom: 30px;
		padding: 15px;
		border: 1px solid #ddd;
		border-radius: 8px;
	}

	.status {
		padding: 10px;
		border-radius: 4px;
		margin: 10px 0;
	}

	.status.connected {
		background-color: #d4edda;
		color: #155724;
	}

	.indicator {
		margin-right: 8px;
	}

	.error {
		color: #dc3545;
		font-weight: bold;
	}

	.retry {
		color: #ffc107;
	}

	.data-item {
		padding: 8px;
		background-color: #f8f9fa;
		border: 1px solid #e9ecef;
		border-radius: 4px;
		margin: 5px 0;
	}

	.cache-info {
		margin: 10px 0;
		font-size: 0.9em;
		color: #6c757d;
	}

	.cache-actions {
		display: flex;
		gap: 10px;
	}

	button {
		padding: 8px 16px;
		background-color: #007bff;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}

	button:hover {
		background-color: #0056b3;
	}
</style>