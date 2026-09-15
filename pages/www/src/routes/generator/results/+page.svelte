<script lang="ts">
import {
	createGenerationResultHistory,
	fetchGenerationResults,
	GENERATION_RANKS,
	GENERATION_RESULTS_COUNTING,
	GENERATION_RESULTS_SCOPE,
	generationResultDate,
	generationResultStatus,
	winningGenerations,
} from "@645/lotto-core";
import { onMount, untrack } from "svelte";
import SimpleBall from "$lib/components/SimpleBall.svelte";
import { absoluteUrl } from "$lib/seo";
import PageMeta from "$lib/seo/PageMeta.svelte";
import { getTrailbaseBrowserBaseUrl } from "$lib/trailbase/browser-base";

let { data } = $props();
const controller = createGenerationResultHistory(
	(query, signal) =>
		fetchGenerationResults(getTrailbaseBrowserBaseUrl(), query, signal),
	untrack(() => data.generationResults),
);
let history = $state(controller.getSnapshot());
const selected = $derived(
	history.rounds.find((r) => r.round === history.selectedRound),
);
const index = $derived(
	history.rounds.findIndex((r) => r.round === history.selectedRound),
);
const status = $derived(selected ? generationResultStatus(selected) : null);
const winning = $derived(selected ? winningGenerations(selected) : null);
const maxCount = $derived(
	Math.max(1, ...(selected?.rankCounts?.slice(1) ?? [])),
);
onMount(() => {
	const unsubscribe = controller.subscribe(() => {
		history = controller.getSnapshot();
	});
	const refresh = () => {
		if (!document.hidden) void controller.refresh();
	};
	refresh();
	const timer = setInterval(refresh, 60000);
	document.addEventListener("visibilitychange", refresh);
	return () => {
		clearInterval(timer);
		document.removeEventListener("visibilitychange", refresh);
		unsubscribe();
		controller.stop();
	};
});
async function previous() {
	if (!selected) return;
	const round = selected.round;
	if (index + 1 === history.rounds.length) await controller.more();
	const state = controller.getSnapshot();
	const older = state.rounds.find((r) => r.round < round);
	if (older && state.selectedRound === round) controller.select(older.round);
}
</script>
<PageMeta title="회차별 생성 번호 당첨 결과 통계" titleTemplate="%s | 645.live" description="645.live와 토스 번호 생성기에서 공개된 로또 조합의 추첨 결과를 회차별로 확인하세요. 총 생성 조합 수, 추첨 번호와 보너스 번호, 1등부터 5등까지 번호가 일치한 건수를 제공합니다. 같은 조합도 생성 횟수만큼 집계하며 실제 구매·당첨금 수령 내역과 구분합니다." canonical={absoluteUrl("/generator/results")} />
<div class="content-page">
	<header class="page-header"><p class="eyebrow">모두가 만든 번호</p><h1>회차별 생성 결과</h1><p>{GENERATION_RESULTS_SCOPE}</p></header>
	<div class="toolbar">
		<div class="round-controls" aria-label="회차 탐색">
			<button type="button" onclick={previous} disabled={history.loadingMore || !selected || (index + 1 >= history.rounds.length && history.nextBeforeRound === null)}>← 이전</button>
			<select aria-label="조회할 회차" value={history.selectedRound ?? ""} onchange={e => controller.select(Number(e.currentTarget.value))} disabled={!history.rounds.length}>
				{#if !history.rounds.length}<option value="">회차 선택</option>{/if}
				{#each history.rounds as round (round.round)}<option value={round.round}>{round.round}회 · {generationResultDate(round)}</option>{/each}
			</select>
			<button type="button" onclick={() => controller.select(history.rounds[index - 1].round)} disabled={index <= 0}>다음 →</button>
		</div>
		<button type="button" class="refresh" onclick={() => controller.refresh()} disabled={history.loading}>{history.loading ? "불러오는 중…" : "새로고침"}</button>
	</div>
	{#if history.error}<div class="notice error" role="alert">{history.error}<button type="button" onclick={() => controller.refresh()}>다시 불러오기</button></div>{/if}
	{#if selected && status}
		<section class="result" aria-label={`${selected.round}회 생성 결과`}>
			<div class="draw-info"><div><p class="eyebrow">{generationResultDate(selected)} 추첨</p><h2>{selected.round}회</h2></div><span class="result-status">{status.label}</span></div>
			{#if selected.draw}<div class="draw" aria-label="추첨 번호">{#each selected.draw.numbers as number (number)}<SimpleBall {number} size="sm" />{/each}<span class="plus" aria-label="보너스 번호">+</span><SimpleBall number={selected.draw.bonus} size="sm" isBonus /></div>{/if}
			<div class="summary"><div><p>공개 생성 조합</p><strong>{selected.totalGenerations.toLocaleString()}<small>개</small></strong></div><div><p>1~5등 번호 일치</p><strong class="matched">{winning === null ? "—" : winning.toLocaleString()}{#if winning !== null}<small>개</small>{/if}</strong></div></div>
			{#if selected.status !== "ready"}<div class="notice"><p>{status.description}</p>{#if selected.status === "processing" && selected.comparedGenerations > 0}<p>{selected.comparedGenerations.toLocaleString()}개 비교 완료</p>{/if}</div>{/if}
			<table><caption>등수별 번호 일치</caption><thead><tr><th scope="col">등수</th><th scope="col">일치 조건</th><th scope="col" class="numeric">생성 조합</th></tr></thead><tbody>{#each GENERATION_RANKS as rank (rank.rank)}{@const count = selected.rankCounts?.[rank.rank]}<tr><th scope="row">{rank.label}</th><td>{rank.condition}</td><td class="numeric"><strong>{count === undefined ? "—" : `${count.toLocaleString()}개`}</strong><span class="track" aria-hidden="true"><span style:width={`${((count ?? 0) / maxCount) * 100}%`}></span></span></td></tr>{/each}</tbody></table>
			{#if selected.rankCounts}<p class="nonwinning"><span>3개 미만 일치</span><span>{selected.rankCounts[0].toLocaleString()}개</span></p>{/if}
		</section>
	{:else if history.loading}<p class="empty" role="status">회차별 생성 결과를 불러오고 있어요.</p>
	{:else if !history.error}<p class="empty">첫 회차의 생성 결과를 준비하고 있어요.</p>{/if}
	{#if history.nextBeforeRound !== null}<button type="button" class="more" disabled={history.loading || history.loadingMore} onclick={() => controller.more()}>{history.loadingMore ? "불러오는 중…" : "이전 회차 목록 더 불러오기"}</button>{/if}
	<footer><p>{GENERATION_RESULTS_COUNTING}</p><p>생성·추첨 정보 제공: 645.live</p></footer>
</div>
<style>
.page-header .eyebrow,.eyebrow { color:var(--color-primary);font-size:.85rem;font-weight:650;margin-bottom:.5rem; }
.toolbar,.round-controls { display:flex;align-items:center;gap:.75rem; }.toolbar { justify-content:space-between;flex-wrap:wrap;margin-bottom:2rem; }
button,select { min-height:44px;padding:.65rem .9rem;border:1px solid var(--color-base-300);border-radius:.6rem;background:var(--color-base-100);color:var(--color-base-content);font-size:.875rem;cursor:pointer; }
button:disabled,select:disabled { opacity:.45;cursor:default; }button:focus-visible,select:focus-visible { outline:2px solid var(--color-primary);outline-offset:3px; }.refresh { border-color:transparent;color:var(--color-primary); }
.result { border-top:1px solid var(--color-base-300);padding-top:1.75rem; }.draw-info { display:flex;align-items:center;justify-content:space-between;gap:1rem; }.draw-info h2 { font-size:1.5rem;font-weight:750; }.result-status { color:var(--color-primary);font-size:.85rem; }.draw { display:flex;align-items:center;gap:clamp(.4rem,1.5vw,.8rem);margin-top:1.5rem; }.plus { color:var(--text-muted); }
.summary { display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;padding:2rem 0;margin-top:1rem;border-bottom:1px solid var(--color-base-300); }.summary p { color:var(--text-muted);font-size:.9rem;margin-bottom:.6rem; }.summary strong { display:block;font-size:clamp(1.8rem,4vw,2.8rem);line-height:1.2;font-weight:750;letter-spacing:-.04em;overflow-wrap:anywhere; }.summary small { font-size:.95rem;margin-left:.35rem;font-weight:500; }.matched { color:var(--color-primary); }
.notice { margin-top:1.5rem;padding:1rem 1.25rem;background:var(--color-base-200);border-radius:.75rem;color:var(--text-muted);font-size:.9rem;line-height:1.75; }.error { display:flex;gap:1rem;align-items:center;justify-content:space-between;margin-bottom:1.5rem; }
table { width:100%;border-collapse:collapse;margin-top:2rem;table-layout:fixed; }caption { text-align:left;font-weight:750;font-size:1.2rem;margin-bottom:1rem; }th,td { padding:1.2rem .5rem;border-bottom:1px solid var(--color-base-300);text-align:left; }thead th { font-size:.8rem;color:var(--text-muted);font-weight:500; }th:first-child { width:18%;padding-left:0; }td { font-size:.9rem;color:var(--text-muted); }.numeric { text-align:right;padding-right:0; }.numeric strong { color:var(--color-base-content);font-size:1.15rem;font-variant-numeric:tabular-nums; }.track { display:block;height:3px;background:var(--color-base-200);border-radius:3px;margin-top:.65rem;margin-left:auto;max-width:240px;overflow:hidden; }.track span { display:block;height:100%;background:var(--color-primary);border-radius:3px; }
.nonwinning { display:flex;justify-content:space-between;margin-top:1.25rem;color:var(--text-muted);font-size:.85rem; }.more { display:block;margin:2rem auto 0; }footer { margin-top:2rem;font-size:.8rem;line-height:1.8;color:var(--text-muted); }.empty { padding:3rem 0;color:var(--text-muted); }
@media(max-width:480px) { .toolbar { gap:.5rem; }.round-controls { width:100%;gap:.4rem; }select { flex:1;min-width:0; }button,select { padding:.6rem .65rem; }.refresh { margin-left:auto; }.summary { gap:1rem; }td { font-size:.8rem; } }
</style>
