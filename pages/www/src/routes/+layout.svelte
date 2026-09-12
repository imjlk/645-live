<script lang="ts">
import { NuqsAdapter } from "nuqs-svelte/adapters/svelte-kit";
import { onMount } from "svelte";
import { browser } from "$app/environment";
import { afterNavigate } from "$app/navigation";
import { page } from "$app/state";
import { syncWebMcpContext } from "$lib/agent/webmcp";
import { provideBrowserSession } from "$lib/auth/session.svelte";
import Footer from "$lib/layout/Footer.svelte";
import Header from "$lib/layout/Header.svelte";
import MobileNavigation from "$lib/layout/MobileNavigation.svelte";
import "../app.css";
import { SITE_ORIGIN } from "$lib/seo/index.js";
import { initializeGlobalConnection } from "$lib/trailbase/global-connection.svelte";

let { children } = $props();
const auth = provideBrowserSession();
const memberId = $derived(auth.session?.user.id ?? null);

import { preparePageTransition } from "$lib/layout/page-transition";
import {
	registerNavigationAnalytics,
	registerWebVitals,
	trackPageView,
} from "$lib/utils/analytics";
import {
	configureMemberScanSync,
	registerMemberScanSyncLifecycle,
} from "$lib/utils/member-scan-sync";

preparePageTransition();
afterNavigate(() => trackPageView());

let currentPath = $derived(page.url.pathname);
let currentAbsoluteUrl = $derived(
	new URL(
		`${page.url.pathname}${browser ? page.url.search : ""}`,
		SITE_ORIGIN,
	).toString(),
);
const FORCE_SW_RESET_PARAM = "sw-reset";
// Temporarily keep PWA surfaces dormant while clearing Search Console
// "deceptive page" warnings and any stale service worker registrations.
const SERVICE_WORKER_SAFETY_HOLD = true;

async function resetServiceWorkersIfNeeded(): Promise<boolean> {
	if (!browser || !("serviceWorker" in navigator)) {
		return false;
	}

	const forceReset = page.url.searchParams.has(FORCE_SW_RESET_PARAM);
	const shouldReset =
		import.meta.env.DEV || forceReset || SERVICE_WORKER_SAFETY_HOLD;

	if (!shouldReset) {
		return false;
	}

	const resetKey = forceReset
		? "prod-sw-reset"
		: SERVICE_WORKER_SAFETY_HOLD
			? "safe-mode-sw-reset"
			: "dev-sw-reset";
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
	const stopSession = auth.start();
	const unregisterMemberScanSync = registerMemberScanSyncLifecycle();
	const unregisterAnalytics = registerNavigationAnalytics();
	void registerWebVitals().catch(() => {});

	void (async () => {
		if (await resetServiceWorkersIfNeeded()) {
			return;
		}

		// TrailBase 전역 연결 초기화 (단순화된 버전)
		void initializeGlobalConnection().catch((error) => {
			console.warn("Realtime connection unavailable:", error);
		});
	})();

	return () => {
		stopSession();
		configureMemberScanSync(null);
		unregisterMemberScanSync();
		unregisterAnalytics();
	};
});

$effect(() => {
	if (!browser) {
		return;
	}

	configureMemberScanSync(memberId);
});

$effect(() => {
	if (!browser) {
		return;
	}

	void syncWebMcpContext({
		pathname: currentPath,
		userId: memberId,
	});
});
</script>

<svelte:head>
	<link rel="alternate" hreflang="ko-KR" href={currentAbsoluteUrl} />
	<link rel="alternate" hreflang="x-default" href={currentAbsoluteUrl} />
	<meta name="google-adsense-account" content="ca-pub-4441205887996163" />
	<meta name="naver-site-verification" content="61430164e06bd982855b384e778a1c565ee14065" />
	{#if import.meta.env.PROD}
	<!-- Google tag (gtag.js) -->
	<script async src="https://www.googletagmanager.com/gtag/js?id=G-KEBJGHESGM"></script>
	<script>
		window.dataLayer = window.dataLayer || [];
		function gtag(){dataLayer.push(arguments);}
		gtag('js', new Date());

		gtag('config', 'G-KEBJGHESGM', {
			send_page_view: false,
			allow_google_signals: false,
			allow_ad_personalization_signals: false,
			page_location: location.origin + location.pathname,
			page_referrer: document.referrer ? new URL(document.referrer).origin : ''
		});
	</script>
	<script
		async
		src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4441205887996163"
		crossorigin="anonymous"
	></script>
	{/if}
</svelte:head>

<NuqsAdapter>
 <a href="#main-content" class="skip-link">본문으로 건너뛰기</a>
 <div class="app-shell">
  <Header />
  <main id="main-content" class="page-shell" aria-label="메인 콘텐츠">
   {@render children?.()}
  </main>
  <Footer />
  <MobileNavigation />
 </div>
</NuqsAdapter>
