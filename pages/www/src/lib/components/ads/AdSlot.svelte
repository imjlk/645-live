<script lang="ts">
import { dev } from "$app/environment";
import { page } from "$app/state";
import * as publicEnv from "$env/static/public";
import AdUnit from "./AdUnit.svelte";

let {
	placement,
	format = "horizontal",
	class: className = "",
}: {
	placement: string;
	format?: "horizontal" | "rectangle";
	class?: string;
} = $props();
const slot = $derived.by(() => {
	try {
		const configuration = JSON.parse(
			Object.entries(publicEnv).find(
				([key]) => key === "PUBLIC_ADSENSE_SLOTS",
			)?.[1] || "{}",
		);
		const id = configuration?.[placement];
		return typeof id === "string" && /^\d+$/.test(id) ? id : null;
	} catch {
		return null;
	}
});
</script>

{#if !dev && slot}
	{#key `${page.url.pathname}:${placement}:${slot}`}
		<AdUnit {slot} {placement} {format} class={className} />
	{/key}
{/if}
