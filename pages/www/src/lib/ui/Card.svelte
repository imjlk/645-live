<script lang="ts">
/**
 * Reusable Card component with comprehensive styling options
 * Supports various layouts, states, and interaction patterns
 */

import type { CardProps } from "$lib/types/components";

let {
	variant = "default",
	shadow = true,
	hoverable = false,
	title,
	image,
	imageAlt = "",
	actions,
	children,
	class: customClass = "",
	"data-testid": testId,
	...restProps
}: CardProps = $props();

// Computed classes based on variant and options
const baseClasses = "card w-full transition-all duration-200";

const variantClasses: Record<Required<CardProps>["variant"], string> = {
	default: "bg-base-100",
	bordered: "card-bordered bg-base-100",
	compact: "card-compact bg-base-100",
	side: "card-side bg-base-100",
	"image-full": "image-full text-primary-content",
};

const conditionalClasses = [
	shadow && "shadow-lg",
	hoverable && "hover:shadow-xl hover:-translate-y-0.5 cursor-pointer",
].filter(Boolean);

const cardClasses = $derived(
	[
		baseClasses,
		variantClasses[variant],
		...conditionalClasses,
		customClass,
	].join(" "),
);

// Event handlers
const handleCardClick = (event: MouseEvent) => {
	if (hoverable) {
		// Dispatch custom event for card interaction
		const cardClickEvent = new CustomEvent("card-click", {
			detail: { originalEvent: event },
		});
		event.currentTarget?.dispatchEvent(cardClickEvent);
	}
};

const handleKeyDown = (event: KeyboardEvent) => {
	if (hoverable && (event.key === "Enter" || event.key === " ")) {
		event.preventDefault();
		const cardClickEvent = new CustomEvent("card-click", {
			detail: { originalEvent: event },
		});
		event.currentTarget?.dispatchEvent(cardClickEvent);
	}
};
</script>

<div 
  class={cardClasses}
  data-testid={testId}
  onclick={handleCardClick}
  onkeydown={handleKeyDown}
  role={hoverable ? 'button' : undefined}
  tabindex={hoverable ? 0 : undefined}
  {...restProps}
>
  <!-- Image section for image variants -->
  {#if image && (variant === 'side' || variant === 'image-full')}
    <figure class={variant === 'side' ? 'aspect-square w-48' : 'aspect-video'}>
      <img
        src={image}
        alt={imageAlt}
        class="object-cover w-full h-full"
        loading="lazy"
      />
    </figure>
  {/if}

  <!-- Card body -->
  <div class="card-body">
    <!-- Image for default variants -->
    {#if image && variant !== 'side' && variant !== 'image-full'}
      <figure class="aspect-video mb-4 rounded-lg overflow-hidden">
        <img
          src={image}
          alt={imageAlt}
          class="object-cover w-full h-full"
          loading="lazy"
        />
      </figure>
    {/if}

    <!-- Title section -->
    {#if title}
      <h2 class="card-title text-base-content">
        {title}
      </h2>
    {/if}

    <!-- Content section -->
    {#if children}
      <div class="text-base-content/80 leading-relaxed">
        {@render children()}
      </div>
    {/if}

    <!-- Actions section -->
    {#if actions}
      <div class="card-actions justify-end mt-4">
        {@render actions()}
      </div>
    {/if}
  </div>
</div>

<style>
  /* Enhanced hover effects */
  .card:hover {
    transform: translateY(-2px);
  }
  
  /* Focus styles for accessibility */
  .card[role="button"]:focus {
    outline: 2px solid oklch(var(--p));
    outline-offset: 2px;
  }
  
  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .card {
      border: 2px solid currentColor;
    }
  }
  
  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .card {
      transition: none;
    }
  }
  
  /* Print styles */
  @media print {
    .card {
      box-shadow: none;
      border: 1px solid #ccc;
    }
  }
</style>