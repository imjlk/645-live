<script lang="ts">
import { onMount } from "svelte";
import { MetaTags } from "svelte-meta-tags";
import { goto } from "$app/navigation";
import { resolve } from "$app/paths";
import AdSlot from "$lib/components/ads/AdSlot.svelte";
import { LottoBall } from "$lib/components/stats";
import { getGenericOgImage } from "$lib/seo/index.js";
import {
	getScanDataSafely,
	type LottoDrawScanCount,
	trailbaseClient,
} from "$lib/trailbase/client";
import { calculateDisplayRound } from "$lib/utils/lotto-api";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();
const ballNumber = $derived(data.ballNumber);
let ballValue = $state<number | null>(null);
let displayedRound = $state<number | null>(null);
let mounted = $state(false);
let loadSequence = 0;
const currentRound = $derived(data.displayRound ?? calculateDisplayRound());
const isFallbackPreview = $derived(
	displayedRound !== null && displayedRound !== currentRound,
);
const pageTitle = $derived(`로또 ${ballNumber}번 스캔 집계와 추첨 기록`);
const pageDescription = $derived(
	`로또 6/45 ${ballNumber}번의 회차별 스캔 집계와 공식 추첨 기록을 확인하세요. ${data.numberStats ? `${data.latestRound}회까지 본 번호로 ${data.numberStats.frequency}회 나왔으며, 마지막 출현은 ${data.numberStats.lastDrawRound}회입니다.` : "번호별 출현 횟수와 최근 추첨 기록을 함께 제공합니다."} 함께 나온 번호와 최근 스캔 이력을 각각 살펴볼 수 있습니다.`,
);
const ogImage = $derived(
	getGenericOgImage({
		title: pageTitle,
		description: pageDescription,
		layout: "minimal",
		theme: "dark",
	}),
);

async function syncDisplayedBallValue(number: number, round: number) {
	const sequence = ++loadSequence;
	ballValue = null;
	displayedRound = null;
	let result = await getScanDataSafely(round);
	let resultRound = round;
	if (sequence !== loadSequence) return;
	if (
		(!result || Number(result.total_scans) === 0) &&
		data.fallbackPreviewRound &&
		data.fallbackPreviewRound !== round
	) {
		resultRound = data.fallbackPreviewRound;
		result = await getScanDataSafely(resultRound);
	}
	if (sequence !== loadSequence) return;
	const field = `scan_count_${number}` as keyof LottoDrawScanCount;
	ballValue = Number(result?.[field]) || 0;
	displayedRound = resultRound;
}

onMount(() => {
	mounted = true;
	const unsubscribe = trailbaseClient.subscribe("ball-page", (scanData) => {
		if (scanData.round !== currentRound) return;
		loadSequence += 1;
		const field = `scan_count_${ballNumber}` as keyof LottoDrawScanCount;
		ballValue = Number(scanData[field]) || 0;
		displayedRound = currentRound;
	});
	return () => {
		mounted = false;
		loadSequence += 1;
		unsubscribe();
	};
});

$effect(() => {
	if (mounted) void syncDisplayedBallValue(ballNumber, currentRound);
});

function handleKeydown(event: KeyboardEvent) {
	if (
		event.defaultPrevented ||
		event.altKey ||
		event.ctrlKey ||
		event.metaKey ||
		event.shiftKey
	)
		return;
	const target = event.target;
	if (
		target instanceof HTMLElement &&
		(target.isContentEditable ||
			/^(INPUT|TEXTAREA|SELECT|BUTTON|A|SUMMARY)$/.test(target.tagName))
	)
		return;
	const next =
		event.key === "ArrowLeft"
			? ballNumber - 1
			: event.key === "ArrowRight"
				? ballNumber + 1
				: 0;
	if (next >= 1 && next <= 45) {
		event.preventDefault();
		void goto(resolve("/n/[index]", { index: String(next) }));
	}
}
</script>

<MetaTags title={pageTitle} titleTemplate="%s | 645.live" description={pageDescription} canonical={`https://645.live/n/${ballNumber}`}
	openGraph={{ type: "website", title: pageTitle, description: pageDescription, url: `https://645.live/n/${ballNumber}`, siteName: "645.live", locale: "ko_KR", images: [ogImage] }}
	twitter={{ cardType: "summary_large_image", title: pageTitle, description: pageDescription, image: ogImage.url, imageAlt: ogImage.alt }}
/>

<svelte:window onkeydown={handleKeydown} />

