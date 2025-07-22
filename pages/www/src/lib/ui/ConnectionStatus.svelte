<script lang="ts">
import { useConnectionStatus } from "$lib/trailbase/composables.svelte";
import { onDestroy, onMount } from "svelte";

interface Props {
	showDetails?: boolean;
	position?: "top" | "bottom";
	size?: "small" | "medium";
}

let { showDetails = false, position = "top", size = "small" }: Props = $props();

const connectionStatus = useConnectionStatus();
let unsubscribe: (() => void) | null = null;

onMount(() => {
	unsubscribe = connectionStatus.subscribe();
});

onDestroy(() => {
	if (unsubscribe) {
		unsubscribe();
	}
});

const statusConfig = $derived(
	connectionStatus.connected
		? {
				color: "bg-green-500",
				text: "연결됨",
				textColor: "text-green-700 dark:text-green-300",
				bgColor: "bg-green-50 dark:bg-green-900/20",
				borderColor: "border-green-200 dark:border-green-800",
			}
		: connectionStatus.connecting
			? {
					color: "bg-yellow-500 animate-pulse",
					text: "연결 중...",
					textColor: "text-yellow-700 dark:text-yellow-300",
					bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
					borderColor: "border-yellow-200 dark:border-yellow-800",
				}
			: {
					color: "bg-red-500",
					text: "연결 끊김",
					textColor: "text-red-700 dark:text-red-300",
					bgColor: "bg-red-50 dark:bg-red-900/20",
					borderColor: "border-red-200 dark:border-red-800",
				},
);

const dotSize = size === "small" ? "w-2 h-2" : "w-3 h-3";
const textSize = size === "small" ? "text-xs" : "text-sm";
</script>

{#if showDetails}
  <div 
    class="connection-status-detailed border {statusConfig.borderColor} {statusConfig.bgColor} rounded-lg p-3 {position === 'bottom' ? 'mt-4' : 'mb-4'}"
    class:animate-slideIn={position === 'top'}
    class:animate-slideUp={position === 'bottom'}
  >
    <div class="flex items-center gap-3">
      <div class="{dotSize} {statusConfig.color} rounded-full"></div>
      <div class="flex-1">
        <p class="{statusConfig.textColor} font-medium {textSize}">
          실시간 연결: {statusConfig.text}
        </p>
        {#if connectionStatus.error}
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            오류: {connectionStatus.error.message}
          </p>
        {/if}
        {#if connectionStatus.retryCount > 0}
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            재시도 횟수: {connectionStatus.retryCount}
          </p>
        {/if}
      </div>
    </div>
  </div>
{:else}
  <!-- Simple indicator -->
  <div 
    class="connection-status-simple flex items-center gap-2"
    title="실시간 연결: {statusConfig.text}"
  >
    <div class="{dotSize} {statusConfig.color} rounded-full"></div>
    {#if size === 'medium'}
      <span class="{statusConfig.textColor} {textSize} font-medium">
        {statusConfig.text}
      </span>
    {/if}
  </div>
{/if}

<style>
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slideIn {
  animation: slideIn 0.3s ease-out;
}

.animate-slideUp {
  animation: slideUp 0.3s ease-out;
}
</style>