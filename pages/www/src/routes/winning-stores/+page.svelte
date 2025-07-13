<script lang="ts">
import { goto } from "$app/navigation";
import { calculateExpectedLatestRound } from "$lib/utils/lotto-common";
import { onMount } from "svelte";

let round = calculateExpectedLatestRound() - 1;
let winType: "1등" | "2등" | undefined = undefined;

let stores: Array<{
	id: number;
	round: number;
	store_name: string;
	address: string;
	win_type: "1등" | "2등";
	selection_type?: "자동" | "수동";
}> = [];

let statistics = {
	total: 0,
	firstPlace: 0,
	secondPlace: 0,
};

let loading = false;
let error = "";

// URL 쿼리 파라미터와 동기화
$: {
	if (typeof window !== "undefined") {
		const urlParams = new URLSearchParams(window.location.search);
		const roundParam = urlParams.get("round");
		const winTypeParam = urlParams.get("winType");

		if (roundParam) {
			const parsedRound = Number.parseInt(roundParam, 10);
			if (!Number.isNaN(parsedRound) && parsedRound > 0) {
				round = parsedRound;
			}
		}

		if (winTypeParam === "1등" || winTypeParam === "2등") {
			winType = winTypeParam;
		} else {
			winType = undefined;
		}
	}
}

function updateUrl() {
	if (typeof window === "undefined") return;

	const url = new URL(window.location.href);
	url.searchParams.set("round", round.toString());

	if (winType) {
		url.searchParams.set("winType", winType);
	} else {
		url.searchParams.delete("winType");
	}

	goto(url.pathname + url.search, { replaceState: true, noScroll: true });
}

async function fetchWinningStores() {
	if (!round) return;

	loading = true;
	error = "";

	try {
		const params = new URLSearchParams({
			round: round.toString(),
		});

		if (winType) {
			params.append("winType", winType);
		}

		const response = await fetch(`/api/winning-stores?${params}`);
		const data = (await response.json()) as {
			success: boolean;
			data?: {
				stores: typeof stores;
				statistics: typeof statistics;
			};
			error?: string;
		};

		if (data.success && data.data) {
			stores = data.data.stores;
			statistics = data.data.statistics;
		} else {
			error = data.error || "당첨점 정보를 가져오는 중 오류가 발생했습니다.";
		}
	} catch (err) {
		error = "네트워크 오류가 발생했습니다.";
		console.error("Fetch error:", err);
	} finally {
		loading = false;
	}
}

function handleRoundChange(event: Event) {
	const target = event.target as HTMLInputElement;
	const newRound = Number.parseInt(target.value);
	if (!Number.isNaN(newRound) && newRound > 0) {
		round = newRound;
		updateUrl();
		fetchWinningStores();
	}
}

function handleWinTypeChange(event: Event) {
	const target = event.target as HTMLSelectElement;
	const value = target.value;
	if (value === "") {
		winType = undefined;
	} else if (value === "1등" || value === "2등") {
		winType = value;
	}
	updateUrl();
	fetchWinningStores();
}

onMount(() => {
	// URL에서 초기값 읽기
	const urlParams = new URLSearchParams(window.location.search);
	const roundParam = urlParams.get("round");
	const winTypeParam = urlParams.get("winType");

	if (roundParam) {
		const parsedRound = Number.parseInt(roundParam, 10);
		if (!Number.isNaN(parsedRound) && parsedRound > 0) {
			round = parsedRound;
		}
	}

	if (winTypeParam === "1등" || winTypeParam === "2등") {
		winType = winTypeParam;
	}

	fetchWinningStores();
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
				/>
			</div>
			<div class="flex-1">
				<label for="winType" class="block text-sm font-medium text-base-content mb-2">
					당첨 등급
				</label>
				<select
					id="winType"
					value={winType || ''}
					on:change={handleWinTypeChange}
					class="select select-bordered w-full"
				>
					<option value="">전체</option>
					<option value="1등">1등</option>
					<option value="2등">2등</option>
				</select>
			</div>
		</div>
	</div>

	<!-- 통계 정보 -->
	{#if !loading && !error && round}
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

	<!-- 로딩 상태 -->
	{#if loading}
		<div class="bg-base-100 rounded-lg shadow-md p-8 text-center">
			<div class="loading loading-spinner loading-lg text-primary"></div>
			<p class="mt-4 text-base-content/70">당첨점 정보를 불러오는 중...</p>
		</div>
	{/if}

	<!-- 오류 상태 -->
	{#if error}
		<div class="alert alert-error mb-6">
			<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 stroke-current shrink-0" fill="none" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			<span>오류가 발생했습니다: {error}</span>
		</div>
	{/if}

	<!-- 당첨점 목록 -->
	{#if !loading && !error && stores.length > 0}
		<div class="bg-base-100 rounded-lg shadow-md overflow-hidden">
			<div class="px-6 py-4 border-b border-base-300">
				<h2 class="text-xl font-semibold text-base-content">
					{round}회차 당첨점 목록
					{#if winType}
						({winType})
					{/if}
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
	{:else if !loading && !error && stores.length === 0 && round}
		<div class="bg-base-200 rounded-lg p-8 text-center">
			<svg class="mx-auto h-12 w-12 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
			</svg>
			<h3 class="mt-2 text-sm font-medium text-base-content">당첨점이 없습니다</h3>
			<p class="mt-1 text-sm text-base-content/60">
				{round}회차에는 
				{#if winType}
					{winType} 
				{/if}
				당첨점 정보가 없습니다.
			</p>
		</div>
	{/if}
</div>
