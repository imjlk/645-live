<script lang="ts">
import { goto } from "$app/navigation";
import { page } from "$app/state";
import SimpleBall from "$lib/components/SimpleBall.svelte";
import type { BallNumber } from "$lib/modules/lotto/types";
import LinkButton from "$lib/ui/LinkButton.svelte";
import type { PageData } from "./$types";

interface Props {
	data: PageData;
}

let { data }: Props = $props();

// State variables using Svelte 5 runes
let numbers = $state<BallNumber[]>([]);
let totalScans = $state(0);
let winningNumbers = $state<number[]>([]);

// Initialize data from server using $derived
let initializedData = $derived.by(() => {
	if (data?.error) {
		console.error("Error loading history data:", data.error);
		return { error: data.error };
	}

	if (!data) {
		return { error: null };
	}

	// Initialize ball numbers with scan counts
	const newNumbers = Array.from({ length: 45 }, (_, i) => {
		const ballNumber = i + 1;
		const scanCountField = `scan_count_${ballNumber}`;
		const value = data.scanData?.[scanCountField] || 0;
		return {
			id: ballNumber,
			value: Number(value),
		};
	});

	// Get total scans
	const newTotalScans = Number(data.scanData?.total_scans || 0);

	// Get winning numbers for this round if available
	const newWinningNumbers = data.lottoNumbers
		? [
				data.lottoNumbers.drwtNo1,
				data.lottoNumbers.drwtNo2,
				data.lottoNumbers.drwtNo3,
				data.lottoNumbers.drwtNo4,
				data.lottoNumbers.drwtNo5,
				data.lottoNumbers.drwtNo6,
			]
		: [];

	return {
		numbers: newNumbers,
		totalScans: newTotalScans,
		winningNumbers: newWinningNumbers,
	};
});

// Update state when derived data changes using $effect
$effect(() => {
	if (initializedData && !initializedData.error) {
		numbers = initializedData.numbers || [];
		totalScans = initializedData.totalScans || 0;
		winningNumbers = initializedData.winningNumbers || [];
	}
});

// Handle round selection
async function selectRound(round: number) {
	const url = new URL(page.url);
	url.searchParams.set("round", round.toString());
	await goto(url.toString());
}

