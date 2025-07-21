<script lang="ts">
import { env } from "$env/dynamic/public";
import { onMount } from "svelte";
import { JsonLd, MetaTags } from "svelte-meta-tags";
import { initClient } from "trailbase";

// --- Type Definitions ---
interface NumberStat {
	number: number;
	draw_count: number;
	bonus_count: number;
	last_draw_round: number;
	updated_at: string;
}

interface OddEvenStat {
	round: number;
	odd_count: number;
	even_count: number;
}

interface ColorStat {
	round: number;
	yellow_count: number;
	blue_count: number;
	red_count: number;
	grey_count: number;
	green_count: number;
}

interface SectionStat {
	round: number;
	section_1_10: number;
	section_11_20: number;
	section_21_30: number;
	section_31_40: number;
	section_41_45: number;
}

interface ConsecutiveStat {
	round: number;
	consecutive_count: number;
}

interface HighLowStat {
	round: number;
	low_count: number;
	high_count: number;
}

interface LottoStats {
	numberStats: NumberStat[];
	oddEvenStats: OddEvenStat[];
	colorStats: ColorStat[];
	sectionStats: SectionStat[];
	consecutiveStats: ConsecutiveStat[];
	highLowStats: HighLowStat[];
}

// --- Trailbase Client and Reactive State ---
const client = initClient(env.PUBLIC_TRAILBASE_URL || "http://localhost:4000");
let lottoStats = $state<LottoStats | null>(null);
let numberOfSets = $state(5);
let includedNumbers = $state<Set<number>>(new Set());
let excludedNumbers = $state<Set<number>>(new Set());
let generatedLottoSets = $state<number[][]>([]);
let isLoading = $state(false);
let isLoadingStats = $state(true);
let error = $state<string | null>(null);

// --- Statistical Filter State ---
let sumRange = $state({ min: 100, max: 180, enabled: false });
let oddEvenRatio = $state({ odd: 3, even: 3, enabled: false });
let highLowRatio = $state({ high: 3, low: 3, enabled: false });
let consecutiveCount = $state({ max: 1, enabled: false });

onMount(() => {
	// Load statistics data
	async function loadStats() {
		isLoadingStats = true;
		try {
			const [numStats, oeStats, colStats, secStats, consStats, hlStats] =
				await Promise.all([
					client
						.records("lotto_number_stats")
						.list({ pagination: { limit: 100 } }),
					client
						.records("lotto_draw_odd_even_stats")
						.list({ pagination: { limit: 1024 } }),
					client
						.records("lotto_draw_color_stats")
						.list({ pagination: { limit: 1024 } }),
					client
						.records("lotto_draw_section_stats")
						.list({ pagination: { limit: 1024 } }),
					client
						.records("lotto_draw_consecutive_stats")
						.list({ pagination: { limit: 1024 } }),
					client
						.records("lotto_draw_high_low_stats")
						.list({ pagination: { limit: 1024 } }),
				]);

			lottoStats = {
				numberStats: numStats.records as unknown as NumberStat[],
				oddEvenStats: oeStats.records as unknown as OddEvenStat[],
				colorStats: colStats.records as unknown as ColorStat[],
				sectionStats: secStats.records as unknown as SectionStat[],
				consecutiveStats: consStats.records as unknown as ConsecutiveStat[],
				highLowStats: hlStats.records as unknown as HighLowStat[],
			};
		} catch (e: unknown) {
			const errorMessage = e instanceof Error ? e.message : String(e);
			error = `통계 데이터 로딩 실패: ${errorMessage}`;
			console.error(e);
		} finally {
			isLoadingStats = false;
		}
	}

	loadStats();

	// Add scroll listener for mobile button visibility
	const handleScroll = () => {
		scrollY = window.scrollY;
	};
	window.addEventListener("scroll", handleScroll);

	return () => {
		window.removeEventListener("scroll", handleScroll);
	};
});

