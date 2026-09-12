<script lang="ts">
import { resolve } from "$app/paths";
import { page } from "$app/state";

let { compact = false }: { compact?: boolean } = $props();
const items = [
	{ href: "/history", label: "당첨 결과" },
	{ href: "/qr-scan", label: "QR 확인" },
	{ href: "/generator", label: "번호 만들기" },
	{ href: "/stats", label: "통계" },
	{ href: "/winning-stores", label: "당첨점" },
	{ href: "/news", label: "소식" },
	{ href: "/guide", label: "이용 가이드" },
] as const;
</script>
<nav class:compact aria-label="주요 페이지">
 {#each items as item (item.href)}
  <a href={resolve(item.href)} aria-current={page.url.pathname.startsWith(item.href) ? "page" : undefined}>{item.label}</a>
 {/each}
</nav>
<style>
 nav { display: flex; flex-wrap: wrap; align-items: center; gap: 0.125rem; }
 a { color: var(--text-muted); padding: 0.75rem 0.6rem; font-size: 0.875rem; font-weight: 500; border-radius: 0.5rem; white-space: nowrap; transition: background 150ms; }
 a:hover { background: var(--color-base-200); color: var(--color-base-content); }
 a[aria-current="page"] { color: var(--color-primary); font-weight: 700; }
 .compact { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem; }
 .compact a { padding: 0.75rem 1rem; }
</style>
