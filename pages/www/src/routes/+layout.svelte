<script lang="ts">
import { page } from "$app/state";
import Header from "$lib/layout/Header.svelte";
import "../app.css";
import Footer from "$lib/layout/Footer.svelte";
import { getScanCountApi } from "$lib/stores/streamStore";
import LinkButton from "$lib/ui/LinkButton.svelte";
import { NuqsAdapter } from "nuqs-svelte/adapters/svelte-kit";
import { onMount } from "svelte";

let { children } = $props();
import { preparePageTransition } from "$lib/layout/page-transition";

preparePageTransition();

// 실제 데이터가 있는 회차들
let availableRounds = $state<number[]>([]);

// 현재 선택된 회차 (URL에서 추출)
const currentRound = $derived(
	page.url.searchParams.get("round")
		? Number(page.url.searchParams.get("round"))
		: null,
);

let currentPath = $state(page.url.pathname);

$effect(() => {
	currentPath = page.url.pathname;
});

onMount(async () => {
	// 실제 데이터가 있는 회차들을 가져오기
	const api = getScanCountApi();
	if (api) {
		try {
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
	}
});
</script>

<NuqsAdapter>
	<div class="min-h-dvh flex flex-col max-w-7xl mx-auto">
		<Header />

		<div class="flex flex-1 items-center gap-4 px-0 flex-col sm:flex-row sm:items-stretch my-4 mx-3 xl:mx-0">
			<aside class="w-full sm:w-32 min-w-48 sm:flex-1 rounded-2xl bg-base-200">
				{#key page.url.pathname}
				<ul class="flex flex-row sm:flex-col gap-4 overflow-scroll py-2 sm:py-4 px-3">
					<li>
						<LinkButton 
							class="btn-secondary btn-ghost rounded-full w-full {page.url.pathname === '/' ? 'btn-active' : ''}" 
							href="/"
						>
							홈
						</LinkButton>
					</li>
					<li>
						<LinkButton 
							class="btn-secondary btn-ghost rounded-full w-full {page.url.pathname === '/qr-scan' ? 'btn-active' : ''}" 
							href="/qr-scan"
						>
							QR 스캔
						</LinkButton>
					</li>
					<li>
						<LinkButton 
							class="btn-secondary btn-ghost rounded-full w-full {page.url.pathname === '/history' ? 'btn-active' : ''}" 
							href="/history"
						>
							지난 회차
						</LinkButton>
					</li>
					<li>
						<LinkButton 
							class="btn-secondary btn-ghost rounded-full w-full {page.url.pathname.startsWith('/stats') ? 'btn-active' : ''}" 
							href="/stats"
						>
							통계
						</LinkButton>
					</li>
				</ul>
				{/key}
			</aside>
			<main class="container mx-auto px-3 sm:px-0 flex-1 items-center sm:flex-4 rounded-2xl bg-base-200">
				{@render children()}
			</main>
		</div>

		<Footer />
	</div>
</NuqsAdapter>