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
		activePattern: (pathname) => pathname === '/'
	},
	{
		href: "/qr-scan",
		label: "QR스캔",
		icon: "📱",
		ariaLabel: "QR 스캔 페이지로 이동",
		activePattern: (pathname) => pathname === '/qr-scan'
	},
	{
		href: "/generator",
		label: "생성기",
		icon: "🎲",
		ariaLabel: "로또 번호 생성기 페이지로 이동",
		activePattern: (pathname) => pathname.startsWith('/generator')
	},
	{
		href: "/stats",
		label: "통계",
		icon: "📊",
		ariaLabel: "통계 분석 페이지로 이동",
		activePattern: (pathname) => pathname.startsWith('/stats')
	},
	{
		href: "/history",
		label: "히스토리",
		icon: "📚",
		ariaLabel: "지난 회차 히스토리 페이지로 이동",
		activePattern: (pathname) => pathname === '/history'
	}
];

function isActive(item: NavigationItem, pathname: string): boolean {
	return item.activePattern ? item.activePattern(pathname) : pathname === item.href;
}

// 현재 활성화된 탭의 인덱스
$: activeIndex = navigationItems.findIndex(item => isActive(item, page.url.pathname));

function handleKeydown(event: KeyboardEvent, href: string) {
	if (event.key === 'Enter' || event.key === ' ') {
		event.preventDefault();
		window.location.href = href;
	}
}
</script>

<!-- 모바일 전용 하단 네비게이션 (sm 이하에서만 표시) -->
<nav 
	class="btm-nav sm:hidden border-t border-base-300 bg-base-100/80 backdrop-blur supports-[backdrop-filter]:bg-base-100/60"
	role="navigation" 
	aria-label="모바일 주요 페이지 네비게이션"
>
	{#each navigationItems as item, index (item.href)}
		<a 
			href={item.href}
			class="relative {isActive(item, page.url.pathname) ? 'active text-primary' : 'text-base-content/70'}"
			aria-label={item.ariaLabel}
			role="tab"
			aria-selected={isActive(item, page.url.pathname)}
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
				class="btm-nav-icon text-xl"
				aria-hidden="true"
				role="presentation"
			>
				{item.icon}
			</span>
			
			<!-- 레이블 -->
			<span class="btm-nav-label text-xs font-medium">
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

	/* 탭 전환 애니메이션 */
	.btm-nav a {
		transition: all 0.2s ease-in-out;
	}

	/* 호버 효과 */
	.btm-nav a:hover {
		background-color: oklch(var(--b2) / 0.5);
		transform: translateY(-1px);
	}

	/* 포커스 효과 */
	.btm-nav a:focus {
		outline: 2px solid oklch(var(--p));
		outline-offset: 2px;
		background-color: oklch(var(--b2) / 0.8);
	}

	/* 활성 탭 스타일 */
	.btm-nav a.active {
		background-color: oklch(var(--p) / 0.1);
		font-weight: 600;
	}

	/* 아이콘과 레이블 간격 조정 */
	.btm-nav-icon {
		margin-bottom: 2px;
	}

	/* 레이블 텍스트 크기 반응형 조정 */
	@media (max-width: 375px) {
		.btm-nav-label {
			font-size: 10px;
		}
	}
</style>