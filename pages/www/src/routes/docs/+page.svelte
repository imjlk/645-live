<script lang="ts">
	import StructuredAgentPage from "$lib/components/agent/StructuredAgentPage.svelte";
	import { absoluteUrl } from "$lib/seo/index.js";
	import { MetaTags } from "svelte-meta-tags";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();
</script>

<MetaTags
	title="Developer Docs"
	titleTemplate="%s | 645.live"
	description={data.page.description}
	canonical={absoluteUrl("/docs")}
	robots="index,follow"
/>

<StructuredAgentPage page={data.page} />
