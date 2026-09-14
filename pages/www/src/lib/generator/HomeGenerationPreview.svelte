<script lang="ts">
import { onMount, untrack } from "svelte";
import type { GenerationPreview } from "$lib/server/generation-preview";
import { getTrailbaseBrowserBaseUrl } from "$lib/trailbase/browser-base";
import LivePanel from "./LivePanel.svelte";
import { createLiveGenerations } from "./live.svelte";

let { initial }: { initial: GenerationPreview } = $props();
const live = createLiveGenerations(
	untrack(() => initial),
	getTrailbaseBrowserBaseUrl,
);
onMount(live.start);
</script>
<LivePanel {live} compact />