<div class="content-page number-page">
	<nav class="breadcrumb" aria-label="현재 위치"><a href={resolve("/")}>홈</a><span aria-hidden="true">/</span><span>{ballNumber}번 스캔 집계</span></nav>
	<header class="number-heading">
		<div class="heading-copy"><LottoBall number={ballNumber} size="large" /><div><p class="eyebrow">이 사이트에 등록된 스캔 기준</p><h1>{ballNumber}번 스캔 집계</h1></div></div>
		<nav class="number-nav" aria-label="다른 번호 보기">
			{#if ballNumber > 1}<a href={resolve("/n/[index]", { index: String(ballNumber - 1) })} aria-label={`${ballNumber - 1}번 스캔 집계`}>← {ballNumber - 1}번</a>{/if}
			{#if ballNumber < 45}<a href={resolve("/n/[index]", { index: String(ballNumber + 1) })} aria-label={`${ballNumber + 1}번 스캔 집계`}>{ballNumber + 1}번 →</a>{/if}
		</nav>
	</header>

	<section class="scan-summary" aria-labelledby="scan-summary-heading">
		<div><h2 id="scan-summary-heading">{displayedRound ?? currentRound}회 번호 집계 횟수</h2><p class="scan-count">{ballValue === null ? "—" : ballValue.toLocaleString()}<span>회</span></p></div>
		<div class="scan-context">
			{#if ballValue === null}<p>스캔 집계를 불러오는 중입니다.</p>
			{:else if isFallbackPreview}<p>{currentRound}회에 아직 등록된 스캔이 없어, 최근 기록이 있는 <strong>{displayedRound}회</strong>를 보여드립니다.</p>
			{:else if ballValue === 0}<p>아직 이 번호가 포함된 스캔이 없어요.</p>
			{:else}<p>등록된 스캔에서 {ballNumber}번이 포함된 횟수입니다.</p>{/if}
			<p class="muted">전체 구매자의 선택 비율이나 당첨 확률을 뜻하지 않습니다.</p>
			<a class="action-link" href={resolve("/qr-scan")}>내 티켓 QR 확인 →</a>
		</div>
	</section>

	{#if data.historicalScanData.length > 0}
		<section>
			<div class="section-heading"><h2>최근 회차의 스캔 집계</h2><p>{ballNumber}번이 포함된 횟수</p></div>
			<div class="history-grid">{#each data.historicalScanData as item (item.round)}<div><span>{item.round}회</span><strong>{item.scanCount.toLocaleString()}<small>회</small></strong></div>{/each}</div>
		</section>
	{/if}

	<AdSlot placement="stats-inline" format="horizontal" />

	<section>
		<div class="section-heading"><div><p class="eyebrow">공식 추첨 기록</p><h2>{ballNumber}번 출현 통계</h2></div><a class="action-link" href={resolve("/stats/numbers/[number]", { number: String(ballNumber) })}>추첨 이력 보기 →</a></div>
		{#if data.numberStats}
			<dl class="draw-metrics">
				<div><dt>본 번호 출현</dt><dd>{data.numberStats.frequency}<span>회</span></dd></div>
				<div><dt>출현율</dt><dd>{data.numberStats.averageFrequency}<span>%</span></dd></div>
				<div><dt>마지막 출현</dt><dd>{data.numberStats.lastDrawRound}<span>회</span></dd></div>
				<div><dt>최근 미출현</dt><dd>{Math.max(0, data.latestRound - data.numberStats.lastDrawRound)}<span>회</span></dd></div>
			</dl>
			<p class="muted">전체 {data.latestRound}회 기준 · 과거 출현은 다음 추첨에서 나올 가능성을 높이지 않습니다.</p>
		{:else}<p class="muted">현재 추첨 통계를 불러오지 못했어요.</p>{/if}
	</section>

	<div class="pair-columns">
		{#each [{ title: "자주 함께 나온 번호", pairs: data.topPairs }, { title: "적게 함께 나온 번호", pairs: data.bottomPairs }] as group (group.title)}
			<section><div class="section-heading"><h2>{group.title}</h2></div>
				{#each group.pairs as pair (pair.otherNumber)}<div class="pair-line"><LottoBall number={pair.otherNumber} href={resolve("/stats/numbers/[number]", { number: String(pair.otherNumber) })} /><span>{pair.otherNumber}번</span><strong>{pair.pair_count}회</strong></div>{:else}<p class="muted">함께 나온 번호 기록이 없습니다.</p>{/each}
			</section>
		{/each}
	</div>

	<details class="number-properties"><summary>{ballNumber}번의 숫자 정보</summary>
		<dl>
			<div><dt>번호 구간</dt><dd>{ballNumber <= 10 ? "1~10" : ballNumber <= 20 ? "11~20" : ballNumber <= 30 ? "21~30" : ballNumber <= 40 ? "31~40" : "41~45"}</dd></div>
			<div><dt>홀짝 · 끝자리</dt><dd>{data.mathematicalProperties.isEven ? "짝수" : "홀수"} · {ballNumber % 10}</dd></div>
			<div><dt>소수</dt><dd>{data.mathematicalProperties.isPrime ? "해당" : "해당 없음"}</dd></div>
			<div><dt>완전제곱수</dt><dd>{data.mathematicalProperties.isPerfectSquare ? "해당" : "해당 없음"}</dd></div>
			<div><dt>피보나치 수</dt><dd>{data.mathematicalProperties.isFibonacci ? "해당" : "해당 없음"}</dd></div>
		</dl>
	</details>

	<footer class="footer-links"><a href={resolve("/stats/numbers")}>전체 번호 통계 →</a><a href={resolve("/generator")}>조건에 맞는 번호 만들기 →</a></footer>
</div>

<style>
	.number-page { display: grid; gap: 1.75rem; min-width: 0; }
	.breadcrumb { display: flex; flex-wrap: wrap; gap: 0.5rem; font-size: 0.8125rem; color: color-mix(in oklab, var(--color-base-content) 65%, transparent); }
	.number-heading, .heading-copy { display: flex; align-items: center; gap: 1rem; }
	.number-heading { flex-wrap: wrap; justify-content: space-between; }
	.eyebrow { font-size: 0.8125rem; color: var(--color-primary); font-weight: 650; }
	h1 { margin-top: 0.25rem; font-size: clamp(1.5rem, 3vw, 2.2rem); line-height: 1.25; font-weight: 800; letter-spacing: -0.035em; }
	.number-nav { display: flex; gap: 0.5rem; }
	.number-nav a { display: inline-flex; align-items: center; min-height: 2.75rem; padding: 0.5rem 0.75rem; border: 1px solid var(--color-base-300); border-radius: 0.5rem; font-size: 0.8125rem; }
	.scan-summary { display: grid; gap: 1.25rem; padding: 1.25rem; background: var(--color-base-200); border-radius: 0.8rem; }
	h2 { font-size: 1.125rem; font-weight: 700; line-height: 1.4; letter-spacing: -0.02em; }
	.scan-summary h2 { font-size: 0.875rem; font-weight: 600; }
	.scan-count { margin-top: 0.5rem; font-size: 3rem; font-weight: 800; line-height: 1.1; font-variant-numeric: tabular-nums; letter-spacing: -0.04em; }
	.scan-count span { margin-left: 0.3rem; font-size: 1rem; font-weight: 500; }
	.scan-context { display: grid; align-content: center; gap: 0.6rem; font-size: 0.875rem; line-height: 1.65; }
	.muted { font-size: 0.8125rem; line-height: 1.65; color: color-mix(in oklab, var(--color-base-content) 70%, transparent); }
	.action-link { font-size: 0.8125rem; font-weight: 650; color: var(--color-primary); }
	.section-heading { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 0.5rem; margin-bottom: 1rem; }
	.section-heading > p { font-size: 0.8125rem; color: color-mix(in oklab, var(--color-base-content) 68%, transparent); }
	.history-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 1rem; border-top: 1px solid var(--color-base-300); }
	.history-grid > div { display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem; padding: 0.85rem 0; border-bottom: 1px solid var(--color-base-300); font-variant-numeric: tabular-nums; }
	.history-grid span { font-size: 0.8125rem; color: color-mix(in oklab, var(--color-base-content) 70%, transparent); }
	.history-grid strong { font-size: 1rem; font-weight: 650; }
	small { font-size: 0.75rem; font-weight: 400; margin-left: 0.2rem; }
	.draw-metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); padding-bottom: 1rem; gap: 1rem; }
	dt { font-size: 0.8125rem; color: color-mix(in oklab, var(--color-base-content) 70%, transparent); }
	.draw-metrics dd { margin-top: 0.35rem; font-size: 1.6rem; font-weight: 750; line-height: 1.2; font-variant-numeric: tabular-nums; }
	.draw-metrics dd span { font-size: 0.875rem; margin-left: 0.2rem; font-weight: 500; }
	.pair-columns { display: grid; gap: 1.75rem; }
	.pair-line { display: flex; align-items: center; gap: 0.75rem; min-height: 3.5rem; padding-block: 0.35rem; border-bottom: 1px solid var(--color-base-300); font-size: 0.875rem; }
	.pair-line strong { margin-left: auto; font-weight: 650; font-variant-numeric: tabular-nums; }
	.number-properties { border-block: 1px solid var(--color-base-300); }
	summary { padding-block: 1rem; cursor: pointer; font-weight: 600; font-size: 0.9375rem; }
	.number-properties dl { padding-bottom: 1rem; display: grid; gap: 0.75rem; }
	.number-properties dl div { display: flex; justify-content: space-between; font-size: 0.875rem; }
	.footer-links { display: flex; flex-wrap: wrap; gap: 1rem; color: var(--color-primary); font-size: 0.875rem; font-weight: 600; }
	a:focus-visible, summary:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 3px; }
	@media (min-width: 640px) { .scan-summary { grid-template-columns: minmax(12rem, 0.6fr) 1fr; padding: 1.5rem; } .history-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); } .history-grid > div { display: grid; gap: 0.3rem; } .draw-metrics { grid-template-columns: repeat(4, minmax(0, 1fr)); } .pair-columns { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2rem; } }
</style>
