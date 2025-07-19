<script lang="ts">
import { goto } from "$app/navigation";
import { page } from "$app/stores";
import { env } from "$env/static/public";
import { calculateExpectedLatestRound } from "$lib/utils/lotto-common";
import { onMount } from "svelte";
import { derived } from "svelte/store";
import { initClient } from "trailbase";

export let data: {
	initialRound: number;
	initialStores: Array<{
		id: number;
		round: number;
		store_name: string;
		address: string;
		win_type: "1등" | "2등";
		selection_type?: "자동" | "수동";
	}>;
	initialStatistics: {
		total: number;
		firstPlace: number;
		secondPlace: number;
	};
};

// Trailbase client 초기화
const client = initClient(env.PUBLIC_TRAILBASE_URL || "http://localhost:4000");

// URL에서 파라미터를 derived store로 추출
const urlRound = derived(page, ($page) => {
	const roundParam = $page.url.searchParams.get("round");
	if (roundParam) {
		const parsed = Number.parseInt(roundParam, 10);
		return !Number.isNaN(parsed) && parsed > 0 ? parsed : data.initialRound;
	}
	return data.initialRound;
});

// 현재 상태 변수들 - 초기값을 data에서 설정
let round = data.initialRound;
let stores = data.initialStores;
let statistics = data.initialStatistics;
let loading = false;
let error = "";

// Trailbase client를 사용한 데이터 조회
async function fetchWinningStores() {
	if (!round) return;

	loading = true;
	error = "";

	try {
		// Trailbase 쿼리 파라미터 형식으로 필터링
		const response = await client.records("lotto_winning_stores").list({
			order: ["win_type", "id"],
			filters: [{ column: "round", op: "equal", value: round.toString() }],
		});

		let fetchedStores = response.records as Array<{
			id: number;
			round: number;
			store_name: string;
			address: string;
			win_type: "1등" | "2등";
			selection_type?: "자동" | "수동";
		}>;

		// Trailbase에서 이미 필터링했으므로 클라이언트 사이드 필터링 제거
		// 결과 통계 계산
		const firstPlaceCount = fetchedStores.filter(
			(store) => store.win_type === "1등",
		).length;
		const secondPlaceCount = fetchedStores.filter(
			(store) => store.win_type === "2등",
		).length;

		stores = fetchedStores;
		statistics = {
			total: fetchedStores.length,
			firstPlace: firstPlaceCount,
			secondPlace: secondPlaceCount,
		};
	} catch (err) {
		error = "당첨점 정보를 가져오는 중 오류가 발생했습니다.";
		console.error("Trailbase fetch error:", err);
	} finally {
		loading = false;
	}
}

function updateUrl(newRound: number) {
	const url = new URL($page.url);
	url.searchParams.set("round", newRound.toString());
	goto(url.pathname + url.search, { replaceState: true, noScroll: true });
}

function handleRoundChange(event: Event) {
	const target = event.target as HTMLInputElement;
	const newRound = Number.parseInt(target.value);
	if (!Number.isNaN(newRound) && newRound > 0) {
		updateUrl(newRound);
		// round는 derived store에서 자동으로 업데이트됨
	}
}

onMount(() => {
	// derived store를 구독하여 URL 변경시 자동으로 데이터 업데이트
	const unsubscribeRound = urlRound.subscribe((newRound) => {
		if (newRound !== round) {
			round = newRound;
			fetchWinningStores();
		}
	});

	// cleanup
	return () => {
		unsubscribeRound();
	};
});
</script>

<svelte:head>
	<title>로또 당첨점 조회 - 645.live</title>
	<meta name="description" content="로또 당첨점 정보를 회차별로 조회할 수 있습니다." />
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-base-content mb-2">로또 당첨점 조회</h1>
		<p class="text-base-content/70">회차별로 1등, 2등 당첨점 정보를 확인할 수 있습니다.</p>
	</div>

	<!-- 검색 필터 -->
	<div class="bg-base-100 rounded-lg shadow-md p-6 mb-6">
		<div class="flex flex-col sm:flex-row gap-4">
			<div class="flex-1">
				<label for="round" class="block text-sm font-medium text-base-content mb-2">
					회차
				</label>
				<input
					id="round"
					type="number"
					min="1"
					max={calculateExpectedLatestRound()}
					value={round}
					on:input={handleRoundChange}
					class="input input-bordered w-full"
					placeholder="회차를 입력하세요"
					disabled={loading}
				/>
			</div>
		</div>
	</div>

	<!-- 로딩 및 에러 처리 -->
	{#if loading}
		<div class="flex justify-center items-center py-12">
			<span class="loading loading-spinner loading-lg"></span>
			<span class="ml-2 text-base-content/70">데이터를 불러오는 중...</span>
		</div>
	{:else if error}
		<div class="alert alert-error mb-6">
			<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			<span>{error}</span>
		</div>
	{:else}
		<!-- 통계 정보 -->
		{#if round}
			<div class="bg-base-100 rounded-lg shadow-md p-6 mb-6">
				<h2 class="text-xl font-semibold text-base-content mb-4">{round}회차 당첨점 통계</h2>
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div class="text-center">
						<div class="text-2xl font-bold text-primary">{statistics.total}</div>
						<div class="text-sm text-base-content/70">총 당첨점</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold text-warning">{statistics.firstPlace}</div>
						<div class="text-sm text-base-content/70">1등 당첨점</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold text-success">{statistics.secondPlace}</div>
						<div class="text-sm text-base-content/70">2등 당첨점</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- 당첨점 목록 -->
		{#if stores.length > 0}
			<div class="bg-base-100 rounded-lg shadow-md overflow-hidden">
				<div class="px-6 py-4 border-b border-base-300">
					<h2 class="text-xl font-semibold text-base-content">
						{round}회차 당첨점 목록
					</h2>
				</div>
				<div class="overflow-x-auto">
					<table class="table table-zebra w-full">
						<thead>
							<tr>
								<th class="text-base-content">등급</th>
								<th class="text-base-content">상호명</th>
								<th class="text-base-content">주소</th>
								<th class="text-base-content">선택방식</th>
							</tr>
						</thead>
						<tbody>
							{#each stores as store (store.id)}
								<tr class="hover">
									<td>
										<span class="badge {
											store.win_type === '1등' 
												? 'badge-warning' 
												: 'badge-success'
										}">
											{store.win_type}
										</span>
									</td>
									<td class="font-medium text-base-content">
										{store.store_name}
									</td>
									<td class="text-base-content/70">
										{store.address}
									</td>
									<td class="text-base-content/60">
										{store.selection_type || '-'}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{:else if round}
			<div class="bg-base-200 rounded-lg p-8 text-center">
				<svg class="mx-auto h-12 w-12 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
				</svg>
				<h3 class="mt-2 text-sm font-medium text-base-content">당첨점이 없습니다</h3>
				<p class="mt-1 text-sm text-base-content/60">
					{round}회차에는 당첨점 정보가 없습니다.
				</p>
			</div>
		{/if}
	{/if}
</div>
