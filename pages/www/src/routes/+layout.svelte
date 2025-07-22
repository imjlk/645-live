<script lang="ts">
import { page } from "$app/state";
import Header from "$lib/layout/Header.svelte";
import "../app.css";
import Footer from "$lib/layout/Footer.svelte";
import { trailbaseClient } from "$lib/trailbase/client";
import LinkButton from "$lib/ui/LinkButton.svelte";
import Clarity from "@microsoft/clarity";
import { NuqsAdapter } from "nuqs-svelte/adapters/svelte-kit";
import { onMount } from "svelte";

let { children } = $props();
import { preparePageTransition } from "$lib/layout/page-transition";

preparePageTransition();

// 실제 데이터가 있는 회차들
let availableRounds = $state<number[]>([]);


let currentPath = $state(page.url.pathname);

$effect(() => {
	currentPath = page.url.pathname;
});

onMount(async () => {
	// Microsoft Clarity 초기화 (프로덕션에서만)
	if (import.meta.env.PROD) {
		Clarity.init("qeumg5ffol");
	}

	// 실제 데이터가 있는 회차들을 가져오기
	try {
		const { initClient } = await import('trailbase');
		const client = initClient('http://localhost:4000');
		const api = client.records('lotto_draw_scan_counts');
		
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
</svelte:head>

<NuqsAdapter>
	<div class="min-h-dvh flex flex-col max-w-7xl mx-auto">
		<Header />

		<div class="flex flex-1 items-center gap-4 px-0 flex-col sm:flex-row sm:items-stretch my-4 mx-3 xl:mx-0">
			<aside class="w-full sm:w-32 min-w-48 sm:flex-1 rounded-2xl bg-base-200">
				{#key page.url.pathname}
				<ul class="flex flex-row sm:flex-col gap-4 overflow-scroll py-2 sm:py-4 px-3">
					<li class="flex-shrink-0">
						<LinkButton 
							class="btn-secondary btn-ghost rounded-full w-full whitespace-nowrap {page.url.pathname === '/qr-scan' ? 'btn-active' : ''}" 
							href="/qr-scan"
						>
							QR 스캔
						</LinkButton>
					</li>
					<li class="flex-shrink-0">
						<LinkButton 
							class="btn-secondary btn-ghost rounded-full w-full whitespace-nowrap {page.url.pathname === '/history' ? 'btn-active' : ''}" 
							href="/history"
						>
							지난 회차
						</LinkButton>
					</li>
					<li class="flex-shrink-0">
						<LinkButton 
							class="btn-secondary btn-ghost rounded-full w-full whitespace-nowrap {page.url.pathname.startsWith('/generator') ? 'btn-active' : ''}" 
							href="/generator"
						>
							번호 생성기
						</LinkButton>
					</li>
					<li class="flex-shrink-0">
						<LinkButton 
							class="btn-secondary btn-ghost rounded-full w-full whitespace-nowrap {page.url.pathname.startsWith('/stats') ? 'btn-active' : ''}" 
							href="/stats"
						>
							통계
						</LinkButton>
					</li>
					<li class="flex-shrink-0">
						<LinkButton 
							class="btn-secondary btn-ghost rounded-full w-full whitespace-nowrap {page.url.pathname.startsWith('/winning-stores') ? 'btn-active' : ''}" 
							href="/winning-stores"
						>
							당첨점
						</LinkButton>
					</li>
				</ul>
				{/key}
			</aside>
			<main class="container mx-auto px-3 sm:px-0 flex-1 items-center sm:flex-4 rounded-2xl bg-base-200">
				{@render children?.()}
			</main>
		</div>

		<Footer />
	</div>
</NuqsAdapter>