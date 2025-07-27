<script lang="ts">
import { page } from "$app/state";
import Header from "$lib/layout/Header.svelte";
import MobileNavigation from "$lib/layout/MobileNavigation.svelte";
import NavigationMenu from "$lib/layout/NavigationMenu.svelte";
import "../app.css";
import InstallPrompt from "$lib/components/ui/InstallPrompt.svelte";
import UpdatePrompt from "$lib/components/ui/UpdatePrompt.svelte";
import Footer from "$lib/layout/Footer.svelte";
import Clarity from "@microsoft/clarity";
import { NuqsAdapter } from "nuqs-svelte/adapters/svelte-kit";
import { onMount } from "svelte";

let { children } = $props();
import { PUBLIC_TRAILBASE_URL } from "$env/static/public";
import { preparePageTransition } from "$lib/layout/page-transition";
import { initPWAPerformanceMonitor } from "$lib/utils/pwa-performance";

preparePageTransition();

// 실제 데이터가 있는 회차들
let availableRounds = $state<number[]>([]);

let currentPath = $derived(page.url.pathname);

onMount(async () => {
	// Microsoft Clarity 초기화 (프로덕션에서만)
	if (import.meta.env.PROD) {
		Clarity.init("qeumg5ffol");
	}

	// PWA 성능 모니터링 초기화
	try {
		initPWAPerformanceMonitor();
	} catch (error) {
		console.warn("PWA 성능 모니터링 초기화 실패:", error);
	}

	// 실제 데이터가 있는 회차들을 가져오기
	try {
		const { initClient } = await import("trailbase");
		const client = initClient(PUBLIC_TRAILBASE_URL || "http://localhost:4000");
		const api = client.records("lotto_draw_scan_counts");

		const response = await api.list({
			order: ["-round"], // 최신 회차부터
			pagination: { limit: 10 }, // 최근 10개 회차
		});

		availableRounds = response.records
			.map((record) => Number((record as { round: number }).round))
			.filter(Boolean);
	} catch (err) {
		console.error("Error fetching available rounds:", err);
	}
});
</script>

<svelte:head>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta name="theme-color" content="#3b82f6" />
	<meta name="google-adsense-account" content="ca-pub-4441205887996163">
	<!-- Google tag (gtag.js) -->
	<script async src="https://www.googletagmanager.com/gtag/js?id=G-KEBJGHESGM"></script>
	<script>
		window.dataLayer = window.dataLayer || [];
		function gtag(){dataLayer.push(arguments);}
		gtag('js', new Date());

		gtag('config', 'G-KEBJGHESGM');
	</script>
</svelte:head>

<NuqsAdapter>
	<div class="min-h-dvh flex flex-col max-w-7xl mx-auto pb-20 sm:pb-0">
		<Header />

		<div class="flex flex-1 items-center gap-4 px-0 flex-col sm:flex-row sm:items-stretch my-4 mx-3 xl:mx-0">
			<NavigationMenu />
			<main class="container mx-auto px-3 sm:px-0 flex-1 items-center sm:flex-4 rounded-2xl bg-base-200" aria-label="메인 콘텐츠">
				{@render children?.()}
			</main>
		</div>

		<Footer />
		
		<!-- 모바일 전용 하단 네비게이션 -->
		<MobileNavigation />
		
		<!-- PWA 설치 프롬프트 -->
		<InstallPrompt />
		
		<!-- PWA 업데이트 프롬프트 -->
		<UpdatePrompt />
	</div>
</NuqsAdapter>