<script lang="ts">
import { env } from "$env/dynamic/public";
import LottoBall from "$lib/modules/lotto/components/LottoBall.svelte";
import ValueIncrementEffect from "$lib/modules/lotto/components/ValueIncrementEffect.svelte";
import type { BallNumber } from "$lib/modules/lotto/types";
import LinkButton from "$lib/ui/LinkButton.svelte";
import { onDestroy, onMount } from "svelte";
import { type Writable, writable } from "svelte/store";
import { Client, type Event as TrailbaseEvent } from "trailbase";

// Track which balls have recently changed value to show animation
const recentlyUpdated: Writable<Record<number, boolean>> = writable({});

const client = Client.init(env.PUBLIC_TRAILBASE_URL || "http://localhost:4000");
const api = client.records("numbers");

let stream: ReadableStream<TrailbaseEvent> | null;
let reader: ReadableStreamDefaultReader<TrailbaseEvent> | null = null;
let isReading = false;

// Client-side initial data and error state
let error: string | null = null;

// Initialize numbers with a default empty array
let numbers: BallNumber[] = [];
// Create a reactive store for the values
const ballValues: Writable<Record<number, number>> = writable({});

// Function to fetch initial lotto numbers from Trailbase
async function loadInitialData() {
    const apiClient = Client.init(env.PUBLIC_TRAILBASE_URL || "http://localhost:4000");
    const api = apiClient.records("numbers");
    try {
        const response = (await api.list<BallNumber>()).records;
        // Convert array of BallNumber to Record<number, number>
        const values: Record<number, number> = {};
        response.forEach((ball) => {
            values[ball.id] = ball.value;
        });
        ballValues.set(values);
        // Also update numbers array for rendering
        numbers = response;
    } catch (err: any) {
        error = err?.message || '초기 데이터 로딩에 실패했습니다.';
    }
}

onMount(async () => {
   // First load initial data
   await loadInitialData();
   if (error) return;
   try {
       stream = await api.subscribe("*");
        console.log("Stream connected");

        if (stream) {
            reader = stream.getReader();
            isReading = true;

            // Start reading in a separate async function to avoid blocking
            readStreamData();
        }
    } catch (err) {
        console.error("Error setting up stream:", err);
    }
});

// Separate function for reading stream data
async function readStreamData() {
	if (!reader) return;

	try {
		while (isReading) {
			const { done, value } = await reader.read();
			console.log(done, value);

			if (done) {
				console.log("Stream completed");
				break;
			}

			// Process the event data properly
			if (value && "Update" in value) {
				// Handle the incoming ball data
				const ballData = value.Update as unknown as BallNumber;
				console.log("Received ball data:", ballData);

				// Update the ballValues store
				ballValues.update((values) => {
					const currentValue = values[ballData.id] || 0;
					const newValue = currentValue + 1;
					console.log(
						`Ball ${ballData.id} value updated from ${currentValue} to ${newValue}`,
					);

					// Trigger animation by setting this ball as recently updated
					recentlyUpdated.update((balls) => ({
						...balls,
						[ballData.id]: true,
					}));

					// Remove the animation after a delay
					setTimeout(() => {
						recentlyUpdated.update((balls) => ({
							...balls,
							[ballData.id]: false,
						}));
					}, 1000);

					return { ...values, [ballData.id]: newValue };
				});
			}
		}
	} catch (err) {
		console.error("Error reading stream:", err);
	} finally {
		if (isReading) {
			// Only cleanup if not already cleaned up
			await cleanupStream();
		}
	}
}

// Function to clean up the Trailbase stream and reader
async function cleanupStream() {
    console.log("Cleaning up stream resources");
    // Stop the reading loop
    isReading = false;
    // Cancel the reader if present
    if (reader) {
        try {
            await reader.cancel();
            console.log("Stream reader cancelled");
        } catch (err) {
            console.error("Error cancelling reader:", err);
        }
        reader = null;
    }
    // Release the stream
    stream = null;
}

// Clean up on component unmount
onDestroy(() => {
	cleanupStream();
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
