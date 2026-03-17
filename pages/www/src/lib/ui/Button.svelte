<script lang="ts">
import type { Component, Snippet } from "svelte";
import type { HTMLButtonAttributes } from "svelte/elements";

let button: HTMLButtonElement;
type Props = HTMLButtonAttributes & {
	leftIcon?: Snippet<[object]>;
	rightIcon?: Snippet<[object]>;
	children?: Snippet<[]>;
	class?: string;
};

let {
	leftIcon,
	rightIcon,
	class: customClass = "",
	children,
	...props
}: Props = $props();

const baseClass = "btn";
const classes = $derived(
	`${baseClass}${customClass ? ` ${customClass}` : ""}`,
);

export function getButton() {
	return button;
}
</script>
	
<button bind:this={button} class={classes} {...props}>
	{@render leftIcon?.({ class: "size-[1.2em]" })}
	{@render children?.()}
	{@render rightIcon?.({ class: "size-[1.2em]" })}
</button>
