<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  fallback?: Snippet<[Error]>;
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;
  children: Snippet;
}

let { fallback, onError, children }: Props = $props();

let error = $state<Error | null>(null);
let hasError = $derived(error !== null);

// Global error handler for unhandled promise rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const err = new Error(event.reason?.message || 'Unhandled promise rejection');
    handleError(err);
  });
}

function handleError(err: Error) {
  error = err;
  
  if (onError) {
    onError(err, { componentStack: 'Component stack not available in Svelte' });
  } else {
    console.error('ErrorBoundary caught an error:', err);
  }
}

function retry() {
  error = null;
}

// Export the handleError function for manual error reporting
export { handleError };
</script>

{#if hasError && error}
  {#if fallback}
    {@render fallback(error)}
  {:else}
    <div class="error-boundary bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mx-4 my-4">
      <div class="flex items-start gap-4">
        <div class="flex-shrink-0">
          <svg class="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
            오류가 발생했습니다
          </h3>
          <p class="text-red-700 dark:text-red-300 mb-4">
            죄송합니다. 예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
          </p>
          {#if error.message}
            <details class="mb-4">
              <summary class="text-sm text-red-600 dark:text-red-400 cursor-pointer hover:text-red-800 dark:hover:text-red-200">
                오류 세부사항 보기
              </summary>
              <pre class="mt-2 text-xs text-red-800 dark:text-red-200 bg-red-100 dark:bg-red-900/40 p-3 rounded overflow-auto">{error.message}</pre>
            </details>
          {/if}
          <button 
            onclick={retry}
            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    </div>
  {/if}
{:else}
  {@render children()}
{/if}

<style>
.error-boundary {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>