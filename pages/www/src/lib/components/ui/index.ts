// @ts-nocheck
/**
 * Centralized UI component exports
 * Provides a consistent interface for importing all UI components
 */

// Enhanced components with strict typing
export { default as EnhancedButton } from "../ui/EnhancedButton.svelte";

// Existing components (to be enhanced)
export { default as Button } from "../ui/Button.svelte";
export { default as LinkButton } from "../ui/LinkButton.svelte";
export { default as LoadingSpinner } from "../ui/LoadingSpinner.svelte";
export { default as ErrorBoundary } from "../ui/ErrorBoundary.svelte";
export { default as ConnectionStatus } from "../ui/ConnectionStatus.svelte";
export { default as Breadcrumbs } from "../ui/Breadcrumbs.svelte";

// Type exports for consumers
export type {
	ButtonProps,
	InputProps,
	ModalProps,
	CardProps,
	TableProps,
	FormProps,
	NavigationMenuProps,
	BreadcrumbProps,
	TooltipProps,
	BadgeProps,
	ProgressProps,
} from "$lib/types/components";

// Utility functions for component factories
export { createComponentFactory } from "$lib/types/components";