// --- Lotto Number Generation Logic ---
async function generateNumbers() {
	// Check if number of sets exceeds maximum
	if (numberOfSets > 100) {
		alert("생성 개수는 최대 100개까지 가능합니다.");
		return;
	}

	isLoading = true;
	error = null;
	generatedLottoSets = [];

	try {
		const sets: number[][] = [];
		const maxAttempts = 30000;

		for (let i = 0; i < numberOfSets; i++) {
			let attempts = 0;
			while (attempts < maxAttempts) {
				const candidateSet = generateSingleCandidate();
				if (isValid(candidateSet)) {
					sets.push(candidateSet);
					break;
				}
				attempts++;
			}
			if (attempts === maxAttempts) {
				throw new Error(
					`생성 실패: ${i + 1}번째 번호를 생성하지 못했습니다. 조건이 너무 까다롭습니다.`,
				);
			}
		}
		generatedLottoSets = sets;
	} catch (e: unknown) {
		const errorMessage =
			e instanceof Error ? e.message : "An unknown error occurred.";
		error = errorMessage;
	} finally {
		isLoading = false;
	}
}

// Mobile-specific function that generates numbers and scrolls to results
async function generateNumbersAndScroll() {
	await generateNumbers();

	// Scroll to results section on mobile after generation
	setTimeout(() => {
		const resultsSection = document.getElementById("results-section");
		if (resultsSection) {
			resultsSection.scrollIntoView({
				behavior: "smooth",
				block: "start",
			});
		}
	}, 100); // Small delay to ensure DOM is updated
}

function generateSingleCandidate(): number[] {
	const include = Array.from(includedNumbers);
	const exclude = Array.from(excludedNumbers);
	const singleSet = new Set<number>(include);
	const availableNumbers = Array.from({ length: 45 }, (_, i) => i + 1).filter(
		(n) => !exclude.includes(n) && !include.includes(n),
	);

	while (singleSet.size < 6) {
		if (availableNumbers.length === 0) {
			throw new Error("Cannot generate numbers with the given constraints.");
		}
		const randomIndex = Math.floor(Math.random() * availableNumbers.length);
		const [pickedNumber] = availableNumbers.splice(randomIndex, 1);
		singleSet.add(pickedNumber);
	}
	return Array.from(singleSet).sort((a, b) => a - b);
}

function isValid(set: number[]): boolean {
	if (sumRange.enabled) {
		const sum = set.reduce((a, b) => a + b, 0);
		if (sum < sumRange.min || sum > sumRange.max) return false;
	}
	if (oddEvenRatio.enabled) {
		const oddCount = set.filter((n) => n % 2 !== 0).length;
		const evenCount = 6 - oddCount;
		if (oddCount !== oddEvenRatio.odd || evenCount !== oddEvenRatio.even)
			return false;
	}
	if (highLowRatio.enabled) {
		const highCount = set.filter((n) => n >= 23).length;
		const lowCount = 6 - highCount;
		if (highCount !== highLowRatio.high || lowCount !== highLowRatio.low)
			return false;
	}
	if (consecutiveCount.enabled) {
		let pairs = 0;
		for (let i = 0; i < set.length - 1; i++) {
			if (set[i + 1] - set[i] === 1) pairs++;
		}
		if (pairs > consecutiveCount.max) return false;
	}
	return true;
}

function toggleNumber(setType: "included" | "excluded", num: number) {
	if (setType === "included") {
		if (includedNumbers.has(num)) {
			// Remove from included
			const newIncluded = new Set(includedNumbers);
			newIncluded.delete(num);
			includedNumbers = newIncluded;
		} else {
			if (includedNumbers.size >= 5) return;
			// Add to included and remove from excluded
			const newIncluded = new Set(includedNumbers);
			const newExcluded = new Set(excludedNumbers);
			newExcluded.delete(num);
			newIncluded.add(num);
			includedNumbers = newIncluded;
			excludedNumbers = newExcluded;
		}
	} else {
		if (excludedNumbers.has(num)) {
			// Remove from excluded
			const newExcluded = new Set(excludedNumbers);
			newExcluded.delete(num);
			excludedNumbers = newExcluded;
		} else {
			// Add to excluded and remove from included
			const newIncluded = new Set(includedNumbers);
			const newExcluded = new Set(excludedNumbers);
			newIncluded.delete(num);
			newExcluded.add(num);
			includedNumbers = newIncluded;
			excludedNumbers = newExcluded;
		}
	}
}

function getNumberColor(n: number): string {
	if (n <= 10) return "bg-yellow-400 text-black";
	if (n <= 20) return "bg-blue-500 text-white";
	if (n <= 30) return "bg-red-500 text-white";
	if (n <= 40) return "bg-gray-500 text-white";
	return "bg-green-500 text-white";
}

// Computed property using $derived
const sortedNumberStats = $derived(
	lottoStats?.numberStats
		? [...lottoStats.numberStats].sort(
				(a, b) => (b.draw_count || 0) - (a.draw_count || 0),
			)
		: [],
);

