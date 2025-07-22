<script lang="ts">
/**
 * 모바일 전용 하단 탭 네비게이션
 * 접근성과 사용성을 고려한 모바일 네비게이션
 */

import { page } from "$app/state";

interface NavigationItem {
	href: string;
	label: string;
	icon: string;
	ariaLabel: string;
	activePattern?: (pathname: string) => boolean;
}

const navigationItems: NavigationItem[] = [
	{
		href: "/",
		label: "홈",
		icon: "🏠",
		ariaLabel: "홈 페이지로 이동",
		activePattern: (pathname) => pathname === "/",
	},
	{
		href: "/guide",
		label: "가이드",
		icon: "📚",
		ariaLabel: "로또 가이드 페이지로 이동",
		activePattern: (pathname) => pathname === "/guide",
	},
	{
		href: "/qr-scan",
		label: "QR스캔",
		icon: "📱",
		ariaLabel: "QR 스캔 페이지로 이동",
		activePattern: (pathname) => pathname === "/qr-scan",
	},
	{
		href: "/generator",
		label: "생성기",
		icon: "🎲",
		ariaLabel: "로또 번호 생성기 페이지로 이동",
		activePattern: (pathname) => pathname.startsWith("/generator"),
	},
	{
		href: "/stats",
		label: "통계",
		icon: "📊",
		ariaLabel: "통계 분석 페이지로 이동",
		activePattern: (pathname) => pathname.startsWith("/stats"),
	},
];

function isActive(item: NavigationItem, pathname: string): boolean {
	return item.activePattern
		? item.activePattern(pathname)
		: pathname === item.href;
}

// activeIndex는 현재 사용되지 않으므로 제거
// let activeIndex = $derived(
// 	navigationItems.findIndex((item) => isActive(item, page.url.pathname))
// );

function handleKeydown(event: KeyboardEvent, href: string) {
	if (event.key === "Enter" || event.key === " ") {
		event.preventDefault();
		window.location.href = href;
	}
}
</script>

<!-- 모바일 전용 하단 네비게이션 (sm 이하에서만 표시) -->
<nav 
	class="fixed bottom-0 left-0 right-0 z-[99999] sm:hidden border-t border-base-300 bg-base-100/90 backdrop-blur supports-[backdrop-filter]:bg-base-100/80 grid grid-cols-5"
	aria-label="모바일 주요 페이지 네비게이션"
>
	{#each navigationItems as item (item.href)}
		<a 
			href={item.href}
			class="relative flex flex-col items-center justify-center py-2 px-1 min-h-[60px] transition-all duration-200 {isActive(item, page.url.pathname) ? 'active text-primary' : 'text-base-content/70'}"
			aria-label={item.ariaLabel}
			aria-current={isActive(item, page.url.pathname) ? 'page' : undefined}
			tabindex="0"
			onkeydown={(e) => handleKeydown(e, item.href)}
		>
			<!-- 활성 표시 인디케이터 -->
			{#if isActive(item, page.url.pathname)}
				<div 
					class="absolute -top-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-primary rounded-full"
					aria-hidden="true"
				></div>
			{/if}
			
			<!-- 아이콘 -->
			<span 
				class="text-lg mb-1"
				aria-hidden="true"
				role="presentation"
			>
				{item.icon}
			</span>
			
			<!-- 레이블 -->
			<span class="text-[10px] sm:text-xs font-medium leading-tight">
				{item.label}
			</span>
			
			<!-- 접근성을 위한 활성 상태 텍스트 -->
			{#if isActive(item, page.url.pathname)}
				<span class="sr-only">현재 페이지</span>
			{/if}
		</a>
	{/each}
</nav>

<style>
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	/* 호버 효과 */
	nav a:hover {
		background-color: oklch(var(--b2) / 0.5);
		transform: translateY(-1px);
	}

	/* 포커스 효과 */
	nav a:focus {
		outline: 2px solid oklch(var(--p));
		outline-offset: 2px;
		background-color: oklch(var(--b2) / 0.8);
	}

	/* 활성 탭 스타일 */
	nav a.active {
		background-color: oklch(var(--p) / 0.1);
		font-weight: 600;
	}

	/* 매우 작은 화면에서 텍스트 크기 조정 */
	@media (max-width: 375px) {
		nav a {
			min-height: 56px;
			padding: 0.25rem 0.125rem;
		}
		
		nav span:last-child {
			font-size: 9px;
		}
	}

	/* 페이지 전환 시 네비게이션 숨김/표시 애니메이션 */
	nav {
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	:global(nav.nav-hide) {
		transform: translateY(100%);
	}

	:global(nav.nav-show) {
		transform: translateY(0);
		animation: slideUpBounce 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes slideUpBounce {
		0% {
			transform: translateY(100%);
		}
		70% {
			transform: translateY(-5%);
		}
		100% {
			transform: translateY(0);
		}
	}
</style>