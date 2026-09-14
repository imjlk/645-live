<script lang="ts">
import { onMount, untrack } from "svelte";
import { resolve } from "$app/paths";
import { page } from "$app/state";
import { provideGenerator } from "$lib/generator/model.svelte";

let { data, children } = $props();
const generator = provideGenerator(untrack(() => data.generationPreview));
onMount(generator.start);
const links = [
	{ path: "/generator", text: "번호 만들기" },
	{ path: "/generator/live", text: "실시간" },
	{ path: "/generator/saved", text: "보관함" },
] as const;
</script>
<nav class="generator-nav" aria-label="번호 생성기 메뉴">
	{#each links as link (link.path)}<a href={resolve(link.path)} aria-current={page.url.pathname === link.path ? "page" : undefined}>{link.text}{#if link.path === "/generator/saved" && generator.saved.length}<span>{generator.saved.length.toLocaleString()}</span>{/if}</a>{/each}
</nav>
{@render children()}
<style>
.generator-nav { display:flex; gap:1.5rem; padding: 1rem var(--page-gutter) 0; border-bottom:1px solid var(--color-base-300); }
a { display:flex;align-items:center;gap:.4rem;min-height:3rem;padding:.5rem .15rem;border-bottom:2px solid transparent;color:var(--text-muted);font-size:.9rem;font-weight:650; }
a[aria-current=page] { border-color:var(--color-primary);color:var(--color-primary); }
span { font-size:.75rem;font-variant-numeric:tabular-nums; }
</style>
