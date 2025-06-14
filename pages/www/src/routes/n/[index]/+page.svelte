<script lang="ts">
import { env } from "$env/dynamic/public";
import { page } from "$app/state";
import { error } from "@sveltejs/kit";
import LottoBall from "$lib/modules/lotto/components/LottoBall.svelte";
import ValueIncrementEffect from "$lib/modules/lotto/components/ValueIncrementEffect.svelte";
import { onDestroy, onMount } from "svelte";
import { writable, type Writable } from "svelte/store";
import { Client, type Event as TrailbaseEvent } from "trailbase";

const ballNumber = $derived(Number(page.params.index));

// Validate ball number range (1-45 for Korean lotto)
$effect(() => {
	if (isNaN(ballNumber) || ballNumber < 1 || ballNumber > 45) {
		error(404, {
			message: 'Ball number must be between 1 and 45'
		});
	}
});

// Reactive stores for real-time updates
const ballValue: Writable<number> = writable(0);
const isUpdated: Writable<boolean> = writable(false);

const client = Client.init(env.PUBLIC_TRAILBASE_URL || "http://localhost:4000");
const api = client.records("numbers");

let stream: ReadableStream<TrailbaseEvent> | null;
let reader: ReadableStreamDefaultReader<TrailbaseEvent> | null = null;
let isReading = false;

// Function to handle stream cleanup
async function cleanupStream() {
	console.log("Cleaning up stream resources");
	isReading = false;

	if (reader) {
		try {
			await reader.cancel();
			console.log("Stream reader cancelled");
		} catch (err) {
			console.error("Error cancelling reader:", err);
		}
		reader = null;
	}
	stream = null;
}

onMount(async () => {
	// First, fetch the initial value for this specific ball
	try {
		const response = await api.read<{id:string, value:number}>(`${ballNumber}`);

		ballValue.set(response.value || 0);
	} catch (err) {
		console.error("Error fetching initial ball value:", err);
	}

	// Then set up real-time updates
	try {
		stream = await api.subscribe(`${ballNumber}`);
		console.log("Stream connected for ball", ballNumber);

		if (stream) {
			reader = stream.getReader();
			isReading = true;
			readStreamData();
		}
	} catch (err) {
		console.error("Error setting up stream:", err);
	}
});

// Function for reading stream data
async function readStreamData() {
	if (!reader) return;

	try {
		while (isReading) {
			const { done, value } = await reader.read();

			if (done) {
				console.log("Stream completed");
				break;
			}

			// Process the event data for this specific ball
			if (value && "Update" in value) {
				const ballData = value.Update as any;
				
				// Only update if this is the ball we're displaying
				if (ballData.id === ballNumber) {
					console.log("Received update for ball", ballNumber, ballData);
					
					ballValue.update((currentValue) => {
						const newValue = currentValue + 1;
						
						// Trigger animation
						isUpdated.set(true);
						setTimeout(() => {
							isUpdated.set(false);
						}, 1000);

						return newValue;
					});
				}
			}
		}
	} catch (err) {
		console.error("Error reading stream:", err);
	} finally {
		if (isReading) {
			await cleanupStream();
		}
	}
}

onDestroy(() => {
	cleanupStream();
});
</script>

<div class="p-0 py-4 sm:p-4 grid-cols-2 grid">
	<div class="aspect-square w-full min-h-30 relative">
		<ValueIncrementEffect show={$isUpdated} message="+1" color="text-green-500" />
		<LottoBall {ballNumber} initialValue={$ballValue} />
	</div>
</div>