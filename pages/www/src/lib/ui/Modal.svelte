<script lang="ts">
/**
 * Accessible Modal component with keyboard navigation and focus management
 * Follows WCAG guidelines and supports various sizes and configurations
 */

import type { ModalProps } from "$lib/types/components";
import { onMount } from "svelte";

let {
	open = false,
	onClose,
	size = "md",
	title,
	closable = true,
	backdrop = true,
	header,
	footer,
	children,
	class: customClass = "",
	"data-testid": testId,
	...restProps
}: ModalProps = $props();

// Element references
let modalElement: HTMLDialogElement | undefined = $state();
let previousActiveElement: Element | null = null;

// Size classes
const sizeClasses: Record<Required<ModalProps>["size"], string> = {
	sm: "modal-box max-w-sm",
	md: "modal-box max-w-md",
	lg: "modal-box max-w-lg",
	xl: "modal-box max-w-xl",
	full: "modal-box max-w-full h-full",
};

const modalClasses = $derived(
	["modal", open && "modal-open", customClass].filter(Boolean).join(" "),
);

const boxClasses = $derived([sizeClasses[size], "relative"].join(" "));

// Focus management
const trapFocus = (element: HTMLElement) => {
	const focusableElements = element.querySelectorAll(
		'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])',
	);

	if (focusableElements.length === 0) return;

	const firstFocusable = focusableElements[0] as HTMLElement;
	const lastFocusable = focusableElements[
		focusableElements.length - 1
	] as HTMLElement;

	const handleTabKey = (event: KeyboardEvent) => {
		if (event.key !== "Tab") return;

		if (event.shiftKey) {
			if (document.activeElement === firstFocusable) {
				event.preventDefault();
				lastFocusable.focus();
			}
		} else {
			if (document.activeElement === lastFocusable) {
				event.preventDefault();
				firstFocusable.focus();
			}
		}
	};

	element.addEventListener("keydown", handleTabKey);
	firstFocusable.focus();

	return () => {
		element.removeEventListener("keydown", handleTabKey);
	};
};

// Handle escape key and backdrop clicks
const handleKeydown = (event: KeyboardEvent) => {
	if (event.key === "Escape" && closable) {
		handleClose();
	}
};

const handleBackdropClick = (event: MouseEvent) => {
	if (backdrop && closable && event.target === event.currentTarget) {
		handleClose();
	}
};

const handleClose = () => {
	if (onClose) {
		onClose();
	}

	// Restore focus to previously active element
	if (previousActiveElement instanceof HTMLElement) {
		previousActiveElement.focus();
	}
};

// Lifecycle management
$effect(() => {
	if (!modalElement) return;

	if (open) {
		// Store the currently focused element
		previousActiveElement = document.activeElement;

		// Prevent body scroll
		document.body.style.overflow = "hidden";

		// Setup focus trap
		const cleanupFocusTrap = trapFocus(modalElement);

		return () => {
			document.body.style.overflow = "";
			cleanupFocusTrap?.();
		};
	} else {
		document.body.style.overflow = "";
	}
});

onMount(() => {
	// Cleanup on component unmount
	return () => {
		document.body.style.overflow = "";
		if (previousActiveElement instanceof HTMLElement) {
			previousActiveElement.focus();
		}
	};
});
</script>

<!-- Modal backdrop and container -->
<dialog
  bind:this={modalElement}
  class={modalClasses}
  data-testid={testId}
  aria-labelledby={title ? 'modal-title' : undefined}
  role="dialog"
  aria-modal="true"
  onkeydown={handleKeydown}
  onclick={handleBackdropClick}
  {...restProps}
>
  <div class={boxClasses} onclick={(e) => e.stopPropagation()}>
    <!-- Close button (if closable) -->
    {#if closable}
      <button
        class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 z-10"
        onclick={handleClose}
        aria-label="모달 닫기"
      >
        ✕
      </button>
    {/if}

    <!-- Custom header -->
    {#if header}
      <div class="modal-header mb-4">
        {@render header()}
      </div>
    {:else if title}
      <div class="modal-header mb-4">
        <h3 id="modal-title" class="font-bold text-lg text-base-content">
          {title}
        </h3>
      </div>
    {/if}

    <!-- Modal content -->
    {#if children}
      <div class="modal-content text-base-content">
        {@render children()}
      </div>
    {/if}

    <!-- Custom footer -->
    {#if footer}
      <div class="modal-footer mt-4 flex justify-end gap-2">
        {@render footer()}
      </div>
    {/if}
  </div>
</dialog>

<style>
  /* Smooth animations */
  .modal {
    transition: opacity 0.2s ease-in-out;
  }
  
  .modal.modal-open {
    animation: fadeIn 0.2s ease-in-out;
  }
  
  .modal-box {
    animation: slideUp 0.3s ease-out;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .modal-box {
      border: 2px solid currentColor;
    }
  }
  
  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .modal,
    .modal-box {
      animation: none;
      transition: none;
    }
  }
  
  /* Mobile optimizations */
  @media (max-width: 640px) {
    .modal-box {
      margin: 1rem;
      max-height: calc(100vh - 2rem);
    }
  }
</style>