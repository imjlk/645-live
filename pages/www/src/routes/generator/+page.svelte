<script lang="ts">
import { tick } from "svelte";
import { JsonLd, MetaTags } from "svelte-meta-tags";
import { initClient } from "trailbase";
import { resolve } from "$app/paths";
import AdSlot from "$lib/components/ads/AdSlot.svelte";
import SimpleBall from "$lib/components/SimpleBall.svelte";
import {
	absoluteUrl,
	getGenericOgImage,
	SITE_NAME,
	SITE_ORIGIN,
} from "$lib/seo/index.js";
import { getTrailbaseBrowserBaseUrl } from "$lib/trailbase/browser-base";
import { trackEvent } from "$lib/utils/analytics";

interface NumberStat {
	number: number;
	draw_count: number;
}
let numberOfSets = $state(5);
let includedNumbers = $state<Set<number>>(new Set());
let excludedNumbers = $state<Set<number>>(new Set());
let generatedLottoSets = $state<number[][]>([]);
let isLoading = $state(false);
let error = $state("");
let copyMessage = $state("");
let generatedConditions = $state("");
let numberStats = $state<NumberStat[]>([]);
let isLoadingStats = $state(false);
let statsError = $state("");
let statsLoaded = false;
let sumRange = $state({ min: 100, max: 180, enabled: false });
let oddEvenRatio = $state({ odd: 3, even: 3, enabled: false });
let highLowRatio = $state({ high: 3, low: 3, enabled: false });
let consecutiveCount = $state({ max: 1, enabled: false });
const allNumbers = Array.from({ length: 45 }, (_, index) => index + 1);
const filterCount = $derived(
	[
		sumRange.enabled,
		oddEvenRatio.enabled,
		highLowRatio.enabled,
		consecutiveCount.enabled,
	].filter(Boolean).length,
);
const currentConditions = $derived(
	JSON.stringify({
		count: numberOfSets,
		included: [...includedNumbers],
		excluded: [...excludedNumbers],
		sumRange,
		oddEvenRatio,
		highLowRatio,
		consecutiveCount,
	}),
);
const resultsNeedUpdate = $derived(
	generatedLottoSets.length > 0 && generatedConditions !== currentConditions,
);
const sortedNumberStats = $derived(
	[...numberStats].sort((a, b) => b.draw_count - a.draw_count),
);

async function loadNumberStats() {
	if (statsLoaded || isLoadingStats) return;
	isLoadingStats = true;
	statsError = "";
	try {
		const response = await initClient(getTrailbaseBrowserBaseUrl())
			.records("lotto_number_stats")
			.list({ pagination: { limit: 100 } });
		numberStats = response.records as unknown as NumberStat[];
		statsLoaded = true;
	} catch {
		statsError =
			"출현 통계를 불러오지 못했어요. 번호 생성은 계속 사용할 수 있습니다.";
	} finally {
		isLoadingStats = false;
	}
}

function validateConditions() {
	if (!Number.isInteger(numberOfSets) || numberOfSets < 1 || numberOfSets > 100)
		throw new Error("생성할 게임 수를 1~100 사이의 정수로 입력해주세요.");
	const included = [...includedNumbers];
	const available = allNumbers.filter(
		(number) => !excludedNumbers.has(number) && !includedNumbers.has(number),
	);
	const remaining = 6 - included.length;
	if (available.length < remaining)
		throw new Error("번호가 최소 6개 남도록 제외할 번호를 줄여주세요.");
	if (sumRange.enabled) {
		if (
			!Number.isInteger(sumRange.min) ||
			!Number.isInteger(sumRange.max) ||
			sumRange.min > sumRange.max
		)
			throw new Error("번호 합계의 최솟값과 최댓값을 올바르게 입력해주세요.");
		const fixedSum = included.reduce((sum, number) => sum + number, 0);
		const lowestSum =
			fixedSum +
			available.slice(0, remaining).reduce((sum, number) => sum + number, 0);
		const highestSum =
			fixedSum +
			available.slice(-remaining).reduce((sum, number) => sum + number, 0);
		if (sumRange.max < lowestSum || sumRange.min > highestSum)
			throw new Error(
				`선택한 번호의 가능한 합계는 ${lowestSum}~${highestSum}입니다. 합계 조건을 넓혀주세요.`,
			);
	}
	for (const condition of [
		{
			enabled: oddEvenRatio.enabled,
			target: oddEvenRatio.odd,
			predicate: (number: number) => number % 2 === 1,
			name: "홀짝",
		},
		{
			enabled: highLowRatio.enabled,
			target: highLowRatio.high,
			predicate: (number: number) => number >= 23,
			name: "고저",
		},
	]) {
		if (!condition.enabled) continue;
		const fixed = included.filter(condition.predicate).length;
		const needed = condition.target - fixed;
		if (
			needed < 0 ||
			needed > remaining ||
			available.filter(condition.predicate).length < needed ||
			available.filter((number) => !condition.predicate(number)).length <
				remaining - needed
		)
			throw new Error(
				`선택한 번호로는 ${condition.name} 비율을 맞출 수 없어요. 포함·제외 번호나 비율을 변경해주세요.`,
			);
	}
	if (consecutiveCount.enabled) {
		const sorted = included.sort((a, b) => a - b);
		const pairs = sorted.filter(
			(number, index) => index > 0 && number - sorted[index - 1] === 1,
		).length;
		if (pairs > consecutiveCount.max)
			throw new Error(
				"포함한 번호에 연속번호가 너무 많아요. 연속번호 허용 개수를 늘려주세요.",
			);
	}
	return { included, available };
}

