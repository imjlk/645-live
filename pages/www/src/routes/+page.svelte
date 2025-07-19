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
import { type Writable, writable } from "svelte/store";
import type { PageData } from "./$types";

export let data: PageData;

// Track which balls have recently changed value to show animation
const recentlyUpdated: Writable<Record<number, boolean>> = writable({});

// Client-side initial data and error state
let error: string | null = null;

// Initialize numbers with a default empty array - will be generated for 1-45
let numbers: BallNumber[] = [];
// Create a reactive store for the values from scan counts
const ballValues: Writable<Record<number, number>> = writable({});
// Store the current round data
let currentRound: number | null = null;
// Store total scan count
let totalScans = 0;

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
				ballValues.set(values);

				// Generate numbers array for rendering (1-45)
				numbers = Array.from({ length: 45 }, (_, i) => ({
					id: i + 1,
					value: values[i + 1] || 0,
				}));
				return; // Successfully loaded target round data
			}

			console.log(
				`No scan data found for round ${targetRound}, initializing with zeros`,
			);
			// Round not found, initialize with zeros for the target round
			currentRound = targetRound;
			totalScans = 0;

			const values: Record<number, number> = {};
			for (let i = 1; i <= 45; i++) {
				values[i] = 0;
			}
			ballValues.set(values);

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
			ballValues.set(values);

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
			ballValues.set(values);

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
		console.log("Received scan count data via global stream:", scanData);

		// Only update if this is for the current round we're displaying
		if (scanData.round !== currentRound) {
			// Update current round if it changed
			currentRound = scanData.round;
			console.log(`Round updated to: ${currentRound}`);
		}

		// Update the ballValues store with new scan counts
		ballValues.update((values) => {
			const newValues = { ...values };
			let hasChanges = false;

			// Check each scan count field for changes
			for (let i = 1; i <= 45; i++) {
				const scanCountField = `scan_count_${i}` as keyof LottoDrawScanCount;
				const newCount = Number(scanData[scanCountField]) || 0;
				const currentCount = values[i] || 0;

				if (newCount !== currentCount) {
					console.log(
						`Ball ${i} scan count updated from ${currentCount} to ${newCount}`,
					);
					newValues[i] = newCount;
					hasChanges = true;

					// Trigger animation for this ball
					recentlyUpdated.update((balls) => ({
						...balls,
						[i]: true,
					}));

					// Remove the animation after a delay
					setTimeout(() => {
						recentlyUpdated.update((balls) => ({
							...balls,
							[i]: false,
						}));
					}, 1000);
				}
			}

			return newValues;
		});

		// Update total scans
		const newTotalScans = Number(scanData.total_scans) || 0;
		if (newTotalScans !== totalScans) {
			totalScans = newTotalScans;
			console.log(`Total scans updated to: ${totalScans}`);
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

// Helper function to get ball color class based on its number
function getBallColorClass(ballNumber: number): string {
	if (ballNumber <= 10) return "bg-yellow-500";
	if (ballNumber <= 20) return "bg-blue-500";
	if (ballNumber <= 30) return "bg-red-500";
	if (ballNumber <= 40) return "bg-gray-500";
	return "bg-green-500";
}
</script>

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
                <svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
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
            {@const value = $ballValues[ball.id] || 0}
            {@const isUpdated = $recentlyUpdated[ball.id] || false}
            <LinkButton class="aspect-square w-full min-h-30 relative" href="/n/{ball.id}">
                <ValueIncrementEffect show={isUpdated} message="+1" color="text-green-500" />
                <LottoBall 
                    ballNumber={ball.id} 
                    initialValue={value}
                />
            </LinkButton>
        {/each}
    </div>
{:else}
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 p-0 py-4 sm:p-4 gap-4">
        {#each Array(45) as _, i}
            <div class="skeleton aspect-square w-full min-h-30 rounded-full"></div>
        {/each}
    </div>
{/if}
