<script lang="ts">
import { resolve } from "$app/paths";
import { page } from "$app/state";

const items = [
	{ href: "/", label: "홈", path: "M3 10l9-7 9 7M5 9v11h5v-6h4v6h5V9" },
	{
		href: "/qr-scan",
		label: "QR 확인",
		path: "M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5M7 7h3v3H7zM14 7h3v3h-3zM7 14h3v3H7zM14 14h3v3h-3z",
	},
	{
		href: "/generator",
		label: "번호 만들기",
		path: "M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zM8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01",
	},
	{ href: "/stats", label: "통계", path: "M5 20V10M12 20V4M19 20v-7" },
	{ href: "/my", label: "내 기록", path: "M6 3h12v18l-6-4-6 4zM9 7h6M9 11h6" },
] as const;
</script>
<nav class="mobile-navigation" aria-label="모바일 주요 페이지">
 {#each items as item (item.href)}
  <a href={resolve(item.href)} aria-current={(item.href === "/" ? page.url.pathname === "/" : page.url.pathname.startsWith(item.href)) ? "page" : undefined}>
   <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={item.path} /></svg>
   <span>{item.label}</span>
  </a>
 {/each}
</nav>
<style>
 .mobile-navigation { display: none; }
 @media (max-width: 767px) {
  .mobile-navigation { position: fixed; inset: auto 0 0; display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); min-height: var(--mobile-nav-height); padding-bottom: env(safe-area-inset-bottom, 0px); z-index: 40; border-top: 1px solid var(--color-base-300); background: var(--color-base-100); }
  a { min-height: 64px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; color: var(--text-muted); font-size: 0.6875rem; font-weight: 500; }
  a[aria-current="page"] { color: var(--color-primary); background: color-mix(in oklab, var(--color-primary) 7%, var(--color-base-100)); font-weight: 700; }
  a:hover { background: var(--color-base-200); }
 }
</style>