// Format date string
function formatDate(dateStr: string): string {
	try {
		const date = new Date(dateStr);
		return date.toLocaleDateString("ko-KR", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	} catch {
		return dateStr;
	}
}

// Check if a number is a winning number
function isWinningNumber(num: number): boolean {
	return winningNumbers.includes(num);
}
</script>

<svelte:head>
	<title>로또 스캔 통계 - 회차별 히스토리 | 645.live</title>
	<meta name="description" content="로또 번호 스캔 통계의 회차별 히스토리를 확인하세요." />
</svelte:head>

<div class="container mx-auto px-4 py-4 md:py-8 max-w-6xl">
	{#if data.error}
		<div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
			<h2 class="font-semibold mb-2">오류 발생</h2>
			<p>{data.error}</p>
		</div>
		
		<LinkButton href="/" class="bg-blue-600 hover:bg-blue-700 text-white">
			메인 페이지로 돌아가기
		</LinkButton>
	{:else}
		<!-- Header -->
		<header class="text-center mb-6 md:mb-8">
			<h1 class="text-2xl md:text-3xl lg:text-4xl font-bold text-base-content mb-2">
				로또 스캔 통계 히스토리
			</h1>
			<p class="text-sm md:text-base text-base-content/70">
				회차별 QR 코드 스캔 통계를 확인하세요
			</p>
		</header>

		<!-- Round Navigation -->
		<div class="bg-base-100 rounded-lg shadow-md p-4 md:p-6 mb-6 md:mb-8">
			<div class="flex flex-col gap-4">
				<div class="flex flex-col gap-3">
					<span class="text-sm sm:text-base md:text-lg font-semibold text-base-content">회차 선택:</span>
					<select 
						class="border border-gray-300 rounded-lg px-3 py-2 text-sm md:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
						value={data.targetRound}
						onchange={(e) => {
							const target = e.target as HTMLSelectElement;
							if (target) selectRound(Number(target.value));
						}}
					>
						{#each data.availableRounds as round}
							<option value={round}>
								{round}회차
								{#if round === data.latestRound}(최신){/if}
							</option>
						{/each}
					</select>
				</div>
				
				<div class="flex flex-col sm:flex-row gap-2">
					<LinkButton href="/" class="btn btn-neutral text-sm">
						메인으로
					</LinkButton>
					<LinkButton href="/qr-scan" class="bg-blue-600 hover:bg-blue-700 text-white text-sm">
						QR 스캔
					</LinkButton>
				</div>
			</div>
		</div>

		<!-- Current Round Info -->
		<div class="bg-base-100 rounded-lg shadow-md p-4 md:p-6 mb-6 md:mb-8">
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
				<div class="text-center md:text-left">
					<h3 class="text-base md:text-lg font-semibold text-base-content mb-2">현재 보기</h3>
					<p class="text-xl md:text-2xl font-bold text-blue-600">{data.targetRound}회차</p>
				</div>
				
				<div class="text-center md:text-left">
					<h3 class="text-base md:text-lg font-semibold text-base-content mb-2">추첨일</h3>
					<p class="text-sm md:text-lg text-base-content">
						{data.lottoNumbers?.drwNoDate ? formatDate(data.lottoNumbers.drwNoDate) : '미공개'}
					</p>
				</div>
				
				<div class="text-center md:text-left">
					<h3 class="text-base md:text-lg font-semibold text-base-content mb-2">총 스캔 횟수</h3>
					<p class="text-xl md:text-2xl font-bold text-green-600">{totalScans.toLocaleString()}회</p>
				</div>
			</div>
		</div>

		<!-- Winning Numbers (if available) -->
		{#if data.lottoNumbers && winningNumbers.length > 0}
			<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 md:p-6 mb-6 md:mb-8">
				<h3 class="text-lg font-semibold text-base-content mb-4">당첨 번호</h3>
				<div class="flex flex-wrap gap-2 md:gap-3 items-center justify-center md:justify-start">
					{#each winningNumbers as num}
						<SimpleBall number={num} isWinning={true} size="md" />
					{/each}
					<span class="text-base-content/70 mx-1 md:mx-2 text-sm md:text-base">보너스</span>
					<SimpleBall number={data.lottoNumbers.bnusNo} isBonus={true} size="md" />
				</div>
			</div>
		{/if}

		<!-- Scan Statistics -->
		<div class="bg-base-100 rounded-lg shadow-md p-4 md:p-6 mb-6 md:mb-8">
			<h3 class="text-lg md:text-xl font-semibold text-base-content mb-4 md:mb-6">번호별 스캔 통계</h3>
			
			{#if numbers.length > 0}
				<div class="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-9 lg:grid-cols-15 gap-2 md:gap-3">
					{#each numbers as ball}
						<div class="relative flex flex-col items-center">
							<SimpleBall 
								number={ball.id} 
								isWinning={isWinningNumber(ball.id)}
								size="sm"
								class="mb-1"
							/>
							<div class="text-center">
								<span class="text-xs md:text-sm font-medium text-base-content block">{ball.value}</span>
								<div class="text-xs text-base-content/60 hidden md:block">스캔</div>
							</div>
							{#if isWinningNumber(ball.id)}
								<div class="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
									★
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<div class="text-center py-8 md:py-12 text-base-content/60">
					<p class="text-sm md:text-base">이 회차에 대한 스캔 데이터가 없습니다.</p>
				</div>
			{/if}
		</div>

		<!-- Statistics Summary -->
		{#if numbers.length > 0}
			<div class="bg-base-200 rounded-lg p-4 md:p-6">
				<h3 class="text-base md:text-lg font-semibold text-base-content mb-4">통계 요약</h3>
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
					<div class="bg-white rounded-lg p-3 md:p-4">
						<p class="text-xs md:text-sm text-base-content/70 mb-1">최다 스캔 번호</p>
						<p class="text-lg md:text-xl font-bold text-blue-600">
							{Math.max(...numbers.map(n => n.value)) > 0 
								? numbers.find(n => n.value === Math.max(...numbers.map(n => n.value)))?.id || '-'
								: '-'
							}번
						</p>
						<p class="text-xs md:text-sm text-base-content/60">
							{Math.max(...numbers.map(n => n.value))}회 스캔
						</p>
					</div>
					
					<div class="bg-white rounded-lg p-3 md:p-4">
						<p class="text-xs md:text-sm text-base-content/70 mb-1">평균 스캔 횟수</p>
						<p class="text-lg md:text-xl font-bold text-green-600">
							{totalScans > 0 ? (totalScans / 45).toFixed(1) : '0'}회
						</p>
					</div>
					
					<div class="bg-white rounded-lg p-3 md:p-4">
						<p class="text-xs md:text-sm text-base-content/70 mb-1">스캔된 번호</p>
						<p class="text-lg md:text-xl font-bold text-purple-600">
							{numbers.filter(n => n.value > 0).length}개
						</p>
						<p class="text-xs md:text-sm text-base-content/60">
							/ 45개 번호
						</p>
					</div>
				</div>
			</div>
		{/if}
	{/if}
</div>
