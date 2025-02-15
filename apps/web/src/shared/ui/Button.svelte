<script lang="ts">
import type { ComponentType } from "svelte";
import type { HTMLButtonAttributes } from "svelte/elements";

export let iconPosition: "left" | "right" = "left";
export let icon: ComponentType | null = null;

interface $$Props extends HTMLButtonAttributes {
	iconPosition?: "left" | "right";
	icon?: ComponentType | null;
	class?: string;
}

const baseClass = "btn";
const { class: customClass = "", ...rest } = $$restProps;
const mergedClass = `${baseClass}${customClass ? ` ${customClass}` : ""}`;
</script>

<button class={mergedClass} {...rest}>
    {#if iconPosition === 'left' && icon}
        <svelte:component this={icon} class="size-[1.2em]" />
    {/if}
    <slot/>
    {#if iconPosition === 'right' && icon}
        <svelte:component this={icon} class="size-[1.2em]" />
    {/if}
</button>