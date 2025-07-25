<script lang="ts">
/**
 * Enhanced Input component with validation, accessibility, and consistent styling
 * Supports various input types, validation states, and helper text
 */

import type { InputProps } from "$lib/types/components";
import { createEventDispatcher } from "svelte";

// Event dispatcher for input events
const dispatch = createEventDispatcher<{
	input: Event;
	change: Event;
	focus: FocusEvent;
	blur: FocusEvent;
	"validation-change": { isValid: boolean; errors: string[] };
}>();

let {
	variant = "default",
	size = "md",
	label,
	placeholder,
	helperText,
	errorText,
	validation,
	leftIcon,
	rightIcon,
	class: customClass = "",
	"data-testid": testId,
	value = "",
	disabled = false,
	required = false,
	type = "text",
	...restProps
}: InputProps = $props();

// Component state
let inputElement: HTMLInputElement | undefined = $state();
let isFocused = $state(false);
let hasError = $derived(!!errorText || (validation && !validation.isValid));

// Generate unique ID for accessibility
const inputId = `input-${Math.random().toString(36).substr(2, 9)}`;

// Base classes
const baseClasses = "input w-full transition-all duration-200";

const variantClasses: Record<Required<InputProps>["variant"], string> = {
	default: "input-bordered",
	bordered: "input-bordered border-2",
	ghost: "input-ghost",
	primary: "input-primary input-bordered",
	secondary: "input-secondary input-bordered",
	accent: "input-accent input-bordered",
	error: "input-error input-bordered",
	warning: "input-warning input-bordered",
	success: "input-success input-bordered",
};

const sizeClasses: Record<Required<InputProps>["size"], string> = {
	xs: "input-xs text-xs",
	sm: "input-sm text-sm",
	md: "input-md text-base",
	lg: "input-lg text-lg",
};

const inputClasses = $derived(
	[
		baseClasses,
		hasError ? variantClasses.error : variantClasses[variant],
		sizeClasses[size],
		disabled && "input-disabled opacity-60 cursor-not-allowed",
		isFocused && "ring-2 ring-primary ring-opacity-50",
		(leftIcon || rightIcon) && "pl-10",
		rightIcon && "pr-10",
		customClass,
	]
		.filter(Boolean)
		.join(" "),
);

// Event handlers
const handleInput = (event: Event) => {
	const target = event.target as HTMLInputElement;
	value = target.value;
	dispatch("input", event);

	// Trigger validation if available
	if (validation) {
		dispatch("validation-change", validation);
	}
};

const handleChange = (event: Event) => {
	dispatch("change", event);
};

const handleFocus = (event: FocusEvent) => {
	isFocused = true;
	dispatch("focus", event);
};

const handleBlur = (event: FocusEvent) => {
	isFocused = false;
	dispatch("blur", event);
};

// Public API
export const focus = () => {
	inputElement?.focus();
};

export const blur = () => {
	inputElement?.blur();
};

export const select = () => {
	inputElement?.select();
};

export const getElement = () => inputElement;
</script>

<div class="form-control w-full">
  <!-- Label -->
  {#if label}
    <label for={inputId} class="label">
      <span class="label-text font-medium text-base-content">
        {label}
        {#if required}
          <span class="text-error ml-1" aria-label="필수">*</span>
        {/if}
      </span>
    </label>
  {/if}

  <!-- Input container with icons -->
  <div class="relative">
    <!-- Left icon -->
    {#if leftIcon}
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        {@render leftIcon({ class: `w-4 h-4 text-base-content/50 ${isFocused ? 'text-primary' : ''}` })}
      </div>
    {/if}

    <!-- Input element -->
    <input
      bind:this={inputElement}
      bind:value
      {type}
      {disabled}
      {required}
      {placeholder}
      id={inputId}
      class={inputClasses}
      data-testid={testId}
      aria-invalid={hasError}
      aria-describedby={helperText || errorText ? `${inputId}-helper` : undefined}
      oninput={handleInput}
      onchange={handleChange}
      onfocus={handleFocus}
      onblur={handleBlur}
      {...restProps}
    />

    <!-- Right icon -->
    {#if rightIcon}
      <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
        {@render rightIcon({ class: `w-4 h-4 text-base-content/50 ${isFocused ? 'text-primary' : ''}` })}
      </div>
    {/if}
  </div>

  <!-- Helper text / Error text -->
  {#if helperText || errorText || (validation && !validation.isValid)}
    <div id="{inputId}-helper" class="label">
      <span class={`label-text-alt ${hasError ? 'text-error' : 'text-base-content/70'}`}>
        {#if errorText}
          {errorText}
        {:else if validation && !validation.isValid && validation.errors.length > 0}
          {validation.errors[0]}
        {:else if helperText}
          {helperText}
        {/if}
      </span>
    </div>
  {/if}
</div>

<style>
  /* Enhanced focus styles */
  .input:focus {
    outline: none;
    box-shadow: 0 0 0 2px oklch(var(--p) / 0.2);
  }
  
  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .input {
      border-width: 2px;
    }
    
    .input:focus {
      outline: 3px solid currentColor;
      outline-offset: 1px;
    }
  }
  
  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .input {
      transition: none;
    }
  }
  
  /* Error state styling */
  .input[aria-invalid="true"] {
    border-color: oklch(var(--er));
    background-color: oklch(var(--er) / 0.05);
  }
  
  /* Disabled state */
  .input:disabled {
    background-color: oklch(var(--b2));
    color: oklch(var(--bc) / 0.6);
    cursor: not-allowed;
  }
  
  /* Icon positioning adjustments */
  .input.pl-10 {
    padding-left: 2.5rem;
  }
  
  .input.pr-10 {
    padding-right: 2.5rem;
  }
</style>