function isValid(numbers: number[]): boolean {
	if (sumRange.enabled) {
		const sum = numbers.reduce((a, b) => a + b, 0);
		if (sum < sumRange.min || sum > sumRange.max) return false;
	}
	if (
		oddEvenRatio.enabled &&
		numbers.filter((number) => number % 2 === 1).length !== oddEvenRatio.odd
	)
		return false;
	if (
		highLowRatio.enabled &&
		numbers.filter((number) => number >= 23).length !== highLowRatio.high
	)
		return false;
	if (
		consecutiveCount.enabled &&
		numbers.filter(
			(number, index) => index > 0 && number - numbers[index - 1] === 1,
		).length > consecutiveCount.max
	)
		return false;
	return true;
}

async function generateNumbers() {
	if (isLoading) return;
	error = "";
	copyMessage = "";
	try {
		const { included, available } = validateConditions();
		isLoading = true;
		await tick();
		await new Promise<void>((done) => setTimeout(done, 0));
		const startedAt = performance.now();
		const sets: number[][] = [];
		let attempts = 0;
		// Keep rare/impossible combinations from monopolizing the main thread.
		while (sets.length < numberOfSets) {
			const pool = [...available];
			const candidate = [...included];
			while (candidate.length < 6)
				candidate.push(
					pool.splice(Math.floor(Math.random() * pool.length), 1)[0],
				);
			candidate.sort((a, b) => a - b);
			if (isValid(candidate)) sets.push(candidate);
			attempts++;
			if (attempts % 250 === 0) {
				if (performance.now() - startedAt > 2000 || attempts >= 100000)
					throw new Error(
						"조건에 맞는 조합을 충분히 찾지 못했어요. 필터를 줄이거나 범위를 넓혀 다시 생성해주세요.",
					);
				await new Promise<void>((done) => setTimeout(done, 0));
			}
		}
		generatedLottoSets = sets;
		generatedConditions = currentConditions;
		trackEvent("generate_complete", {
			count: sets.length,
			filter_count: filterCount,
			included_count: includedNumbers.size,
			excluded_count: excludedNumbers.size,
		});
	} catch (caught) {
		error =
			caught instanceof Error
				? caught.message
				: "번호를 생성하지 못했어요. 다시 시도해주세요.";
	} finally {
		isLoading = false;
	}
}

function toggleNumber(type: "included" | "excluded", number: number) {
	const included = new Set(includedNumbers);
	const excluded = new Set(excludedNumbers);
	if (type === "included") {
		if (included.has(number)) included.delete(number);
		else if (included.size < 5) {
			included.add(number);
			excluded.delete(number);
		}
	} else {
		if (excluded.has(number)) excluded.delete(number);
		else if (excluded.size < 39) {
			excluded.add(number);
			included.delete(number);
		}
	}
	includedNumbers = included;
	excludedNumbers = excluded;
}

function resetConditions() {
	includedNumbers = new Set();
	excludedNumbers = new Set();
	sumRange.enabled = false;
	oddEvenRatio.enabled = false;
	highLowRatio.enabled = false;
	consecutiveCount.enabled = false;
	error = "";
}

