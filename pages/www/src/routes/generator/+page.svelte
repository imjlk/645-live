<script lang="ts">
import { env } from "$env/dynamic/public";
import { onMount } from "svelte";
import { JsonLd, MetaTags } from "svelte-meta-tags";
import { writable } from "svelte/store";
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

// --- Trailbase Client and Data Stores ---
const client = initClient(env.PUBLIC_TRAILBASE_URL || "http://localhost:4000");
const lottoStats = writable<LottoStats | null>(null);
const numberOfSets = writable(5);
const includedNumbers = writable<Set<number>>(new Set());
const excludedNumbers = writable<Set<number>>(new Set());
const generatedLottoSets = writable<number[][]>([]);
const isLoading = writable(false);
const isLoadingStats = writable(true);
const error = writable<string | null>(null);

// --- Statistical Filter Stores ---
const sumRange = writable({ min: 100, max: 180, enabled: false });
const oddEvenRatio = writable({ odd: 3, even: 3, enabled: false });
const highLowRatio = writable({ high: 3, low: 3, enabled: false });
const consecutiveCount = writable({ max: 1, enabled: false });

onMount(async () => {
	isLoadingStats.set(true);
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

		lottoStats.set({
			numberStats: numStats.records as unknown as NumberStat[],
			oddEvenStats: oeStats.records as unknown as OddEvenStat[],
			colorStats: colStats.records as unknown as ColorStat[],
			sectionStats: secStats.records as unknown as SectionStat[],
			consecutiveStats: consStats.records as unknown as ConsecutiveStat[],
			highLowStats: hlStats.records as unknown as HighLowStat[],
		});
	} catch (e: unknown) {
		const errorMessage = e instanceof Error ? e.message : String(e);
		error.set(`통계 데이터 로딩 실패: ${errorMessage}`);
		console.error(e);
	} finally {
		isLoadingStats.set(false);
	}
});

