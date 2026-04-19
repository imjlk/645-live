<script lang="ts">
	import StructuredAgentPage from "$lib/components/agent/StructuredAgentPage.svelte";
	import { absoluteUrl } from "$lib/seo/index.js";
	import { MetaTags } from "svelte-meta-tags";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	const issueCount = $derived(data.status.issues.length);
</script>

<MetaTags
	title="Status"
	titleTemplate="%s | 645.live"
	description={data.page.description}
	canonical={absoluteUrl("/status")}
	robots="index,follow"
/>

<div class="space-y-6 p-6">
	<section class="rounded-[2rem] border border-base-300/70 bg-base-100/85 p-6 shadow-sm">
		<p class="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/45">Live Status</p>
		<div class="mt-3 flex flex-wrap items-center gap-3">
			<h1 class="text-3xl font-black tracking-[-0.04em] text-base-content">645.live public surface is {data.status.status}.</h1>
			<span class={`badge badge-lg ${data.status.status === "ok" ? "badge-success" : "badge-warning"}`}>
				{data.status.status}
			</span>
		</div>
		<p class="mt-3 max-w-3xl text-sm leading-7 text-base-content/75">
			Last checked at {new Date(data.status.timestamp).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}. Public read APIs remain anonymous and signed-in member actions continue to use the existing Better Auth session-cookie flow.
		</p>
		<div class="mt-5 grid gap-4 md:grid-cols-3">
			<div class="rounded-3xl border border-base-300/70 bg-base-200/60 p-4">
				<p class="text-xs uppercase tracking-[0.2em] text-base-content/45">Database</p>
				<p class="mt-2 text-xl font-semibold text-base-content">{data.status.dependencies.database}</p>
			</div>
			<div class="rounded-3xl border border-base-300/70 bg-base-200/60 p-4">
				<p class="text-xs uppercase tracking-[0.2em] text-base-content/45">Social Providers</p>
				<p class="mt-2 text-xl font-semibold text-base-content">{data.status.auth.socialProviders.length}</p>
			</div>
			<div class="rounded-3xl border border-base-300/70 bg-base-200/60 p-4">
				<p class="text-xs uppercase tracking-[0.2em] text-base-content/45">Open Issues</p>
				<p class="mt-2 text-xl font-semibold text-base-content">{issueCount}</p>
			</div>
		</div>
		{#if issueCount > 0}
			<div class="mt-5 rounded-3xl border border-warning/40 bg-warning/10 p-4">
				<p class="font-semibold text-warning">Current issue</p>
				{#each data.status.issues as issue (`${issue.code}-${issue.message}`)}
					<p class="mt-2 text-sm leading-6 text-base-content/78">
						<strong>{issue.code}</strong>: {issue.message}
					</p>
				{/each}
			</div>
		{/if}
	</section>

	<StructuredAgentPage page={data.page} />
</div>