async function copyResults() {
	try {
		await navigator.clipboard.writeText(
			generatedLottoSets
				.map((numbers, index) => `${index + 1}. ${numbers.join(", ")}`)
				.join("\n"),
		);
		copyMessage = "번호를 복사했어요.";
	} catch {
		copyMessage =
			"복사 권한을 사용할 수 없어요. 번호를 직접 선택해 복사해주세요.";
	}
}

const pageTitle = "조건에 맞는 로또 번호 생성기";
const pageDescription =
	"로또 6/45 번호 조합을 원하는 조건에 맞춰 만들어보세요. 포함할 번호와 제외할 번호, 홀짝 비율, 번호 합계, 고저 비율과 연속번호 조건을 설정할 수 있습니다. 생성 결과는 조건에 맞는 무작위 조합이며 복사해 보관할 수 있습니다.";
const ogImage = getGenericOgImage({
	title: pageTitle,
	description: "포함·제외 번호와 조건을 정해 만드는 무작위 조합",
	layout: "blog",
	theme: "dark",
});
</script>

<MetaTags title={pageTitle} titleTemplate="%s | 645.live" description={pageDescription} canonical={absoluteUrl("/generator")}
	openGraph={{ type: "website", url: absoluteUrl("/generator"), title: pageTitle, description: pageDescription, images: [ogImage], siteName: SITE_NAME }}
	twitter={{ cardType: "summary_large_image", title: pageTitle, description: pageDescription, image: ogImage.url, imageAlt: ogImage.alt }} />
<JsonLd schema={{ "@context": "https://schema.org", "@type": "WebApplication", name: pageTitle, url: absoluteUrl("/generator"), description: pageDescription, applicationCategory: "UtilitiesApplication", operatingSystem: "Web Browser", isAccessibleForFree: true, publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_ORIGIN } }} />

