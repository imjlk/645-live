<script lang="ts">
let {
	href,
	title,
	description,
	active = false,
}: {
	href: string;
	icon?: string;
	title: string;
	description: string;
	active?: boolean;
} = $props();
</script>

<a {href} class:active aria-current={active ? "page" : undefined}>
	<div><h3>{title}</h3><p>{description}</p></div>
	<span aria-hidden="true">↗</span>
</a>

<style>
	a { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; min-height: 4rem; padding: 0.8rem 0; border-bottom: 1px solid var(--color-base-300); text-decoration: none; color: var(--color-base-content); transition: color 140ms ease; }
	h3 { font-size: 0.9375rem; font-weight: 650; }
	p { margin-top: 0.25rem; font-size: 0.8125rem; line-height: 1.5; color: color-mix(in oklab, var(--color-base-content) 70%, transparent); }
	a > span { color: color-mix(in oklab, var(--color-base-content) 60%, transparent); transition: transform 140ms ease; }
	a:hover, a.active { color: var(--color-primary); }
	a:hover > span { transform: translate(2px, -2px); color: var(--color-primary); }
	a:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 4px; border-radius: 0.25rem; }
	@media (prefers-reduced-motion: reduce) { a, a > span { transition: none; } }
</style>
