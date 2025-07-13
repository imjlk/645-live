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
		<h1 class="text-3xl font-bold text-gray-800 mb-2">로또 당첨점 조회</h1>
		<p class="text-gray-600">회차별로 1등, 2등 당첨점 정보를 확인할 수 있습니다.</p>
	</div>

	<!-- 검색 필터 -->
	<div class="bg-white rounded-lg shadow-md p-6 mb-6">
		<div class="flex flex-col sm:flex-row gap-4">
			<div class="flex-1">
				<label for="round" class="block text-sm font-medium text-gray-700 mb-2">
					회차
				</label>
				<input
					id="round"
					type="number"
					min="1"
					max={calculateExpectedLatestRound()}
					value={round}
					on:input={handleRoundChange}
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					placeholder="회차를 입력하세요"
				/>
			</div>
			<div class="flex-1">
				<label for="winType" class="block text-sm font-medium text-gray-700 mb-2">
					당첨 등급
				</label>
				<select
					id="winType"
					value={winType || ''}
					on:change={handleWinTypeChange}
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
		<div class="bg-white rounded-lg shadow-md p-6 mb-6">
			<h2 class="text-xl font-semibold text-gray-800 mb-4">{round}회차 당첨점 통계</h2>
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<div class="text-center">
					<div class="text-2xl font-bold text-blue-600">{statistics.total}</div>
					<div class="text-sm text-gray-600">총 당첨점</div>
				</div>
				<div class="text-center">
					<div class="text-2xl font-bold text-yellow-600">{statistics.firstPlace}</div>
					<div class="text-sm text-gray-600">1등 당첨점</div>
				</div>
				<div class="text-center">
					<div class="text-2xl font-bold text-green-600">{statistics.secondPlace}</div>
					<div class="text-sm text-gray-600">2등 당첨점</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- 로딩 상태 -->
	{#if loading}
		<div class="bg-white rounded-lg shadow-md p-8 text-center">
			<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
			<p class="mt-4 text-gray-600">당첨점 정보를 불러오는 중...</p>
		</div>
	{/if}

	<!-- 오류 상태 -->
	{#if error}
		<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
			<div class="flex">
				<div class="flex-shrink-0">
					<svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
					</svg>
				</div>
				<div class="ml-3">
					<h3 class="text-sm font-medium text-red-800">오류가 발생했습니다</h3>
					<div class="mt-2 text-sm text-red-700">
						{error}
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- 당첨점 목록 -->
	{#if !loading && !error && stores.length > 0}
		<div class="bg-white rounded-lg shadow-md overflow-hidden">
			<div class="px-6 py-4 border-b border-gray-200">
				<h2 class="text-xl font-semibold text-gray-800">
					{round}회차 당첨점 목록
					{#if winType}
						({winType})
					{/if}
				</h2>
			</div>
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								등급
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								상호명
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								주소
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								선택방식
							</th>
						</tr>
					</thead>
					<tbody class="bg-white divide-y divide-gray-200">
						{#each stores as store (store.id)}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4 whitespace-nowrap">
									<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {
										store.win_type === '1등' 
											? 'bg-yellow-100 text-yellow-800' 
											: 'bg-green-100 text-green-800'
									}">
										{store.win_type}
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
									{store.store_name}
								</td>
								<td class="px-6 py-4 text-sm text-gray-700">
									{store.address}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{store.selection_type || '-'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{:else if !loading && !error && stores.length === 0 && round}
		<div class="bg-gray-50 rounded-lg p-8 text-center">
			<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
			</svg>
			<h3 class="mt-2 text-sm font-medium text-gray-900">당첨점이 없습니다</h3>
			<p class="mt-1 text-sm text-gray-500">
				{round}회차에는 
				{#if winType}
					{winType} 
				{/if}
				당첨점 정보가 없습니다.
			</p>
		</div>
	{/if}
</div>
