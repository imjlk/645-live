<script lang="ts">
import type { Component } from "svelte";
import type { HTMLAnchorAttributes } from "svelte/elements";

// TODO: Add leftIcon and rightIcon props with Snippet
let {
	href,
	leftIcon = null,
	rightIcon = null,
	variant = "default",
	size = "default",
	class: customClass = "",
	...props
} = $props<
	HTMLAnchorAttributes & {
		href: string;
		leftIcon?: Component | null;
		rightIcon?: Component | null;
		variant?: "default" | "primary" | "secondary" | "outline" | "ghost";
		size?: "default" | "sm" | "md" | "lg";
		class?: string;
	}
>();

const baseClass = "btn";

// Build variant classes
const variantClasses: Record<string, string> = {
	default: "",
	primary: "btn-primary",
	secondary: "btn-secondary",
	outline: "btn-outline",
	ghost: "btn-ghost",
};

// Build size classes
const sizeClasses: Record<string, string> = {
	default: "",
	sm: "btn-sm",
	md: "",
	lg: "btn-lg",
};

const classes = [
	baseClass,
	variantClasses[variant] || "",
	sizeClasses[size] || "",
	customClass,
]
	.filter(Boolean)
	.join(" ");

$effect.pre(() => {
	if (!href) {
		console.warn("LinkButton: href prop is required");
	}
});
</script>

<a class={classes} {...props} href={href}>
	{#if leftIcon}
		{@render leftIcon({ class: "size-[1.2em]" })}
	{/if}
	{@render props.children()}
	{#if rightIcon}
		{@render rightIcon({ class: "size-[1.2em]" })}
	{/if}
</a>