// Track scroll position for mobile button visibility
let scrollY = $state(0);
let isNearBottom = $state(false);

// Update isNearBottom when scrollY changes
$effect(() => {
	if (typeof window !== "undefined" && document.documentElement) {
		const threshold =
			document.documentElement.scrollHeight - window.innerHeight - 200;
		isNearBottom = scrollY > threshold;
	}
});
</script>

<MetaTags
	title="로또 번호 생성기"
	titleTemplate="%s | 645.live"
	description="🚀 통계 기반 로또번호 생성기! 당첨 확률을 높이는 다양한 필터를 적용하여 나만의 운명 번호를 만들어보세요."
	canonical="https://www.645.live/generator"
	keywords={['로또', '로또번호', '로또생성기', '로또번호생성기', '로또통계', '제외수']}
	openGraph={{
		type: 'website',
		url: 'https://www.645.live/generator',
		title: '통계 기반 로또 번호 생성기',
		description: '🚀 통계 기반으로 당첨 확률을 높이는 나만의 로또 번호를 생성하세요!',
		images: [
			{
				url: `https://www.645.live/og?title=${encodeURIComponent('로또 번호 생성기')}&description=${encodeURIComponent('🚀 통계 기반 스마트 번호 생성 | 다양한 필터로 당신만의 운명 번호 만들기')}&layout=centered&theme=dark`,
				width: 1200,
				height: 630,
				alt: '로또 번호 생성기 OG 이미지'
			}
		],
		siteName: '645.live'
	}}
	twitter={{
		cardType: 'summary_large_image',
		site: '@645live',
		title: '통계 기반 로또 번호 생성기',
		description: '🚀 통계 기반으로 당첨 확률을 높이는 나만의 로또 번호를 생성하세요!',
		image: `https://www.645.live/og?title=${encodeURIComponent('로또 번호 생성기')}&description=${encodeURIComponent('🚀 통계 기반 스마트 번호 생성 | 다양한 필터로 당신만의 운명 번호 만들기')}&layout=centered&theme=dark`,
		imageAlt: '로또 번호 생성기 트위터 이미지'
	}}
/>

<JsonLd
	schema={{
		'@type': 'WebSite',
		url: 'https://www.645.live/generator',
		name: '로또 번호 생성기 | 645.live',
		potentialAction: {
			'@type': 'SearchAction',
			target: 'https://www.645.live/search?q={search_term_string}',
			'query-input': 'required name=search_term_string'
		}
	}}
/>

