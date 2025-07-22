<script lang="ts">
import { page } from "$app/state";
import LinkButton from "$lib/ui/LinkButton.svelte";

interface NavigationItem {
	href: string;
	label: string;
	ariaLabel: string;
	activePattern?: (pathname: string) => boolean;
}

const navigationItems: NavigationItem[] = [
	{
		href: "/guide",
		label: "가이드",
		ariaLabel: "로또 가이드 페이지로 이동",
		activePattern: (pathname) => pathname === "/guide",
	},
	{
		href: "/qr-scan",
		label: "QR 스캔",
		ariaLabel: "QR 스캔 페이지로 이동",
		activePattern: (pathname) => pathname === "/qr-scan",
	},
	{
		href: "/history",
		label: "지난 회차",
		ariaLabel: "지난 회차 히스토리 페이지로 이동",
		activePattern: (pathname) => pathname === "/history",
	},
	{
		href: "/generator",
		label: "번호 생성기",
		ariaLabel: "로또 번호 생성기 페이지로 이동",
		activePattern: (pathname) => pathname.startsWith("/generator"),
	},
	{
		href: "/stats",
		label: "통계",
		ariaLabel: "통계 분석 페이지로 이동",
		activePattern: (pathname) => pathname.startsWith("/stats"),
	},
	{
		href: "/winning-stores",
		label: "당첨점",
		ariaLabel: "당첨점 정보 페이지로 이동",
		activePattern: (pathname) => pathname.startsWith("/winning-stores"),
	},
];

function isActive(item: NavigationItem, pathname: string): boolean {
	return item.activePattern
		? item.activePattern(pathname)
		: pathname === item.href;
}

function handleKeydown(event: KeyboardEvent, href: string) {
	if (event.key === "Enter" || event.key === " ") {
		event.preventDefault();
		window.location.href = href;
	}
}
</script>

<aside class="w-full sm:w-32 min-w-48 sm:flex-1 rounded-2xl bg-base-200" aria-label="주요 메뉴">
	{#key page.url.pathname}
	<nav aria-label="주요 페이지 네비게이션">
		<ul class="flex flex-row sm:flex-col gap-4 overflow-scroll py-2 sm:py-4 px-3">
			{#each navigationItems as item (item.href)}
				<li class="flex-shrink-0">
					<LinkButton 
						class="btn-secondary btn-ghost rounded-full w-full whitespace-nowrap {isActive(item, page.url.pathname) ? 'btn-active' : ''}" 
						href={item.href}
						aria-label={item.ariaLabel}
						tabindex={0}
						onkeydown={(e) => handleKeydown(e, item.href)}
					>
						{item.label}
					</LinkButton>
				</li>
			{/each}
		</ul>
	</nav>
	{/key}
</aside>