<div class="content-page generator-page">
	<header class="page-header"><div><h1>로또 번호 만들기</h1><p>바로 생성하거나, 원하는 번호와 조건을 먼저 선택하세요.</p></div></header>
	<div class="generator-workspace">
		<section class="generation-area" aria-labelledby="generation-heading">
			<h2 id="generation-heading" class="sr-only">게임 수 선택과 번호 생성</h2>
			<div class="generate-controls">
				<label for="num-sets">게임 수<input type="number" id="num-sets" bind:value={numberOfSets} class="input" min="1" max="100" disabled={isLoading} /></label>
				<button class="btn btn-primary generate-button" onclick={generateNumbers} disabled={isLoading}>{#if isLoading}<span class="loading loading-spinner loading-sm"></span>생성 중…{:else}{generatedLottoSets.length ? "다시 생성하기" : "번호 생성하기"}{/if}</button>
			</div>
			<p class="conditions-summary">포함 {includedNumbers.size}개 · 제외 {excludedNumbers.size}개 · 조건 {filterCount}개</p>
			{#if error}<div class="alert alert-error mt-4" role="alert">{error}</div>{/if}
			<section id="results-section" class="results-section" aria-labelledby="results-heading" aria-busy={isLoading}>
				<div class="results-title"><h2 id="results-heading">{generatedLottoSets.length ? `생성한 번호 ${generatedLottoSets.length}게임` : "생성한 번호"}</h2>{#if generatedLottoSets.length}<button class="btn btn-ghost btn-sm" onclick={copyResults}>전체 복사</button>{/if}</div>
				{#if generatedLottoSets.length}
					{#if resultsNeedUpdate}<p class="help-text" role="status">조건이 바뀌었어요. 다시 생성하면 새 조건이 반영됩니다.</p>{/if}
					<ol class="result-list">{#each generatedLottoSets as numbers, index (`${index}-${numbers.join("-")}`)}<li><span class="game-index">{String(index + 1).padStart(2, "0")}</span><div class="result-balls">{#each numbers as number (number)}<SimpleBall {number} size="sm" />{/each}</div></li>{/each}</ol>
				{:else}<div class="empty-results"><span class="empty-mark" aria-hidden="true">6 / 45</span><p>생성 버튼을 누르면 6개 번호가 한 게임으로 표시됩니다.</p></div>{/if}
				<p class="sr-only" aria-live="polite">{generatedLottoSets.length ? `${generatedLottoSets.length}게임 생성 완료` : ""}</p>
				{#if copyMessage}<p class="copy-message" role="status">{copyMessage}</p>{/if}
			</section>
			<p class="probability-note">조건을 적용해도 각 조합의 당첨 확률은 같아요. 생성 결과는 예측이 아닌 무작위 조합입니다.</p>
		</section>
		<section class="conditions-area" aria-labelledby="conditions-heading">
			<div class="conditions-title"><h2 id="conditions-heading">원하는 조건 설정</h2><button class="btn btn-ghost btn-sm" onclick={resetConditions} disabled={isLoading}>초기화</button></div>
			<fieldset disabled={isLoading}>
				<legend class="sr-only">포함·제외 번호와 조합 조건</legend>
				<details class="condition-details"><summary>포함·제외 번호 <span>{includedNumbers.size + excludedNumbers.size ? `${includedNumbers.size + excludedNumbers.size}개 선택` : "선택 사항"}</span></summary><div class="details-body">
					<h3>꼭 넣을 번호 <span>최대 5개</span></h3><div class="number-grid">{#each allNumbers as number (number)}<button class="number-button" class:chosen={includedNumbers.has(number)} aria-pressed={includedNumbers.has(number)} aria-label={`${number}번 포함`} disabled={includedNumbers.size >= 5 && !includedNumbers.has(number)} onclick={() => toggleNumber("included", number)}>{number}</button>{/each}</div>
					<h3>빼고 싶은 번호 <span>최대 39개</span></h3><div class="number-grid">{#each allNumbers as number (number)}<button class="number-button" class:excluded={excludedNumbers.has(number)} aria-pressed={excludedNumbers.has(number)} aria-label={`${number}번 제외`} disabled={excludedNumbers.size >= 39 && !excludedNumbers.has(number)} onclick={() => toggleNumber("excluded", number)}>{number}</button>{/each}</div>
				</div></details>
				<details class="condition-details"><summary>번호 조합 조건 <span>{filterCount ? `${filterCount}개 적용` : "선택 사항"}</span></summary><div class="details-body filter-options">
					<div class="filter-row"><label class="filter-toggle" for="sum-range-filter"><input type="checkbox" id="sum-range-filter" class="checkbox checkbox-sm" bind:checked={sumRange.enabled} />번호 합계</label><div class="filter-inputs"><input type="number" id="sum-min" aria-label="최소 합계" class="input" bind:value={sumRange.min} disabled={!sumRange.enabled} /><span>~</span><input type="number" id="sum-max" aria-label="최대 합계" class="input" bind:value={sumRange.max} disabled={!sumRange.enabled} /></div></div>
					<div class="filter-row"><label class="filter-toggle" for="odd-even-filter"><input type="checkbox" id="odd-even-filter" class="checkbox checkbox-sm" bind:checked={oddEvenRatio.enabled} />홀수 : 짝수</label><div class="filter-inputs"><select id="odd-count" aria-label="홀수 개수" class="select" bind:value={oddEvenRatio.odd} onchange={(event) => { oddEvenRatio.even = 6 - Number(event.currentTarget.value); }} disabled={!oddEvenRatio.enabled}>{#each [0,1,2,3,4,5,6] as n (n)}<option value={n}>{n}</option>{/each}</select><span>:</span><output for="odd-count">{oddEvenRatio.even}</output></div></div>
					<div class="filter-row"><label class="filter-toggle" for="high-low-filter"><input type="checkbox" id="high-low-filter" class="checkbox checkbox-sm" bind:checked={highLowRatio.enabled} />고수 : 저수</label><div class="filter-inputs"><select id="high-count" aria-label="고수 23~45번 개수" class="select" bind:value={highLowRatio.high} onchange={(event) => { highLowRatio.low = 6 - Number(event.currentTarget.value); }} disabled={!highLowRatio.enabled}>{#each [0,1,2,3,4,5,6] as n (n)}<option value={n}>{n}</option>{/each}</select><span>:</span><output for="high-count">{highLowRatio.low}</output></div><p>저수 1~22번 · 고수 23~45번</p></div>
					<div class="filter-row"><label class="filter-toggle" for="consecutive-filter"><input type="checkbox" id="consecutive-filter" class="checkbox checkbox-sm" bind:checked={consecutiveCount.enabled} />연속번호</label><div class="filter-inputs"><select id="consecutive-max" aria-label="허용할 최대 연속번호 쌍 개수" class="select consecutive-select" bind:value={consecutiveCount.max} disabled={!consecutiveCount.enabled}><option value={0}>허용 안 함</option><option value={1}>최대 1쌍</option><option value={2}>최대 2쌍</option></select></div><p>예: 1·2·3은 연속번호 2쌍으로 계산합니다.</p></div>
				</div></details>
			</fieldset>
			<details class="condition-details" ontoggle={(event) => { if (event.currentTarget.open) void loadNumberStats(); }}><summary>번호별 출현 통계 <span>참고용</span></summary><div class="details-body">
				{#if isLoadingStats}<p role="status">통계를 불러오는 중…</p>{:else if statsError}<p>{statsError}</p><button class="btn btn-outline btn-sm mt-3" onclick={loadNumberStats}>다시 불러오기</button>{:else}<div class="frequency-list">{#each sortedNumberStats as stat (stat.number)}<a href={resolve(`/stats/numbers/${stat.number}`)}><span>{stat.number}번</span><strong>{stat.draw_count.toLocaleString()}회</strong></a>{/each}</div>{/if}
				<p class="help-text">과거 출현 횟수 순입니다. 이 수치는 번호 생성에 가중치로 사용되지 않습니다.</p>
			</div></details>
		</section>
	</div>
	{#if generatedLottoSets.length}<AdSlot placement="generator-inline" format="horizontal" />{/if}
	<section class="generator-guide" aria-labelledby="guide-heading"><div><h2 id="guide-heading">조건은 이렇게 적용돼요</h2><p>포함한 번호를 고정하고 제외한 번호를 뺀 뒤, 나머지를 무작위로 뽑습니다. 켜둔 모든 조건을 만족하는 조합만 보여줍니다. 같은 조합이 여러 번 나올 수도 있습니다.</p><p>조건이 서로 맞지 않거나 너무 좁으면 생성되지 않을 수 있어요. 포함·제외 번호나 비율을 조정해 다시 시도해주세요.</p></div><a href={resolve("/qr-scan")} class="guide-link"><span>구매한 용지가 있다면</span><strong>QR로 당첨 확인 <span aria-hidden="true">→</span></strong></a></section>
</div>

<style>
.page-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
.btn, .input, .select { min-height: 2.75rem; }
.generator-workspace { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--section-space); }
.generation-area, .conditions-area { min-width: 0; }
.generate-controls { display: flex; align-items: flex-end; gap: .75rem; }
.generate-controls label { display: flex; flex-direction: column; gap: .5rem; font-size: .8rem; font-weight: 600; }
.generate-controls input { width: 6rem; }
.generate-button { flex: 1; min-height: 3rem; }
.conditions-summary { font-size: .8rem; margin-top: .75rem; color: color-mix(in oklch, var(--color-base-content) 65%, transparent); }
.results-section { margin-top: 1.5rem; padding: 1.25rem 0; border-block: 1px solid var(--color-base-300); }
.results-title, .conditions-title { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .75rem; min-height: 2.75rem; }
.results-title h2, .conditions-title h2, .generator-guide h2 { font-size: var(--section-title-size); font-weight: 700; }
.result-list { max-height: 36rem; overflow: auto; list-style: none; padding: 0; margin-top: .75rem; }
.result-list li { display: flex; align-items: center; gap: .85rem; padding-block: .9rem; border-bottom: 1px solid var(--color-base-300); animation: result-in .18s ease-out; }
.result-list li:last-child { border-bottom: 0; }
.game-index { font-size: .75rem; font-variant-numeric: tabular-nums; color: color-mix(in oklch, var(--color-base-content) 55%, transparent); width: 1.1rem; }
.result-balls { display: flex; gap: clamp(.45rem, 1.5vw, .85rem); }
.empty-results { padding: 1.7rem .5rem; text-align: center; }
.empty-mark { font-size: 2rem; font-weight: 750; letter-spacing: -.06em; color: color-mix(in oklch, var(--color-base-content) 18%, transparent); }
.empty-results p, .probability-note, .copy-message, .help-text { font-size: .8rem; line-height: 1.7; color: color-mix(in oklch, var(--color-base-content) 65%, transparent); }
.empty-results p { max-width: 18rem; margin: .75rem auto 0; }
.probability-note { margin-top: 1rem; }
.copy-message { color: var(--color-primary); }
.condition-details { border-bottom: 1px solid var(--color-base-300); }
.condition-details summary { display: flex; align-items: center; gap: .75rem; min-height: 3.5rem; padding: .75rem 0; font-size: .9rem; font-weight: 600; cursor: pointer; list-style: none; }
.condition-details summary::-webkit-details-marker { display: none; }
.condition-details summary::after { content: "+"; font-size: 1.2rem; font-weight: 400; }
.condition-details[open] summary::after { content: "−"; }
.condition-details summary > span { margin-left: auto; font-size: .75rem; font-weight: 400; color: color-mix(in oklch, var(--color-base-content) 60%, transparent); }
.details-body { padding: .25rem 0 1.5rem; }
.details-body h3 { font-size: .8rem; font-weight: 650; margin: .75rem 0; }
.details-body h3 > span { font-weight: 400; margin-left: .5rem; color: color-mix(in oklch, var(--color-base-content) 60%, transparent); }
.number-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .3rem; margin-bottom: 1.5rem; }
.number-grid:last-child { margin-bottom: 0; }
.number-button { min-width: 0; min-height: 44px; border: 1px solid var(--color-base-300); border-radius: .5rem; font-size: .875rem; font-variant-numeric: tabular-nums; cursor: pointer; transition: background .15s ease, color .15s ease; }
.number-button:hover:not(:disabled) { background: var(--color-base-200); }
.number-button.chosen { background: var(--color-primary); color: var(--color-primary-content); border-color: var(--color-primary); }
.number-button.excluded { background: var(--color-base-content); color: var(--color-base-100); border-color: var(--color-base-content); text-decoration: line-through; }
.number-button:disabled { opacity: .3; cursor: default; }
.filter-options { display: grid; gap: 1.5rem; }
.filter-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .6rem; }
.filter-toggle { display: flex; align-items: center; gap: .65rem; font-size: .85rem; font-weight: 550; min-height: 44px; }
.filter-inputs { display: flex; gap: .4rem; align-items: center; }
.filter-inputs .input, .filter-inputs .select, .filter-inputs output { width: 4.5rem; min-height: 44px; font-size: .875rem; }
.filter-inputs output { display: grid; place-items: center; border-radius: .5rem; background: var(--color-base-200); }
.filter-inputs .consecutive-select { width: 9.7rem; }
.filter-row > p { width: 100%; font-size: .75rem; color: color-mix(in oklch, var(--color-base-content) 60%, transparent); }
.frequency-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .25rem 1rem; }
.frequency-list a { display: flex; align-items: center; justify-content: space-between; gap: .5rem; min-height: 2.75rem; padding-block: .6rem; font-size: .8rem; border-bottom: 1px solid var(--color-base-300); }
.frequency-list a:hover { color: var(--color-primary); }
.help-text { margin-top: 1rem; }
.generator-guide { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1.5rem; padding-top: var(--page-header-space); margin-top: var(--section-space); border-top: 1px solid var(--color-base-300); }
.generator-guide p { max-width: var(--reading-width); font-size: var(--body-copy-size); line-height: var(--body-copy-line-height); margin-top: .75rem; color: color-mix(in oklch, var(--color-base-content) 65%, transparent); }
.guide-link { display: flex; flex-direction: column; gap: .5rem; align-self: start; padding: 1.25rem; background: var(--color-base-200); border-radius: .75rem; }
.guide-link > span { font-size: .8rem; }
.guide-link strong { display: flex; justify-content: space-between; gap: 1.5rem; color: var(--color-primary); font-size: .95rem; }
@media(min-width: 480px) { .number-grid { grid-template-columns: repeat(7, minmax(0, 1fr)); } }
@media(min-width: 640px) { .number-grid { grid-template-columns: repeat(9, minmax(0, 1fr)); } }
@media(min-width: 900px) { .generator-workspace { grid-template-columns: minmax(0, 1fr) minmax(0, .9fr); gap: 3rem; } .conditions-area { padding-left: 2rem; border-left: 1px solid var(--color-base-300); } .number-grid { grid-template-columns: repeat(7, minmax(0, 1fr)); } .generator-guide { grid-template-columns: minmax(0, 1fr) 260px; gap: 3rem; } }
@keyframes result-in { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: translateY(0); } }
@media(prefers-reduced-motion: reduce) { .result-list li { animation: none; } .number-button { transition: none; } }
</style>
