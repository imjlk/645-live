<script lang="ts">
import type { Snippet } from "svelte";
import type { HTMLAnchorAttributes } from "svelte/elements";

type Props = HTMLAnchorAttributes & {
	href: string;
	leftIcon?: Snippet<[object]>;
	rightIcon?: Snippet<[object]>;
	variant?: "default" | "primary" | "secondary" | "outline" | "ghost";
	size?: "default" | "sm" | "md" | "lg";
	class?: string;
	children?: Snippet<[]>;
};

let {
	href,
	leftIcon,
	rightIcon,
	variant = "default",
	size = "default",
	class: customClass = "",
	children,
	...props
}: Props = $props();

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
	{@render leftIcon?.({ class: "size-[1.2em]" })}
	{@render children?.()}
	{@render rightIcon?.({ class: "size-[1.2em]" })}
</a>