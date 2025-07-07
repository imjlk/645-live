<script lang="ts">
import { page } from "$app/state";
import LottoBall from "$lib/modules/lotto/components/LottoBall.svelte";
import ValueIncrementEffect from "$lib/modules/lotto/components/ValueIncrementEffect.svelte";
import {
	type LottoDrawScanCount,
	getScanCountApi,
	getScanDataSafely,
	subscribeToScanCountUpdates,
} from "$lib/stores/streamStore";
import { calculateDisplayRound } from "$lib/utils/lotto-api";
import { error } from "@sveltejs/kit";
import { onDestroy, onMount } from "svelte";
import { type Writable, writable } from "svelte/store";

const ballNumber = $derived(Number(page.params.index));

// Validate ball number range (1-45 for Korean lotto)
$effect(() => {
	if (Number.isNaN(ballNumber) || ballNumber < 1 || ballNumber > 45) {
		error(404, {
			message: "Ball number must be between 1 and 45",
		});
	}
});

// Reactive stores for real-time updates
const ballValue: Writable<number> = writable(0);
const isUpdated: Writable<boolean> = writable(false);

// Store current round for tracking
let currentRound: number | null = null;

// 전역 스트림 구독 해제 함수
let unsubscribeStream: (() => void) | null = null;

onMount(async () => {
	// Get the current display round
	const displayRound = calculateDisplayRound();
	currentRound = displayRound;

	// First, fetch the initial value for this specific ball from the current round
	const scanData = await getScanDataSafely(displayRound);

	if (scanData) {
		// Get the scan count for this specific ball
		const scanCountField =
			`scan_count_${ballNumber}` as keyof LottoDrawScanCount;
		const ballScanCount = Number(scanData[scanCountField]) || 0;
		ballValue.set(ballScanCount);
	} else {
		// No data for this round yet, initialize with 0
		console.log(
			`No scan data found for round ${displayRound}, ball ${ballNumber}, initializing with 0`,
		);
		ballValue.set(0);
	}

	// Set up global stream subscription for real-time updates
	unsubscribeStream = subscribeToScanCountUpdates(
		`ball-${ballNumber}`,
		(scanData) => {
			console.log(
				"Received scan count update via global stream for round",
				scanData.round,
				"ball",
				ballNumber,
			);

			// Only update if this is for the current round we're displaying
			if (scanData.round === currentRound) {
				// Get the scan count for this specific ball
				const scanCountField =
					`scan_count_${ballNumber}` as keyof LottoDrawScanCount;
				const newScanCount = Number(scanData[scanCountField]) || 0;

				ballValue.update((currentValue) => {
					// Only trigger animation if the value actually increased
					if (newScanCount > currentValue) {
						// Trigger animation
						isUpdated.set(true);
						setTimeout(() => {
							isUpdated.set(false);
						}, 1000);
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
		unsubscribeStream = null;
	}
});
</script>

<div class="p-0 py-4 sm:p-4 grid-cols-2 grid">
	<div class="aspect-square w-full min-h-30 relative">
		<ValueIncrementEffect show={$isUpdated} message="+1" color="text-green-500" />
		<LottoBall {ballNumber} initialValue={$ballValue} />
	</div>
</div>