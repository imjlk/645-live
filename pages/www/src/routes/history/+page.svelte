<script lang="ts">
import { JsonLd, MetaTags } from "svelte-meta-tags";
import { goto } from "$app/navigation";
import { resolve } from "$app/paths";
import AdSlot from "$lib/components/ads/AdSlot.svelte";
import SimpleBall from "$lib/components/SimpleBall.svelte";
import {
	absoluteUrl,
	createBreadcrumbSchema,
	createCollectionPageSchema,
	getGenericOgImage,
} from "$lib/seo/index.js";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();
let navigating = $state(false);
const numbers = $derived(
	Array.from({ length: 45 }, (_, index) => ({
		id: index + 1,
		value: Number(data.scanData?.[`scan_count_${index + 1}`] ?? 0),
	})),
);
const totalScans = $derived(Number(data.scanData?.total_scans ?? 0));
const totalNumberAppearances = $derived(
	numbers.reduce((sum, item) => sum + item.value, 0),
);
const mostScanned = $derived([...numbers].sort((a, b) => b.value - a.value)[0]);
const winningNumbers = $derived(
	data.lottoNumbers
		? [
				data.lottoNumbers.drwtNo1,
				data.lottoNumbers.drwtNo2,
				data.lottoNumbers.drwtNo3,
				data.lottoNumbers.drwtNo4,
				data.lottoNumbers.drwtNo5,
				data.lottoNumbers.drwtNo6,
			]
		: [],
);

async function selectRound(round: number) {
	navigating = true;
	try {
		await goto(resolve(`/history?round=${round}`));
	} finally {
		navigating = false;
	}
}

function formatDate(value: string): string {
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? value
		: date.toLocaleDateString("ko-KR", {
				year: "numeric",
				month: "long",
				day: "numeric",
			});
}

const canonicalUrl = absoluteUrl("/history");
const pageTitle = "로또 회차별 당첨 결과와 스캔 통계";
const pageDescription =
	"로또 6/45 최신 발표 회차부터 지난 당첨번호와 보너스 번호, 추첨일, 1등 당첨금과 당첨자 수를 확인하세요. 회차를 선택해 645.live에 등록된 QR 스캔 통계를 살펴보고 해당 회차 당첨 판매점으로 이동할 수 있습니다.";
const ogImage = getGenericOgImage({
	title: pageTitle,
	description: "회차별 당첨번호·1등 당첨금·스캔 통계",
	layout: "blog",
	theme: "dark",
});
</script>

<MetaTags title={pageTitle} titleTemplate="%s | 645.live" description={pageDescription} canonical={canonicalUrl}
	openGraph={{ type: "website", url: canonicalUrl, title: pageTitle, description: pageDescription, siteName: "645.live", images: [ogImage] }}
	twitter={{ cardType: "summary_large_image", title: pageTitle, description: pageDescription, image: ogImage.url, imageAlt: ogImage.alt }} />
<JsonLd schema={createCollectionPageSchema({ path: "/history", name: pageTitle, description: pageDescription })} />
<JsonLd schema={createBreadcrumbSchema([{ name: "홈", path: "/" }, { name: "당첨 결과", path: "/history" }])} />

