<script lang="ts">
import { page } from "$app/state";
import Header from "$lib/layout/Header.svelte";
import MobileNavigation from "$lib/layout/MobileNavigation.svelte";
import NavigationMenu from "$lib/layout/NavigationMenu.svelte";
import "../app.css";
import { browser } from "$app/environment";
/* PWA 프롬프트 임시 비활성화
import InstallPrompt from "$lib/components/ui/InstallPrompt.svelte";
import UpdatePrompt from "$lib/components/ui/UpdatePrompt.svelte";
*/
import Footer from "$lib/layout/Footer.svelte";
import { getTrailbaseBrowserBaseUrl } from "$lib/trailbase/browser-base";
import { initializeGlobalConnection } from "$lib/trailbase/global-connection.svelte";
import { NuqsAdapter } from "nuqs-svelte/adapters/svelte-kit";
import { onMount } from "svelte";

let { data, children } = $props();
import { preparePageTransition } from "$lib/layout/page-transition";
import { initPWAPerformanceMonitor } from "$lib/utils/pwa-performance";
import {
	configureMemberScanSync,
	registerMemberScanSyncLifecycle,
} from "$lib/utils/member-scan-sync";

preparePageTransition();

// 실제 데이터가 있는 회차들
let availableRounds = $state<number[]>([]);

let currentPath = $derived(page.url.pathname);
const FORCE_SW_RESET_PARAM = "sw-reset";

async function resetServiceWorkersIfNeeded(): Promise<boolean> {
	if (!browser || !("serviceWorker" in navigator)) {
		return false;
	}

	const forceReset = page.url.searchParams.has(FORCE_SW_RESET_PARAM);
	const shouldReset = import.meta.env.DEV || forceReset;

	if (!shouldReset) {
		return false;
	}

	const resetKey = forceReset ? "prod-sw-reset" : "dev-sw-reset";
	const registrations = await navigator.serviceWorker.getRegistrations();
	const cacheNames = "caches" in window ? await caches.keys() : [];
	const hasResetTargets = registrations.length > 0 || cacheNames.length > 0;

	if (!hasResetTargets) {
		sessionStorage.removeItem(resetKey);
		if (forceReset) {
			const nextUrl = new URL(window.location.href);
			nextUrl.searchParams.delete(FORCE_SW_RESET_PARAM);
			window.history.replaceState({}, "", nextUrl);
		}
		return false;
	}

	await Promise.all(
		registrations.map((registration) => registration.unregister()),
	);

	await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));

	if (forceReset) {
		const nextUrl = new URL(window.location.href);
		nextUrl.searchParams.delete(FORCE_SW_RESET_PARAM);
		window.history.replaceState({}, "", nextUrl);
	}

	if (sessionStorage.getItem(resetKey) !== "done") {
		sessionStorage.setItem(resetKey, "done");
		window.location.reload();
		return true;
	}

	sessionStorage.removeItem(resetKey);
	return false;
}

onMount(() => {
	const unregisterMemberScanSync = registerMemberScanSyncLifecycle();

	void (async () => {
		if (await resetServiceWorkersIfNeeded()) {
			return;
		}

		// TrailBase 전역 연결 초기화 (단순화된 버전)
		await initializeGlobalConnection();

		// Microsoft Clarity 초기화 (브라우저 환경 & 프로덕션에서만)
		if (browser && import.meta.env.PROD) {
			try {
				const { default: Clarity } = await import("@microsoft/clarity");
				Clarity.init("qeumg5ffol");
			} catch (error) {
				console.warn("Failed to initialize Microsoft Clarity:", error);
			}
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
			const client = initClient(getTrailbaseBrowserBaseUrl());
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
	})();

	return () => {
		unregisterMemberScanSync();
	};
});

$effect(() => {
	if (!browser) {
		return;
	}

	configureMemberScanSync(data.session?.user?.id ?? null);
});
</script>

<svelte:head>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta name="theme-color" content="#3b82f6" />
	<meta name="google-adsense-account" content="ca-pub-4441205887996163">
	<meta name="naver-site-verification" content="61430164e06bd982855b384e778a1c565ee14065" />
	<!-- Google tag (gtag.js) -->
	<script async src="https://www.googletagmanager.com/gtag/js?id=G-KEBJGHESGM"></script>
	<script>
		window.dataLayer = window.dataLayer || [];
		function gtag(){dataLayer.push(arguments);}
		gtag('js', new Date());

		gtag('config', 'G-KEBJGHESGM');
	</script>
	<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4441205887996163"
     crossorigin="anonymous"></script>
</svelte:head>

<NuqsAdapter>
	<div class="min-h-dvh flex flex-col max-w-7xl mx-auto pb-20 sm:pb-0">
		<Header session={data.session} />

		<div class="flex flex-1 items-center gap-4 px-0 flex-col sm:flex-row sm:items-stretch my-4 mx-3 xl:mx-0">
			<NavigationMenu />
			<main class="container mx-auto px-3 sm:px-0 flex-1 items-center sm:flex-4 rounded-2xl bg-base-200" aria-label="메인 콘텐츠">
				{@render children?.()}
			</main>
		</div>

		<Footer />
		
		<!-- 모바일 전용 하단 네비게이션 -->
		<MobileNavigation />
		
		<!-- PWA 프롬프트 임시 비활성화
		<InstallPrompt />
		<UpdatePrompt />
		-->
	</div>
</NuqsAdapter>