// --- Lotto Number Generation Logic ---
async function generateNumbers() {
	isLoading.set(true);
	error.set(null);
	generatedLottoSets.set([]);

	try {
		const sets: number[][] = [];
		const maxAttempts = 30000;

		for (let i = 0; i < $numberOfSets; i++) {
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
		generatedLottoSets.set(sets);
	} catch (e: unknown) {
		const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
		error.set(errorMessage);
	} finally {
		isLoading.set(false);
	}
}

function generateSingleCandidate(): number[] {
	const include = Array.from($includedNumbers);
	const exclude = Array.from($excludedNumbers);
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
	if ($sumRange.enabled) {
		const sum = set.reduce((a, b) => a + b, 0);
		if (sum < $sumRange.min || sum > $sumRange.max) return false;
	}
	if ($oddEvenRatio.enabled) {
		const oddCount = set.filter((n) => n % 2 !== 0).length;
		const evenCount = 6 - oddCount;
		if (oddCount !== $oddEvenRatio.odd || evenCount !== $oddEvenRatio.even)
			return false;
	}
	if ($highLowRatio.enabled) {
		const highCount = set.filter((n) => n >= 23).length;
		const lowCount = 6 - highCount;
		if (highCount !== $highLowRatio.high || lowCount !== $highLowRatio.low)
			return false;
	}
	if ($consecutiveCount.enabled) {
		let pairs = 0;
		for (let i = 0; i < set.length - 1; i++) {
			if (set[i + 1] - set[i] === 1) pairs++;
		}
		if (pairs > $consecutiveCount.max) return false;
	}
	return true;
}

function toggleNumber(
	store: typeof includedNumbers | typeof excludedNumbers,
	num: number,
) {
	store.update((set) => {
		if (set.has(num)) {
			set.delete(num);
		} else {
			if (store === includedNumbers) {
				if (set.size >= 5) return set;
				excludedNumbers.update((s) => {
					s.delete(num);
					return s;
				});
			} else {
				includedNumbers.update((s) => {
					s.delete(num);
					return s;
				});
			}
			set.add(num);
		}
		return set;
	});
}

function getNumberColor(n: number): string {
	if (n <= 10) return "bg-yellow-400 text-black";
	if (n <= 20) return "bg-blue-500 text-white";
	if (n <= 30) return "bg-red-500 text-white";
	if (n <= 40) return "bg-gray-500 text-white";
	return "bg-green-500 text-white";
}

$: sortedNumberStats = $lottoStats?.numberStats
	? [...$lottoStats.numberStats].sort(
			(a, b) => (b.draw_count || 0) - (a.draw_count || 0),
		)
	: [];
</script>

<MetaTags
	title="로또 번호 생성기"
	titleTemplate="%s | 645.live"
	description="통계 기반 로또 번호 생성기. 제외수, 포함수, 홀짝, 고저, 총합, 연속번호 등 다양한 필터를 적용하여 나만의 로또 번호를 만들어보세요."
	canonical="https://645.live/lotto/generator"
	keywords={['로또', '로또번호', '로또생성기', '로또번호생성기', '로또통계', '제외수']}
	openGraph={{
		type: 'website',
		url: 'https://645.live/lotto/generator',
		title: '통계 기반 로또 번호 생성기',
		description: '다양한 통계 필터를 적용하여 나만의 로또 번호를 생성하세요.',
		images: [
			{
				url: 'https://645.live/images/og-lotto-generator.png',
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
		description: '다양한 통계 필터를 적용하여 나만의 로또 번호를 생성하세요.',
		image: 'https://645.live/images/twitter-lotto-generator.png',
		imageAlt: '로또 번호 생성기 트위터 이미지'
	}}
/>

<JsonLd
	schema={{
		'@type': 'WebSite',
		url: 'https://645.live/lotto/generator',
		name: '로또 번호 생성기 | 645.live',
		potentialAction: {
			'@type': 'SearchAction',
			target: 'https://645.live/search?q={search_term_string}',
			'query-input': 'required name=search_term_string'
		}
	}}
/>

<div class="container mx-auto p-4 md:p-8">
	<h1 class="text-3xl font-bold mb-4">로또 번호 생성기</h1>
	<p class="mb-8 text-gray-600">
		통계 데이터를 기반으로 다양한 조건을 적용하여 나만의 로또 번호를 생성해보세요.
	</p>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
		<!-- Left Column: Controls -->
		<div class="lg:col-span-2 space-y-8">
			<!-- Basic Settings -->
			<div class="bg-white p-6 rounded-lg shadow">
				<h2 class="text-xl font-semibold mb-4 border-b pb-2">기본 설정</h2>
				<div class="flex items-center space-x-4">
					<label for="num-sets" class="font-medium">생성 개수:</label>
					<input
						type="number"
						id="num-sets"
						bind:value={$numberOfSets}
						class="input input-bordered w-24"
						min="1"
						max="100"
					/>
				</div>
			</div>

			<!-- Number Selection -->
			<div class="bg-white p-6 rounded-lg shadow">
				<h2 class="text-xl font-semibold mb-4 border-b pb-2">번호 선택</h2>
				<div class="mb-4">
					<h3 class="font-medium mb-2">포함할 번호 (최대 5개)</h3>
					<div class="grid grid-cols-9 gap-2">
						{#each Array.from({ length: 45 }, (_, i) => i + 1) as num}
							<button
								on:click={() => toggleNumber(includedNumbers, num)}
								class="btn btn-sm rounded-full transition-all"
								class:bg-blue-500={$includedNumbers.has(num)}
								class:text-white={$includedNumbers.has(num)}
								disabled={$includedNumbers.size >= 5 && !$includedNumbers.has(num)}
							>
								{num}
							</button>
						{/each}
					</div>
				</div>
				<div>
					<h3 class="font-medium mb-2">제외할 번호</h3>
					<div class="grid grid-cols-9 gap-2">
						{#each Array.from({ length: 45 }, (_, i) => i + 1) as num}
							<button
								on:click={() => toggleNumber(excludedNumbers, num)}
								class="btn btn-sm rounded-full transition-all"
								class:bg-red-500={$excludedNumbers.has(num)}
								class:text-white={$excludedNumbers.has(num)}
							>
								{num}
							</button>
						{/each}
					</div>
				</div>
			</div>

			<!-- Statistical Filters -->
			<div class="bg-white p-6 rounded-lg shadow">
				<h2 class="text-xl font-semibold mb-4 border-b pb-2">통계 필터</h2>
				<div class="space-y-6">
					<div class="flex items-center space-x-4">
						<input type="checkbox" bind:checked={$sumRange.enabled} class="checkbox" />
						<span class="font-medium w-32">번호 총합:</span>
						<input type="number" bind:value={$sumRange.min} class="input input-bordered w-24" disabled={!$sumRange.enabled} />
						<span>~</span>
						<input type="number" bind:value={$sumRange.max} class="input input-bordered w-24" disabled={!$sumRange.enabled} />
					</div>
					<div class="flex items-center space-x-4">
						<input type="checkbox" bind:checked={$oddEvenRatio.enabled} class="checkbox" />
						<span class="font-medium w-32">홀:짝 비율:</span>
						<select class="select select-bordered" bind:value={$oddEvenRatio.odd} disabled={!$oddEvenRatio.enabled} on:change={(e) => oddEvenRatio.update((v) => ({ ...v, even: 6 - Number(e.currentTarget.value) }))}>
							{#each [0, 1, 2, 3, 4, 5, 6] as n}<option value={n}>{n}</option>{/each}
						</select>
						<span>:</span>
						<input type="text" readonly bind:value={$oddEvenRatio.even} class="input input-bordered w-16" />
					</div>
					<div class="flex items-center space-x-4">
						<input type="checkbox" bind:checked={$highLowRatio.enabled} class="checkbox" />
						<span class="font-medium w-32">고:저 비율:</span>
						<select class="select select-bordered" bind:value={$highLowRatio.high} disabled={!$highLowRatio.enabled} on:change={(e) => highLowRatio.update((v) => ({ ...v, low: 6 - Number(e.currentTarget.value) }))}>
							{#each [0, 1, 2, 3, 4, 5, 6] as n}<option value={n}>{n}</option>{/each}
						</select>
						<span>:</span>
						<input type="text" readonly bind:value={$highLowRatio.low} class="input input-bordered w-16" />
					</div>
					<div class="flex items-center space-x-4">
						<input type="checkbox" bind:checked={$consecutiveCount.enabled} class="checkbox" />
						<span class="font-medium w-32">최대 연속번호:</span>
						<select class="select select-bordered" bind:value={$consecutiveCount.max} disabled={!$consecutiveCount.enabled}>
							<option value={0}>없음</option>
							<option value={1}>1쌍</option>
							<option value={2}>2쌍</option>
						</select>
					</div>
				</div>
			</div>

			<!-- Statistics Info -->
			<div class="bg-white p-6 rounded-lg shadow">
				<h2 class="text-xl font-semibold mb-4 border-b pb-2">번호별 출현 통계</h2>
				{#if $isLoadingStats}
					<p class="text-gray-500">통계 데이터 로딩 중...</p>
				{:else if sortedNumberStats.length > 0}
					<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
						{#each sortedNumberStats as stat}
							<div class="flex items-center justify-between p-2 rounded-md bg-gray-50">
								<div class="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs {getNumberColor(stat.number)}">
									{stat.number}
								</div>
								<span class="font-mono text-gray-700">{stat.draw_count}회</span>
							</div>
						{/each}
					</div>
					<p class="text-xs text-gray-400 mt-4">가장 많이 나온 번호 순으로 정렬되었습니다.</p>
				{:else}
					<p class="text-red-500">통계 데이터를 불러오지 못했습니다.</p>
				{/if}
			</div>

			<!-- Generation Button -->
			<div class="text-center mt-8">
				<button class="btn btn-primary btn-lg" on:click={generateNumbers} disabled={$isLoading || $isLoadingStats}>
					{#if $isLoading} <span class="loading loading-spinner"></span> 생성 중... {:else if $isLoadingStats} <span class="loading loading-spinner"></span> 데이터 로딩중 {:else} 번호 생성하기 {/if}
				</button>
			</div>
		</div>

		<!-- Right Column: Results -->
		<div class="bg-white p-6 rounded-lg shadow h-fit sticky top-8">
			<h2 class="text-xl font-semibold mb-4 border-b pb-2">생성된 번호</h2>
			{#if $error && !$isLoading}
				<div class="alert alert-error"><span>{$error}</span></div>
			{/if}
			<div class="space-y-4 mt-4">
				{#if $generatedLottoSets.length > 0}
					{#each $generatedLottoSets as set, i}
						<div class="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50">
							<span class="font-bold text-gray-500 w-8 text-center">{i + 1}.</span>
							<div class="flex space-x-1">
								{#each set as num}
									<div class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm {getNumberColor(num)}">
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
		</div>
	</div>
</div>
