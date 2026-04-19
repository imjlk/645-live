<script lang="ts">
	import StructuredAgentPage from "$lib/components/agent/StructuredAgentPage.svelte";
	import { absoluteUrl } from "$lib/seo/index.js";
	import { MetaTags } from "svelte-meta-tags";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();
</script>

<MetaTags
	title="Methodology"
	titleTemplate="%s | 645.live"
	description={data.page.description}
	canonical={absoluteUrl("/methodology")}
	robots="index,follow"
/>

<StructuredAgentPage page={data.page} />
