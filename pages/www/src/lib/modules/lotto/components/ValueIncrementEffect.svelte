<script lang="ts">
import { quintOut } from "svelte/easing";
import { fade, fly } from "svelte/transition";

// Boolean to track if animation should show
export let show = false;
// Message to display (usually "+1")
export let message = "+1";
// Color of the animation text
export let color = "text-green-500";
</script>

{#if show}
<div 
  class="absolute pointer-events-none flex justify-center items-center w-full h-full top-0 left-0 z-20 overflow-hidden"
>
  <div
    class="text-xl font-black {color} drop-shadow-lg bg-white/90 dark:bg-gray-900/90 px-2 py-1 rounded-full border-2 border-current"
    in:fly={{ y: -20, duration: 600, easing: quintOut }} 
    out:fade={{ duration: 400 }}
  >
    {message}
  </div>
</div>
{/if}
