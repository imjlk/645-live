<script lang="ts">
import type { Component } from "svelte";
import type { HTMLAnchorAttributes } from "svelte/elements";

// TODO: Add leftIcon and rightIcon props with Snippet
let {
	href,
	leftIcon = null,
	rightIcon = null,
	class: customClass = "",
	...props
} = $props<
	HTMLAnchorAttributes & {
		href: string;
		leftIcon?: Component | null;
		rightIcon?: Component | null;
		class?: string;
	}
>();

const baseClass = "btn";
const classes = `${baseClass}${customClass ? ` ${customClass}` : ""}`;

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