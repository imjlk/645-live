<script lang="ts">
	import { resolve } from "$app/paths";
	import type { AgentPage } from "$lib/agent/content";

	let { page }: { page: AgentPage } = $props();
	const resolveInternalHref = resolve as unknown as (href: string) => string;
</script>

<div class="space-y-8 p-6">
	<header class="space-y-3">
		<p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">{page.eyebrow}</p>
		<h1 class="text-3xl font-black tracking-[-0.04em] text-base-content sm:text-4xl">{page.title}</h1>
		<p class="max-w-3xl text-base leading-7 text-base-content/78">{page.description}</p>
	</header>

	<section class="grid gap-4 lg:grid-cols-2">
		{#each page.intro as paragraph, index (`${page.key}-intro-${index}`)}
			<p class="rounded-3xl border border-base-300/70 bg-base-100/80 p-5 text-sm leading-7 text-base-content/78 shadow-sm">
				{paragraph}
			</p>
		{/each}
	</section>

	{#each page.sections as section (`${page.key}-${section.title}`)}
		<section class="space-y-4 rounded-[2rem] border border-base-300/70 bg-base-100/85 p-6 shadow-sm">
			<div class="space-y-2">
				<p class="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/45">Section</p>
				<h2 class="text-2xl font-bold text-base-content">{section.title}</h2>
			</div>

			{#if section.paragraphs}
				<div class="space-y-3">
					{#each section.paragraphs as paragraph, index (`${section.title}-paragraph-${index}`)}
						<p class="text-sm leading-7 text-base-content/78">{paragraph}</p>
					{/each}
				</div>
			{/if}

			{#if section.bullets}
				<ul class="list-disc space-y-2 pl-5 text-sm leading-7 text-base-content/78">
					{#each section.bullets as bullet, index (`${section.title}-bullet-${index}`)}
						<li>{bullet}</li>
					{/each}
				</ul>
			{/if}

			{#if section.table}
				<div class="overflow-x-auto rounded-2xl border border-base-300/70">
						<table class="table table-zebra">
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
							class="rounded-3xl border border-base-300/70 bg-base-200/60 p-4 transition hover:-translate-y-0.5 hover:bg-base-200"
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
