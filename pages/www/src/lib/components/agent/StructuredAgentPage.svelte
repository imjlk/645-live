<script lang="ts">
import { resolve } from "$app/paths";
import type { AgentPage } from "$lib/agent/content";

let { page, headingLevel = 1 }: { page: AgentPage; headingLevel?: 1 | 2 } =
	$props();
const resolveInternalHref = resolve as unknown as (href: string) => string;
const sectionLabel = $derived(page.key === "agent-home" ? "Section" : "섹션");
</script>

<div class="structured-page">
	<header class="structured-heading" class:page-header={headingLevel === 1}>
		<p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">{page.eyebrow}</p>
		<svelte:element this={headingLevel === 1 ? "h1" : "h2"} class:page-title={headingLevel === 1} class="structured-title text-base-content">{page.title}</svelte:element>
		<p class="structured-description text-base-content/78">{page.description}</p>
	</header>

	<section class="grid gap-4 lg:grid-cols-2">
		{#each page.intro as paragraph, index (`${page.key}-intro-${index}`)}
			<p class="structured-copy text-base-content/80">
				{paragraph}
			</p>
		{/each}
	</section>

	{#each page.sections as section (`${page.key}-${section.title}`)}
		<section class="structured-section space-y-4 border-t border-base-300 pt-6">
			<div class="space-y-2">
				<p class="text-xs font-semibold tracking-[0.22em] text-base-content/45">{sectionLabel}</p>
				<h2 class="section-title font-bold text-base-content">{section.title}</h2>
			</div>

			{#if section.paragraphs}
				<div class="space-y-3">
					{#each section.paragraphs as paragraph, index (`${section.title}-paragraph-${index}`)}
						<p class="structured-copy text-base-content/78">{paragraph}</p>
					{/each}
				</div>
			{/if}

			{#if section.bullets}
				<ul class="structured-copy list-disc space-y-2 pl-5 text-base-content/78">
					{#each section.bullets as bullet, index (`${section.title}-bullet-${index}`)}
						<li>{bullet}</li>
					{/each}
				</ul>
			{/if}

			{#if section.table}
				<!-- svelte-ignore a11y_no_noninteractive_tabindex (The region provides keyboard scrolling for wide tables.) -->
				<div class="table-scroll overflow-x-auto rounded-lg border border-base-300/70" role="region" aria-label={`${section.title} 표, 가로 스크롤 가능`} tabindex="0">
					<table class="table table-zebra min-w-[36rem]">
						<thead>
							<tr>
								{#each section.table.headers as header, index (`${section.title}-header-${index}`)}
									<th>{header}</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each section.table.rows as row, rowIndex (`${section.title}-row-${rowIndex}`)}
								<tr>
									{#each row as cell, cellIndex (`${section.title}-cell-${rowIndex}-${cellIndex}`)}
										<td>{cell}</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			{#if section.links}
				<div class="grid gap-3 md:grid-cols-2">
					{#each section.links as link (`${section.title}-${link.label}-${link.href}`)}
						<a
							class="structured-link rounded-lg border border-base-300/70 bg-base-200/60 p-4 transition hover:-translate-y-0.5 hover:bg-base-200"
							href={
								link.href.startsWith("http://") || link.href.startsWith("https://")
									? link.href
									: resolveInternalHref(link.href)
							}
							rel={link.href.startsWith("http") ? "noreferrer" : undefined}
							target={link.href.startsWith("http") ? "_blank" : undefined}
						>
							<p class="font-semibold text-base-content">{link.label}</p>
							{#if link.description}
								<p class="mt-2 text-sm leading-6 text-base-content/70">{link.description}</p>
							{/if}
						</a>
					{/each}
				</div>
			{/if}
		</section>
	{/each}
</div>

<style>
.structured-page { min-width: 0; display: flex; flex-direction: column; gap: var(--section-space); }
.structured-heading { min-width: 0; margin-bottom: 0; }
.structured-heading > p:first-child { margin: 0 0 .75rem; font-size: .75rem; line-height: 1.4; color: var(--color-primary); }
.structured-heading > :global(h2) { font-size: var(--section-title-size); font-weight: 700; line-height: 1.4; letter-spacing: -.03em; }
.structured-description { max-width: var(--reading-width); margin-top: .6rem; font-size: var(--body-copy-size); line-height: var(--body-copy-line-height); }
.structured-copy { max-width: var(--reading-width); font-size: var(--body-copy-size); line-height: var(--body-copy-line-height); overflow-wrap: anywhere; }
.structured-section, .table-scroll { min-width: 0; }
.structured-section { padding-top: var(--page-header-space); }
.section-title { font-size: var(--section-title-size); line-height: 1.5; letter-spacing: -.03em; }
.structured-link { min-width: 0; overflow-wrap: anywhere; }
.table-scroll { max-width: 100%; }
.table-scroll:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 3px; }
</style>
