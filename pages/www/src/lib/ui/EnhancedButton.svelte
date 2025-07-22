<script lang="ts">
/**
 * Enhanced Button component with strict typing and better reusability
 * Follows design system patterns and accessibility best practices
 */

import type { ButtonProps } from '$lib/types/components';
import { createEventDispatcher } from 'svelte';

const dispatch = createEventDispatcher<{
  click: MouseEvent;
  focus: FocusEvent;
  blur: FocusEvent;
}>();

// Props with comprehensive typing
let {
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  children,
  class: customClass = '',
  'data-testid': testId,
  'aria-label': ariaLabel,
  type = 'button',
  ...restProps
}: ButtonProps = $props();

// Component state
let buttonElement: HTMLButtonElement | undefined = $state();
let isPressed = $state(false);

// Computed classes with design system integration
const baseClasses = 'btn transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';

const variantClasses: Record<Required<ButtonProps>['variant'], string> = {
  primary: 'btn-primary focus:ring-primary/50',
  secondary: 'btn-secondary focus:ring-secondary/50',
  accent: 'btn-accent focus:ring-accent/50',
  ghost: 'btn-ghost focus:ring-base-content/20',
  link: 'btn-link focus:ring-primary/50',
  outline: 'btn-outline focus:ring-primary/50',
  error: 'btn-error focus:ring-error/50',
  warning: 'btn-warning focus:ring-warning/50',
  success: 'btn-success focus:ring-success/50',
  info: 'btn-info focus:ring-info/50',
};

const sizeClasses: Record<Required<ButtonProps>['size'], string> = {
  xs: 'btn-xs text-xs',
  sm: 'btn-sm text-sm',
  md: 'btn-md text-base',
  lg: 'btn-lg text-lg',
};

const computedClasses = $derived(
  [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    loading && 'loading',
    disabled && 'btn-disabled',
    isPressed && 'scale-95',
    customClass,
  ]
    .filter(Boolean)
    .join(' ')
);

// Event handlers with proper typing
const handleClick = (event: MouseEvent) => {
  if (disabled || loading) {
    event.preventDefault();
    return;
  }
  dispatch('click', event);
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    isPressed = true;
  }
};

const handleKeyUp = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    isPressed = false;
  }
};

const handleMouseDown = () => {
  isPressed = true;
};

const handleMouseUp = () => {
  isPressed = false;
};

const handleMouseLeave = () => {
  isPressed = false;
};

const handleFocus = (event: FocusEvent) => {
  dispatch('focus', event);
};

const handleBlur = (event: FocusEvent) => {
  isPressed = false;
  dispatch('blur', event);
};

// Public API for parent components
export const focus = () => {
  buttonElement?.focus();
};

export const blur = () => {
  buttonElement?.blur();
};

export const getElement = () => buttonElement;
</script>

<button
  bind:this={buttonElement}
  class={computedClasses}
  {disabled}
  {type}
  data-testid={testId}
  aria-label={ariaLabel}
  aria-busy={loading}
  onclick={handleClick}
  onkeydown={handleKeyDown}
  onkeyup={handleKeyUp}
  onmousedown={handleMouseDown}
  onmouseup={handleMouseUp}
  onmouseleave={handleMouseLeave}
  onfocus={handleFocus}
  onblur={handleBlur}
  {...restProps}
>
  {#if loading}
    <span class="loading loading-spinner loading-sm" aria-hidden="true"></span>
  {/if}
  
  {#if leftIcon && !loading}
    {@render leftIcon({ class: `inline-block ${size === 'xs' ? 'w-3 h-3' : size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'}` })}
  {/if}
  
  {#if children}
    <span class={leftIcon || rightIcon || loading ? (size === 'xs' ? 'mx-1' : 'mx-2') : ''}>
      {@render children()}
    </span>
  {/if}
  
  {#if rightIcon && !loading}
    {@render rightIcon({ class: `inline-block ${size === 'xs' ? 'w-3 h-3' : size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'}` })}
  {/if}
</button>

<style>
  /* Additional custom styles if needed */
  button {
    /* Ensure button maintains aspect ratio during scaling */
    transform-origin: center;
  }
  
  /* Enhanced focus styles for better accessibility */
  button:focus {
    outline: 2px solid transparent;
    outline-offset: 2px;
  }
  
  /* Smooth loading state transition */
  button.loading {
    position: relative;
  }
  
  button.loading .loading {
    margin-right: 0.5rem;
  }
  
  /* High contrast mode support */
  @media (prefers-contrast: high) {
    button {
      border-width: 2px;
    }
    
    button:focus {
      outline: 3px solid currentColor;
    }
  }
  
  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    button {
      transition: none;
    }
  }
  
  /* Print styles */
  @media print {
    button {
      border: 1px solid #000;
      background: none;
      color: #000;
    }
  }
</style>