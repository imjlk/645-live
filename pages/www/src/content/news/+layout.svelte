<script lang="ts">
	import { MetaTags } from 'svelte-meta-tags';
	import { page } from '$app/stores';
	import LottoNumbers from '$lib/components/news/LottoNumbers.svelte';
	import Card from '$lib/ui/Card.svelte';
	
	// MDX 컴포넌트들을 전역으로 사용할 수 있도록 export
	export { LottoNumbers, Card };
	
	let { children } = $props();
	
	// Frontmatter에서 메타데이터가 올 예정
	// 실제로는 MDX 파일의 frontmatter에서 이 데이터들이 제공됨
</script>

<!-- MDX 글에서 사용할 수 있는 컴포넌트들 -->
<script context="module">
	// Alert 컴포넌트
	export const Alert = ({ type = 'info', children }) => {
		const alertClasses = {
			info: 'alert-info',
			warning: 'alert-warning',
			success: 'alert-success',
			error: 'alert-error'
		};
		
		return `<div class="alert ${alertClasses[type] || 'alert-info'}">${children}</div>`;
	};
	
	// Table 컴포넌트 (마크다운 테이블을 DaisyUI로 스타일링)
	export const Table = ({ children }) => {
		return `<div class="overflow-x-auto"><table class="table table-zebra w-full">${children}</table></div>`;
	};
	
	// Chart 컴포넌트 플레이스홀더
	export const Chart = ({ type, data }) => {
		return `<div class="bg-base-200 p-4 rounded-lg text-center">차트 컴포넌트 (${type})</div>`;
	};
	
	// RegionalMap 컴포넌트 플레이스홀더
	export const RegionalMap = ({ data }) => {
		return `<div class="bg-base-200 p-4 rounded-lg text-center">지역별 당첨 현황 지도</div>`;
	};
	
	// Tabs 컴포넌트들
	export const Tabs = ({ defaultValue, children }) => {
		return `<div class="tabs-container" data-default="${defaultValue}">${children}</div>`;
	};
	
	export const TabsList = ({ children }) => {
		return `<div class="tabs tabs-lifted">${children}</div>`;
	};
	
	export const TabsTrigger = ({ value, children }) => {
		return `<a class="tab" data-value="${value}">${children}</a>`;
	};
	
	export const TabsContent = ({ value, children }) => {
		return `<div class="tab-content" data-value="${value}">${children}</div>`;
	};
</script>

<!-- 기본 뉴스 기사 레이아웃 -->
<div class="prose prose-lg max-w-none">
	{@render children()}
</div>

<style>
	/* MDX 콘텐츠 스타일링 */
	/* MDX 콘텐츠 스타일링 */
	:global(.prose) {
		max-width: none;
		color: var(--color-base-content, #1f2937);
	}
	
	:global(.prose h1) {
		font-size: 1.875rem; /* text-3xl */
		line-height: 2.25rem;
		font-weight: 700;
		color: var(--color-primary); /* text-primary */
		margin-bottom: 1.5rem;
	}
	
	:global(.prose h2) {
		font-size: 1.5rem; /* text-2xl */
		line-height: 2rem;
		font-weight: 700;
		color: var(--color-primary);
		margin-top: 2rem;
		margin-bottom: 1rem;
	}
	
	:global(.prose h3) {
		font-size: 1.25rem; /* text-xl */
		line-height: 1.75rem;
		font-weight: 600;
		color: var(--color-secondary);
		margin-top: 1.5rem;
		margin-bottom: 0.75rem;
	}
	
	:global(.prose h4) {
		font-size: 1.125rem; /* text-lg */
		line-height: 1.75rem;
		font-weight: 600;
		color: var(--color-base-content);
		margin-top: 1rem;
		margin-bottom: 0.5rem;
	}
	
	:global(.prose p) {
		margin-bottom: 1rem;
		line-height: 1.625;
	}
	
	:global(.prose ul) {
		list-style-type: disc;
		list-style-position: inside;
		margin-bottom: 1rem;
	}
	
	:global(.prose ol) {
		list-style-type: decimal;
		list-style-position: inside;
		margin-bottom: 1rem;
	}
	
	:global(.prose li) {
		margin-bottom: 0.25rem;
	}
	
	:global(.prose blockquote) {
		border-left-width: 4px;
		border-color: var(--color-primary);
		padding-left: 1rem;
		font-style: italic;
		color: var(--color-base-content);
		opacity: 0.8;
		margin-top: 1rem;
		margin-bottom: 1rem;
	}
	
	:global(.prose code) {
		background-color: var(--color-base-200, #e5e7eb);
		padding: 0.125rem 0.25rem;
		border-radius: 0.25rem;
		font-size: 0.875rem;
	}
	
	:global(.prose pre) {
		background-color: var(--color-base-200, #e5e7eb);
		padding: 1rem;
		border-radius: 0.5rem;
		overflow-x: auto;
		margin-top: 1rem;
		margin-bottom: 1rem;
	}
	
	:global(.prose pre code) {
		background-color: transparent;
		padding: 0;
	}
	
	:global(.prose table) {
		width: 100%;
		margin-top: 1.5rem;
		margin-bottom: 1.5rem;
		border-collapse: collapse;
	}
	
	:global(.prose th) {
		background-color: var(--color-base-300, #d1d5db);
		padding: 0.75rem;
		text-align: left;
	}

    :global(.prose td) {
        padding: 0.75rem;
        border-bottom-width: 1px;
        border-color: var(--color-base-200);
    }
	
	:global(.prose img) {
		border-radius: 0.5rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		margin-top: 1rem;
		margin-bottom: 1rem;
	}
	
	/* 커스텀 컴포넌트 스타일링 - @apply가 안되는 관계로 클래스로 처리 권장하거나, 이미 컴포넌트 내부에서 스타일링 됨 */
    /* .card, .alert 등은 DaisyUI 클래스이므로 HTML에서 직접 클래스 사용하면 global CSS에서 적용됨. 
       여기서 강제할 필요 없음 만약 컴포넌트가 DaisyUI 클래스를 쓴다면. */
	
	/* 탭 스타일링 helpers */
	:global(.tabs-container) {
		margin-top: 1.5rem;
		margin-bottom: 1.5rem;
	}
	
	:global(.tab-content) {
		margin-top: 1rem;
		padding: 1rem;
		background-color: var(--color-base-100);
		border-radius: 0.5rem;
	}
	
	:global(.tab-content[data-value]:not(.active)) {
		display: none;
	}
</style>