<div class="content-page history-page">
	<header class="page-header">
		<div><p class="eyebrow">로또 6/45</p><h1>회차별 당첨 결과</h1><p>발표된 당첨번호와 1등 당첨금을 확인하세요.</p></div>
		<a href={resolve("/qr-scan")} class="btn btn-primary">내 용지 QR 확인</a>
	</header>
	{#if data.error}
		<div class="alert alert-error" role="alert">{data.error}</div>
	{:else}
		<div class="round-controls">
			<label for="history-round">회차 선택</label>
			<select id="history-round" class="select" value={data.targetRound} disabled={navigating}
				onchange={(event) => selectRound(Number(event.currentTarget.value))}>
				{#each data.availableRounds as round (round)}<option value={round}>{round}회{round === data.latestRound ? " · 최신 발표" : ""}</option>{/each}
			</select>
			<div class="join">
				<button class="btn join-item" disabled={navigating || !data.targetRound || data.targetRound <= 1} onclick={() => selectRound((data.targetRound ?? 2) - 1)} aria-label="이전 회차">←</button>
				<button class="btn join-item" disabled={navigating || !data.targetRound || data.targetRound >= (data.latestRound ?? 0)} onclick={() => selectRound((data.targetRound ?? 0) + 1)} aria-label="다음 회차">→</button>
			</div>
		</div>
		<section class="draw-result" aria-busy={navigating} aria-labelledby="draw-heading">
			<div class="section-heading"><h2 id="draw-heading">제{data.targetRound}회 당첨번호</h2>{#if data.lottoNumbers}<p>{formatDate(data.lottoNumbers.drwNoDate)} 추첨</p>{/if}</div>
			{#if data.lottoNumbers}
				<div class="draw-balls" aria-label="당첨번호와 보너스 번호">
					<div class="main-balls">{#each winningNumbers as number (number)}<SimpleBall {number} size="md" />{/each}</div>
					<div class="bonus-ball"><span>보너스</span><SimpleBall number={data.lottoNumbers.bnusNo} isBonus size="md" /></div>
				</div>
				<dl class="prize-summary">
					<div><dt>1등 1게임당 당첨금</dt><dd class="prize">{data.lottoNumbers.firstWinamnt.toLocaleString()}<span>원</span></dd></div>
					<div><dt>1등 당첨 게임</dt><dd>{data.lottoNumbers.firstPrzwnerCo.toLocaleString()}<span>게임</span></dd></div>
					<div><dt>총 판매금액</dt><dd class="sales">{data.lottoNumbers.totSellamnt.toLocaleString()}<span>원</span></dd></div>
				</dl>
				<a href={resolve(`/winning-stores?round=${data.targetRound}`)} class="text-link">{data.targetRound}회 당첨 판매점 보기 <span aria-hidden="true">→</span></a>
			{:else}<p class="empty-state">이 회차의 당첨 결과를 불러오지 못했어요. 다른 회차를 선택하거나 잠시 후 다시 확인해주세요.</p>{/if}
		</section>
		{#if data.lottoNumbers}<AdSlot placement="history-inline" format="horizontal" />{/if}
		<section class="scan-section" aria-labelledby="scan-heading">
			<div class="section-heading"><div><h2 id="scan-heading">이 회차의 QR 스캔 통계</h2><p>645.live에 등록된 스캔 기준 · 공식 추첨 통계와 별도 집계</p></div><span class="scan-count">{totalScans.toLocaleString()}회 스캔</span></div>
			{#if data.scanError}<p class="empty-state">스캔 통계를 불러오지 못했어요. 당첨 결과는 위에서 확인할 수 있습니다.</p>
			{:else if totalNumberAppearances > 0}
				<div class="scan-grid">{#each numbers as ball (ball.id)}<div><SimpleBall number={ball.id} isWinning={winningNumbers.includes(ball.id)} size="sm" /><span>{ball.value.toLocaleString()}<span class="sr-only">회 출현</span></span></div>{/each}</div>
				<div class="scan-footnote"><p>가장 많이 등록된 번호: <strong>{mostScanned?.id}번 · {mostScanned?.value.toLocaleString()}회</strong></p><p>등록된 번호: {numbers.filter((number) => number.value > 0).length} / 45개</p></div>
				<p class="footnote">번호별 횟수는 등록된 스캔에서 해당 번호가 집계된 횟수입니다. 스캔 빈도는 다음 추첨의 당첨 확률을 나타내지 않습니다.</p>
			{:else}<p class="empty-state">이 회차에 등록된 스캔이 아직 없어요. 용지 QR을 확인하면 내역을 저장할 수 있습니다.</p>{/if}
		</section>
	{/if}
</div>

<style>
.page-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
.section-heading p { margin-top: .4rem; font-size: .8rem; line-height: 1.7; color: color-mix(in oklch, var(--color-base-content) 65%, transparent); }
.history-page { max-width: 1120px; margin-inline: auto; }
.eyebrow { color: var(--color-primary); font-size: .75rem; font-weight: 700; letter-spacing: .06em; }
.round-controls { display: flex; align-items: center; flex-wrap: wrap; gap: .75rem; padding: 1rem 0 1.5rem; }
.round-controls label { font-size: .875rem; font-weight: 600; }
.round-controls .select { width: auto; min-width: 10rem; flex: 1; max-width: 20rem; }
.draw-result { padding: 1.5rem 0 2rem; border-block: 1px solid var(--color-base-300); }
.draw-balls { display: flex; flex-wrap: wrap; gap: 1rem 1.5rem; align-items: center; margin: 1.5rem 0 2rem; }
.main-balls { display: flex; gap: clamp(.35rem, 1.2vw, .85rem); }
.bonus-ball { display: flex; gap: .65rem; align-items: center; }
.bonus-ball > span { color: color-mix(in oklch, var(--color-base-content) 65%, transparent); font-size: .75rem; }
.prize-summary { display: grid; gap: 1.25rem; grid-template-columns: 1fr 1fr; margin: 0 0 1.5rem; }
.prize-summary > div:first-child { grid-column: 1 / -1; }
dt { font-size: .8rem; color: color-mix(in oklch, var(--color-base-content) 65%, transparent); margin-bottom: .4rem; }
dd { margin: 0; font-size: 1.5rem; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -.04em; }
dd.prize { font-size: clamp(1.75rem, 4vw, 2.75rem); }
dd.sales { font-size: clamp(.95rem, 2vw, 1.5rem); overflow-wrap: anywhere; }
dd > span { font-size: .8rem; font-weight: 500; margin-left: .25rem; letter-spacing: 0; }
.text-link { display: inline-flex; gap: 1rem; align-items: center; min-height: 44px; font-size: .875rem; font-weight: 650; color: var(--color-primary); }
.text-link:hover { text-decoration: underline; text-underline-offset: 4px; }
.scan-section { padding-top: 2rem; }
.scan-count { font-size: .875rem; font-weight: 600; white-space: nowrap; }
.scan-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 1.25rem .5rem; margin: 1.5rem 0; }
.scan-grid > div { display: flex; flex-direction: column; align-items: center; gap: .4rem; font-size: .8rem; font-variant-numeric: tabular-nums; }
.scan-footnote { display: flex; flex-wrap: wrap; justify-content: space-between; gap: .5rem 1rem; border-top: 1px solid var(--color-base-300); padding-top: 1rem; font-size: .8rem; }
.footnote, .empty-state { color: color-mix(in oklch, var(--color-base-content) 65%, transparent); font-size: .875rem; line-height: 1.7; }
.footnote { margin-top: .75rem; }
.empty-state { padding: 1.5rem 0; }
@media(max-width: 639px) { .draw-balls { flex-wrap: nowrap; gap: .75rem; align-items: flex-end; } .draw-balls :global(.simple-ball.md) { width: clamp(2.35rem, 10vw, 3rem); height: clamp(2.35rem, 10vw, 3rem); } .bonus-ball { flex-direction: column; gap: .35rem; } }
@media(min-width: 640px) { .scan-grid { grid-template-columns: repeat(9, minmax(0, 1fr)); } .prize-summary { grid-template-columns: 1.2fr .65fr 1fr; } .prize-summary > div:first-child { grid-column: auto; } }
</style>