<div class="container mx-auto max-sm:px-0 p-8">
	<h1 class="text-3xl font-bold mb-4">로또 번호 생성기</h1>
	<p class="mb-8 text-gray-600">
		통계 데이터를 기반으로 다양한 조건을 적용하여 나만의 로또 번호를 생성해보세요.
	</p>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
		<!-- Left Column: Controls -->
		<div class="lg:col-span-2 space-y-4">
			<!-- Basic Settings -->
			<div class="bg-base-100 rounded-lg border border-base-300">
				<div class="p-4">
				<h2 class="text-xl font-semibold mb-4 pb-2">기본 설정</h2>
					<div class="flex items-center space-x-4">
						<label for="num-sets" class="font-medium">생성 개수:</label>
						<input
							type="number"
							id="num-sets"
							bind:value={numberOfSets}
							class="input input-bordered w-24"
							min="1"
							max="100"
						/>
					</div>
				</div>
			</div>

			<!-- Number Selection -->
			<div class="collapse collapse-arrow bg-base-100 border border-base-300">
				<input type="radio" name="generator-accordion" checked />
				<h2 class="collapse-title text-xl font-semibold mb-4 pb-2">번호 선택</h2>
				<div class="collapse-content">
					<div class="space-y-6">
						<div>
							<h3 class="font-medium mb-3">포함할 번호 (최대 5개)</h3>
							<div class="grid grid-cols-9 gap-2">
								{#each Array.from({ length: 45 }, (_, i) => i + 1) as num}
									<button
										onclick={() => toggleNumber('included', num)}
										class="btn btn-sm rounded-full transition-all"
										class:bg-blue-500={includedNumbers.has(num)}
										class:text-white={includedNumbers.has(num)}
										disabled={includedNumbers.size >= 5 && !includedNumbers.has(num)}
									>
										{num}
									</button>
								{/each}
							</div>
						</div>
						<div>
							<h3 class="font-medium mb-3">제외할 번호</h3>
							<div class="grid grid-cols-9 gap-2">
								{#each Array.from({ length: 45 }, (_, i) => i + 1) as num}
									<button
										onclick={() => toggleNumber('excluded', num)}
										class="btn btn-sm rounded-full transition-all"
										class:bg-red-500={excludedNumbers.has(num)}
										class:text-white={excludedNumbers.has(num)}
									>
										{num}
									</button>
								{/each}
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Statistical Filters -->
			<div class="collapse collapse-arrow bg-base-100 border border-base-300">
				<input type="radio" name="generator-accordion" />
				<h2 class="collapse-title text-xl font-semibold mb-4 pb-2">통계 필터</h2>
				<div class="collapse-content">
				<div class="space-y-6">
					<div class="flex flex-col sm:flex-row sm:items-center gap-3">
						<label class="flex items-center gap-2 cursor-pointer">
							<input 
								type="checkbox" 
								id="sum-range-filter"
								bind:checked={sumRange.enabled} 
								class="checkbox" 
							/>
							<span class="font-medium">번호 총합:</span>
						</label>
						<div class="flex items-center gap-2">
							<label for="sum-min" class="sr-only">최소 합계</label>
							<input 
								type="number" 
								id="sum-min"
								bind:value={sumRange.min} 
								class="input input-bordered input-sm w-20" 
								disabled={!sumRange.enabled}
								aria-label="최소 합계"
							/>
							<span>~</span>
							<label for="sum-max" class="sr-only">최대 합계</label>
							<input 
								type="number" 
								id="sum-max"
								bind:value={sumRange.max} 
								class="input input-bordered input-sm w-20" 
								disabled={!sumRange.enabled}
								aria-label="최대 합계"
							/>
						</div>
					</div>
					<div class="flex flex-col sm:flex-row sm:items-center gap-3">
						<label class="flex items-center gap-2 cursor-pointer">
							<input 
								type="checkbox" 
								id="odd-even-filter"
								bind:checked={oddEvenRatio.enabled} 
								class="checkbox" 
							/>
							<span class="font-medium">홀:짝 비율:</span>
						</label>
						<div class="flex items-center gap-2">
							<label for="odd-count" class="sr-only">홀수 개수</label>
							<select 
								class="select select-bordered select-sm w-16" 
								id="odd-count"
								bind:value={oddEvenRatio.odd} 
								disabled={!oddEvenRatio.enabled} 
								onchange={(e) => { oddEvenRatio.even = 6 - Number(e.currentTarget.value); }}
								aria-label="홀수 개수"
							>
								{#each [0, 1, 2, 3, 4, 5, 6] as n}<option value={n}>{n}</option>{/each}
							</select>
							<span>:</span>
							<label for="even-count" class="sr-only">짝수 개수</label>
							<input 
								type="text" 
								id="even-count"
								readonly 
								bind:value={oddEvenRatio.even} 
								class="input input-bordered input-sm w-16"
								aria-label="짝수 개수 (자동 계산)"
							/>
						</div>
					</div>
					<div class="flex flex-col sm:flex-row sm:items-center gap-3">
						<label class="flex items-center gap-2 cursor-pointer">
							<input 
								type="checkbox" 
								id="high-low-filter"
								bind:checked={highLowRatio.enabled} 
								class="checkbox" 
							/>
							<span class="font-medium">고:저 비율:</span>
						</label>
						<div class="flex items-center gap-2">
							<label for="high-count" class="sr-only">고수 개수</label>
							<select 
								class="select select-bordered select-sm w-16" 
								id="high-count"
								bind:value={highLowRatio.high} 
								disabled={!highLowRatio.enabled} 
								onchange={(e) => { highLowRatio.low = 6 - Number(e.currentTarget.value); }}
								aria-label="고수 개수 (23-45)"
							>
								{#each [0, 1, 2, 3, 4, 5, 6] as n}<option value={n}>{n}</option>{/each}
							</select>
							<span>:</span>
							<label for="low-count" class="sr-only">저수 개수</label>
							<input 
								type="text" 
								id="low-count"
								readonly 
								bind:value={highLowRatio.low} 
								class="input input-bordered input-sm w-16"
								aria-label="저수 개수 (1-22, 자동 계산)"
							/>
						</div>
					</div>
					<div class="flex flex-col sm:flex-row sm:items-center gap-3">
						<label class="flex items-center gap-2 cursor-pointer">
							<input 
								type="checkbox" 
								id="consecutive-filter"
								bind:checked={consecutiveCount.enabled} 
								class="checkbox" 
							/>
							<span class="font-medium">최대 연속번호:</span>
						</label>
						<label for="consecutive-max" class="sr-only">최대 연속번호 쌍 개수</label>
						<select 
							class="select select-bordered select-sm w-20" 
							id="consecutive-max"
							bind:value={consecutiveCount.max} 
							disabled={!consecutiveCount.enabled}
							aria-label="허용할 최대 연속번호 쌍 개수"
						>
							<option value={0}>없음</option>
							<option value={1}>1쌍</option>
							<option value={2}>2쌍</option>
						</select>
					</div>
					</div>
				</div>
			</div>

			<!-- Statistics Info -->
			<div class="collapse collapse-arrow bg-base-100 border border-base-300">
				<input type="radio" name="generator-accordion" />
				<h2 class="collapse-title text-xl font-semibold mb-4 pb-2">번호별 출현 통계</h2>
				<div class="collapse-content">
				{#if isLoadingStats}
					<p class="text-gray-500">통계 데이터 로딩 중...</p>
				{:else if sortedNumberStats.length > 0}
					<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
						{#each sortedNumberStats as stat}
							<a 
								href="/stats/numbers/{stat.number}" 
								class="flex items-center justify-between p-2 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors group"
							>
								<div class="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs {getNumberColor(stat.number)} group-hover:scale-110 transition-transform">
									{stat.number}
								</div>
								<span class="font-mono text-gray-700 group-hover:text-gray-900">{stat.draw_count}회</span>
							</a>
						{/each}
					</div>
						<p class="text-xs text-gray-400 mt-4">가장 많이 나온 번호 순으로 정렬되었습니다. 번호를 클릭하면 상세 통계를 볼 수 있습니다.</p>
					{:else}
						<p class="text-red-500">통계 데이터를 불러오지 못했습니다.</p>
					{/if}
					</div>
				</div>
			</div>


		<!-- Right Column: Results -->
			<div id="results-section" class="bg-white p-6 rounded-lg shadow h-fit sticky top-8">
				<h2 class="text-xl font-semibold mb-4 pb-2">생성된 번호</h2>
				{#if error && !isLoading}
					<div class="alert alert-error"><span>{error}</span></div>
				{/if}
				<div class="space-y-3 mt-4 mb-6">
					{#if generatedLottoSets.length > 0}
						{#each generatedLottoSets as set, i}
							<div class="flex items-center gap-1 p-2 pl-1 rounded-lg hover:bg-gray-50 border border-gray-100">
								<span class="font-bold text-gray-500 w-6 text-center flex-shrink-0 text-sm">{i + 1}.</span>
								<div class="flex flex-wrap gap-1 sm:gap-2">
									{#each set as num}
										<div class="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm {getNumberColor(num)} flex-shrink-0">
											{num}
										</div>
									{/each}
								</div>
							</div>
						{/each}
					{:else}
						<p class="text-gray-500 text-center py-8">생성 버튼을 눌러 번호를 받아보세요.</p>
					{/if}
				</div>
				
				<!-- Generation Button -->
				<div class="border-t pt-4">
					<button 
						class="btn btn-primary btn-block" 
						onclick={() => generateNumbers()}
						disabled={isLoading || isLoadingStats}
					>
						{#if isLoading} 
							<span class="loading loading-spinner"></span> 생성 중... 
						{:else if isLoadingStats} 
							<span class="loading loading-spinner"></span> 데이터 로딩중 
						{:else} 
							번호 생성하기 
						{/if}
					</button>
				</div>
			</div>
		</div>

		
		<!-- Mobile Fixed Generate Button - hidden when near bottom -->
		{#if !isNearBottom}
			<div class="lg:hidden fixed bottom-4 left-4 right-4 z-50">
				<button 
					class="btn btn-primary btn-block btn-lg shadow-lg" 
					onclick={() => generateNumbersAndScroll()}
					disabled={isLoading || isLoadingStats}
				>
					{#if isLoading} 
						<span class="loading loading-spinner"></span> 생성 중... 
					{:else if isLoadingStats} 
						<span class="loading loading-spinner"></span> 데이터 로딩중 
					{:else} 
						번호 생성하기 
					{/if}
				</button>
			</div>
		{/if}
	</div>

