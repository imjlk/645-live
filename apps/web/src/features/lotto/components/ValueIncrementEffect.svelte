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
  class="absolute pointer-events-none flex justify-center items-center w-full h-full top-0 left-0 z-10 overflow-hidden"
>
  <div
    class="text-lg font-bold {color}"
    in:fly={{ y: 10, duration: 800, easing: quintOut }} 
    out:fade={{ duration: 300 }}
  >
    {message}
  </div>
</div>
{/if}
