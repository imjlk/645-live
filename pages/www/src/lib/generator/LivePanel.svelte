<script lang="ts">
import type { Generation } from "@645/lotto-core";
import { tick } from "svelte";
import { resolve } from "$app/paths";
import AdSlot from "$lib/components/ads/AdSlot.svelte";
import SimpleBall from "$lib/components/SimpleBall.svelte";
import LottoBall from "$lib/modules/lotto/components/LottoBall.svelte";
import ValueIncrementEffect from "$lib/modules/lotto/components/ValueIncrementEffect.svelte";
import type { LiveGenerations } from "./live.svelte";

let {
	live,
	compact = false,
	save,
	isSaved = () => false,
}: {
	live: LiveGenerations;
	compact?: boolean;
	save?: (g: Generation) => void;
	isSaved?: (g: Generation) => boolean;
} = $props();
let columns = $state<5 | 9>(5);
const rows = $derived(
	compact
		? (live.feed?.generations.slice(0, 3) ?? [])
		: (live.feed?.generations ?? []),
);
async function changeColumns(next: 5 | 9) {
	if (columns === next) return;
	if (
		document.startViewTransition &&
		!matchMedia("(prefers-reduced-motion: reduce)").matches
	)
		document.startViewTransition(async () => {
			columns = next;
			await tick();
		});
	else columns = next;
}
function observeMore(node: HTMLElement) {
	const observer = new IntersectionObserver(
		(entries) => {
			if (
				entries.some((e) => e.isIntersecting) &&
				!live.loadingMore &&
				!live.error
			)
				void live.more();
		},
		{ rootMargin: "160px" },
	);
	observer.observe(node);
	return { destroy: () => observer.disconnect() };
}
function timeLabel(time: number) {
	return new Intl.DateTimeFormat("ko-KR", {
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "Asia/Seoul",
	}).format(time);
}
</script>
<section class="live-panel" class:compact aria-label="실시간 번호 생성 현황">
	<div class="live-heading"><div><p class="eyebrow">{live.context?.targetRound ?? live.feed?.round ?? "이번"}회 생성 현황</p><h2>{compact ? "지금 함께 만드는 번호" : "번호별 생성 횟수"}</h2></div><span class="connection" class:connected={live.connected}><i aria-hidden="true"></i>{live.connected ? "실시간" : "연결 중"}</span></div>
	<p class="scope">645.live와 토스 번호 생성기의 조합을 함께 보여드려요. 실제 구매·QR 스캔 통계와는 별개입니다.</p>
	<div class="live-summary"><p>생성한 조합 <strong>{live.feed ? live.feed.totalGenerations.toLocaleString() : "—"}</strong><span>게임</span></p>{#if !compact}<div class="column-controls" role="group" aria-label="번호 배열"><button aria-pressed={columns === 5} onclick={() => changeColumns(5)}>5열</button><button aria-pressed={columns === 9} onclick={() => changeColumns(9)}>9열</button></div>{/if}</div>
	{#if live.error}<div class="connection-message" role="status"><p>{live.error}</p><button class="btn btn-ghost btn-sm" onclick={live.refresh}>다시 연결</button></div>{/if}
	{#if !compact}
		<div class="ball-grid" class:large={columns === 5} style:--columns={columns} aria-label="1번부터 45번까지 생성 횟수">
			{#each Array.from({length:45}, (_, i) => i + 1) as number (number)}<div class="ball-cell" style:view-transition-name={`generated-count-${number}`}>
				{#key live.pulses[number - 1]}<div class:count-pulse={live.deltas[number - 1] > 0}><LottoBall {number} initialValue={live.feed?.numberCounts[number - 1] ?? 0} size={columns === 5 ? "large" : "small"} interactive={false} /><ValueIncrementEffect show={live.deltas[number - 1] > 0} delta={live.deltas[number - 1]} color="text-primary" /></div>{/key}
			</div>{/each}
		</div>
	{/if}
	<div class="feed-heading"><h3>최근 생성한 조합</h3>{#if compact}<a href={resolve("/generator/live")}>전체 현황 <span aria-hidden="true">→</span></a>{/if}</div>
	{#if rows.length}
		<ol class="generation-feed">
			{#each rows as item, index (item.id)}
				<li class="generation-row"><div class="row-info"><span>{item.displayName}</span><time datetime={new Date(item.createdAt).toISOString()}>{timeLabel(item.createdAt)}</time></div><div class="row-numbers"><div class="balls">{#each item.numbers as number (number)}<SimpleBall {number} size="sm" />{/each}</div>{#if save}<button class="save-button" aria-pressed={isSaved(item)} aria-label={`${item.numbers.join(", ")} ${isSaved(item) ? "보관 취소" : "보관"}`} onclick={() => save?.(item)}>{isSaved(item) ? "보관됨" : "보관"}</button>{/if}</div></li>
				{#if !compact && (index + 1) % 10 === 0}<li class="feed-ad"><AdSlot placement={`generator-feed-${Math.floor(index / 10) % 3 + 1}`} format="horizontal" /></li>{/if}
			{/each}
		</ol>
	{:else}<div class="empty-feed"><p>{live.feed ? "아직 이 회차에 만들어진 조합이 없어요." : "생성 현황을 확인하고 있어요."}</p><a href={resolve("/generator")}>첫 조합 만들기 <span aria-hidden="true">→</span></a></div>{/if}
	{#if !compact && live.feed?.nextCursor}{#key live.feed.nextCursor}<div class="more" use:observeMore><button class="btn btn-ghost" disabled={live.loadingMore} onclick={live.more}>{live.loadingMore ? "불러오는 중…" : "이전 조합 더 보기"}</button></div>{/key}{/if}
	{#if compact}<a class="generate-link" href={resolve("/generator")}>내 번호도 만들어보기 <span aria-hidden="true">→</span></a>{:else}<p class="source-note">생성 통계 출처: 645.live · 모든 조합의 당첨 확률은 같습니다.</p>{/if}
</section>
<style>
.live-heading,.live-summary,.feed-heading,.row-info,.row-numbers {display:flex;align-items:center;justify-content:space-between;gap:1rem;}
.live-heading{align-items:flex-start;}.eyebrow{font-size:.8rem;color:var(--color-primary);font-weight:650;margin-bottom:.5rem;}h2{font-size:var(--section-title-size);font-weight:750;letter-spacing:-.035em;}.scope,.source-note{font-size:.8rem;line-height:1.7;color:var(--text-muted);margin-top:.75rem;max-width:var(--reading-width);}.connection{display:flex;align-items:center;gap:.4rem;font-size:.8rem;white-space:nowrap;color:var(--text-muted);padding-top:.35rem;}i{width:.45rem;height:.45rem;border-radius:50%;background:var(--color-base-300);}.connected i{background:#10b981;}.live-summary{margin-block:1.5rem;}.live-summary p{display:flex;align-items:baseline;gap:.5rem;font-size:.85rem;}.live-summary strong{font-size:1.65rem;letter-spacing:-.05em;font-variant-numeric:tabular-nums;}.live-summary p>span{color:var(--text-muted);}.column-controls{display:flex;background:var(--color-base-200);border-radius:.6rem;padding:.2rem;}.column-controls button{min-height:2.5rem;min-width:2.6rem;padding:.4rem .7rem;font-size:.8rem;border-radius:.4rem;cursor:pointer;}.column-controls button[aria-pressed=true]{background:var(--color-base-100);color:var(--color-primary);font-weight:700;}.ball-grid{display:grid;grid-template-columns:repeat(var(--columns),minmax(0,1fr));gap:clamp(.3rem,1.5vw,.9rem);margin-bottom:2rem;}.ball-grid.large{max-width:46rem;margin-inline:auto;gap:clamp(.65rem,2vw,1.5rem);}.ball-cell{position:relative;min-width:0;}.feed-heading{padding-block:1rem;border-bottom:1px solid var(--color-base-300);}.feed-heading h3{font-weight:700;font-size:1rem;}.feed-heading a{font-size:.8rem;color:var(--color-primary);padding:.5rem 0;}.generation-feed{padding:0;margin:0;list-style:none;}.generation-row{padding:1rem 0;border-bottom:1px solid var(--color-base-300);}.row-info{font-size:.75rem;color:var(--text-muted);margin-bottom:.65rem;}.balls{display:flex;gap:clamp(.35rem,1.5vw,.85rem);}.save-button{min-height:44px;min-width:48px;cursor:pointer;color:var(--color-primary);font-size:.8rem;}.save-button[aria-pressed=true]{color:var(--text-muted);}.empty-feed{padding:2rem 0;color:var(--text-muted);font-size:.9rem;}.empty-feed a{display:inline-flex;padding:1rem 0;color:var(--color-primary);}.generate-link{display:flex;justify-content:space-between;padding:1.25rem 0 .5rem;color:var(--color-primary);font-weight:650;}.more{text-align:center;margin-top:1rem;}.connection-message{display:flex;align-items:center;justify-content:space-between;gap:.75rem;font-size:.85rem;background:var(--color-base-200);padding:.75rem 1rem;}.count-pulse{animation:count-pulse .36s ease-out;}.feed-ad:empty{display:none;}.source-note{margin-top:1.5rem;}@keyframes count-pulse{35%{transform:scale(1.08);}100%{transform:scale(1);}}@media(max-width:420px){.ball-grid:not(.large) :global(.lotto-ball span){font-size:.5rem;}.ball-grid:not(.large) :global(.lotto-ball strong){font-size:.8rem;}.ball-grid.large :global(.large strong){font-size:1.4rem;}.ball-grid.large :global(.large span){font-size:.7rem;}.live-summary{gap:.5rem;}.live-summary strong{font-size:1.35rem;}}@media(prefers-reduced-motion:reduce){.count-pulse{animation:none;}}
</style>
