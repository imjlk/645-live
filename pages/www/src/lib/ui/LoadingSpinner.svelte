<script lang="ts">
interface Props {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  fullPage?: boolean;
  color?: 'primary' | 'secondary' | 'accent';
}

let { 
  size = 'medium', 
  message, 
  fullPage = false,
  color = 'primary'
}: Props = $props();

const sizeClasses = {
  small: 'w-4 h-4',
  medium: 'w-8 h-8',
  large: 'w-12 h-12'
};

const colorClasses = {
  primary: 'text-blue-500',
  secondary: 'text-gray-500',
  accent: 'text-purple-500'
};
</script>

<div 
  class="loading-container {fullPage ? 'fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50' : ''} flex items-center justify-center"
  class:p-4={!fullPage}
  class:min-h-[100px]={!fullPage}
>
  <div class="flex flex-col items-center gap-3">
    <!-- Loading Spinner -->
    <div class="relative">
      <div class="loading-spinner {sizeClasses[size]} {colorClasses[color]} animate-spin">
        <svg fill="none" viewBox="0 0 24 24">
          <circle 
            class="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            stroke-width="4"
          ></circle>
          <path 
            class="opacity-75" 
            fill="currentColor" 
            d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
      
      <!-- Pulse effect -->
      <div class="absolute inset-0 {sizeClasses[size]} {colorClasses[color]} rounded-full animate-ping opacity-20"></div>
    </div>
    
    <!-- Loading Message -->
    {#if message}
      <p class="text-sm text-gray-600 dark:text-gray-400 font-medium animate-pulse">
        {message}
      </p>
    {/if}
  </div>
</div>

<style>
.loading-container {
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.loading-spinner svg {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>