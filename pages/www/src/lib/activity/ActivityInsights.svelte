<script lang="ts">
import {
	ACTIVITY_LABELS,
	ACTIVITY_PERIODS,
	type ActivityPeriod,
	type ActivitySnapshot,
	type ActivitySource,
	activityComparison,
	activityNumbers,
	combinationActivity,
	createActivityController,
	fetchActivityInsights,
	numberActivity,
	sum,
} from "@645/lotto-core";
import { onMount, untrack } from "svelte";
import { resolve } from "$app/paths";
import SimpleBall from "$lib/components/SimpleBall.svelte";
import { parseGenerations, SAVED_KEY } from "$lib/generator/storage";
import { getTrailbaseBrowserBaseUrl } from "$lib/trailbase/browser-base";

let {
	round,
	source = "generated",
	initial = null,
	ownNumbers,
	sourceLinks = false,
	fixedRound = false,
}: {
	round?: number;
	source?: ActivitySource;
	initial?: ActivitySnapshot | null;
	ownNumbers?: readonly (readonly number[])[];
	sourceLinks?: boolean;
	fixedRound?: boolean;
} = $props();
const controller = createActivityController(
	(q, s) => fetchActivityInsights(getTrailbaseBrowserBaseUrl(), q, s),
	untrack(() => initial),
);
let view = $state(untrack(() => controller.getSnapshot()));
let kind = $state<ActivitySource>(untrack(() => source));
let period = $state<ActivityPeriod>("round");
let pickedRound = $state<number | undefined>(untrack(() => round));
let order = $state<"most" | "least" | "number">("most");
let all = $state(false);
let selected = $state<number | null>(null);
let detailOrder = $state<number[]>([]);
let saved = $state<{ round: number; numbers: readonly number[] }[]>([]);
onMount(() => {
	const stop = controller.subscribe(() => (view = controller.getSnapshot()));
	try {
		saved = parseGenerations(localStorage.getItem(SAVED_KEY));
	} catch {}
	return () => {
		stop();
		controller.stop();
	};
});
$effect(() => {
	const query = { round: fixedRound ? round : pickedRound, period };
	const refresh = () => {
		if (!document.hidden) void controller.select(query);
		else controller.stop();
	};
	untrack(refresh);
	const timer = setInterval(refresh, 15000);
	document.addEventListener("visibilitychange", refresh);
	return () => {
		clearInterval(timer);
		document.removeEventListener("visibilitychange", refresh);
		controller.stop();
	};
});
const snapshot = $derived(view.data);
const data = $derived(snapshot?.sources[kind]);
const ranked = $derived(data ? activityNumbers(data, order) : []);
const numbers = $derived(
	selected && detailOrder.length
		? detailOrder.flatMap((number) => ranked.filter((n) => n.number === number))
		: ranked,
);
const total = $derived(data ? sum(data.numberCounts) : 0);
const max = $derived(Math.max(1, ...numbers.map((n) => n.count)));
const detail = $derived(
	data && selected ? numberActivity(data, selected) : null,
);
const personal = $derived(
	ownNumbers ??
		saved.filter((g) => g.round === snapshot?.round).map((g) => g.numbers),
);
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
function selectNumber(number: number) {
	if (selected === number) {
		selected = null;
		return;
	}
	detailOrder = numbers.map((n) => n.number);
	selected = number;
}
function changeRound(next: number) {
	pickedRound = next;
	period = period === "day" ? "round" : period;
	selected = null;
}
</script>
{#snippet numberDetail()}{#if detail}<div class="section-row"><h3>{selected}번 자세히 보기</h3><button class="text-action" onclick={()=>selected=null}>닫기</button></div><p class="detail-lead">{detail.number.rank??'—'}위 · 비중 {percent(detail.number.share)}</p><h4>최근 회차별 비중</h4><dl class="data-list">{#each detail.trend as t (t.round)}<div><dt>{t.round}회</dt><dd>{t.available?`${t.count.toLocaleString()}회 · ${percent(t.share)}`:'수집 기록 없음'}</dd></div>{/each}</dl><h4>함께 등장한 번호</h4>{#if detail.pairs.length}<dl class="data-list">{#each detail.pairs as p (`${p.a}:${p.b}`)}<div><dt><SimpleBall number={p.a===selected?p.b:p.a} size="sm"/></dt><dd>{p.count.toLocaleString()}개 조합</dd></div>{/each}</dl>{:else}<p class="scope">번호 쌍 집계가 아직 없습니다.</p>{/if}<p class="scope">번호를 더 누르면 다른 번호도 비교할 수 있습니다.</p>{:else}<h3>번호 하나를 더 자세히</h3><p>번호를 누르면 최근 회차의 흐름과 함께 등장한 번호를 볼 수 있습니다.</p><div class="mini-grid">{#each numbers.slice(0,6) as n (n.number)}<button aria-label={`${n.number}번 상세 분석`} onclick={()=>void selectNumber(n.number)}><SimpleBall number={n.number} size="sm"/></button>{/each}</div>{/if}{/snippet}
<section class="activity" aria-label="생성·QR 스캔 번호 분석" aria-busy={view.loading}>
 <div class="sources" role="group" aria-label="집계 출처">{#if sourceLinks}<a class:chosen={kind==='generated'} href={`${resolve("/stats/activity/[source]",{source:"generated"})}${snapshot?`?round=${snapshot.round}`:""}`}>생성된 번호</a><a class:chosen={kind==='scanned'} href={`${resolve("/stats/activity/[source]",{source:"scanned"})}${snapshot?`?round=${snapshot.round}`:""}`}>QR 스캔 번호</a>{:else}<button class:chosen={kind==='generated'} aria-pressed={kind==='generated'} onclick={()=>{kind='generated';selected=null;}}>생성된 번호</button><button class:chosen={kind==='scanned'} aria-pressed={kind==='scanned'} onclick={()=>{kind='scanned';selected=null;}}>QR 스캔 번호</button>{/if}</div>
 {#if snapshot&&!fixedRound}<div class="round"><button disabled={snapshot.round<=1||view.loading} onclick={()=>changeRound(snapshot.round-1)} aria-label="이전 회차">←</button><label for="activity-round">회차 <select id="activity-round" value={snapshot.round} onchange={event=>changeRound(Number(event.currentTarget.value))}>{#each [...new Set([snapshot.round,...snapshot.knownRounds])] as r (r)}<option value={r}>{r}회</option>{/each}</select></label><button disabled={snapshot.round>=snapshot.currentRound||view.loading} onclick={()=>changeRound(snapshot.round+1)} aria-label="다음 회차">→</button></div>{/if}
 <div class="filters" role="group" aria-label="집계 기간">{#each ACTIVITY_PERIODS.filter(p=>p.value!=='day'||!snapshot||snapshot.round===snapshot.currentRound) as p (p.value)}<button class:chosen={period===p.value} aria-pressed={period===p.value} onclick={()=>{period=p.value;selected=null;}}>{p.label}</button>{/each}</div>
 {#if view.error}<div class="notice" role="alert"><p>{view.error}</p><button class="text-action" onclick={()=>void controller.refresh()}>다시 불러오기</button></div>{/if}
 {#if !data&&view.loading}<p class="notice" role="status">번호 분석을 불러오고 있어요.</p>{/if}
 {#if data&&snapshot}
  <div class="summary"><div><p class="eyebrow">{snapshot.round}회 기준 · {ACTIVITY_LABELS[kind]}</p><p class="metric">{data.records.toLocaleString()}<span>{period==='day'||kind==='generated'?'게임':'회 스캔'}</span></p></div><p class="scope">번호 등장 {total.toLocaleString()}회<br/>비중은 전체 번호 등장 횟수 기준입니다.</p></div>
  {#if total===0}<div class="notice"><h3>아직 모인 번호가 없어요</h3><p>이 회차에 기록이 모이면 순위와 분포를 볼 수 있습니다.</p></div>{:else}
  <div class="workspace"><div class="rankings"><div class="section-row"><h3>{order==='least'?'적게 등장한 번호':order==='number'?'번호별 등장 횟수':'많이 등장한 번호'}</h3><button class="text-action" onclick={()=>{all=!all;selected=null;}}>{all?'Top 10만':'전체 45개'}</button></div><div class="filters" role="group" aria-label="번호 정렬"><button class:chosen={order==='most'} aria-pressed={order==='most'} onclick={()=>{order='most';selected=null;}}>많은 순</button><button class:chosen={order==='least'} aria-pressed={order==='least'} onclick={()=>{order='least';selected=null;}}>적은 순</button><button class:chosen={order==='number'} aria-pressed={order==='number'} onclick={()=>{order='number';selected=null;}}>번호순</button></div>
   {#if selected}<p class="scope">상세를 보는 동안 목록 위치를 유지합니다. 닫으면 최신 순위로 정렬됩니다.</p>{/if}<ol class="ranking-list">{#each (all?numbers:numbers.filter(n=>order!=="most"||n.count>0).slice(0,10)) as n (n.number)}<li><button class:current={selected===n.number} onclick={()=>void selectNumber(n.number)} aria-expanded={selected===n.number} aria-label={`${n.number}번 ${n.count}회 등장, 상세 분석`}><span class="rank">{n.rank??'—'}</span><SimpleBall number={n.number} size="sm"/><span class="bar-column"><span class="bar"><span style:width={`${n.count/max*100}%`}></span></span><span class="caption">{percent(n.share)}{#if n.rankChange!==null&&period!=='all'&&period!=='day'} · {n.rankChange>0?'↑':n.rankChange<0?'↓':'—'}{n.rankChange?Math.abs(n.rankChange):''}{/if}</span></span><strong>{n.count.toLocaleString()}<small>회</small></strong></button>{#if selected===n.number}<div class="inspector mobile-detail">{@render numberDetail()}</div>{/if}</li>{/each}</ol>
  </div><aside class:selected-mobile={selected!==null} class="inspector" aria-label="번호 상세 분석">{@render numberDetail()}
  {#if snapshot.draw&&period==='round'}<div class="recap"><h4>추첨 후 돌아보기</h4><div class="balls">{#each snapshot.draw.numbers as n (n)}<SimpleBall number={n} size="sm"/>{/each}</div><p>많이 등장한 Top 10에 추첨 번호 <strong>{combinationActivity(data,snapshot.draw.numbers).topMatches.length}개</strong>가 포함됐습니다.</p><a href={`${resolve("/generator/results")}?round=${snapshot.round}`}>생성 조합의 등수별 결과 보기 →</a></div>{/if}
  {#if personal.length}<div class="personal"><h4>내 번호는 어떤 편일까?</h4>{#each personal.slice(0,3) as n,index (`${index}:${n.join('-')}`)}<div class="saved"><div class="balls">{#each n as ball (ball)}<SimpleBall number={ball} size="sm"/>{/each}</div><p class="scope">Top 10 번호 {combinationActivity(data,n).topMatches.length}개 포함</p></div>{/each}<p class="scope">이 기기에 보관한 해당 회차 번호를 비교합니다.</p></div>{/if}
  </aside></div>{/if}
  <div class="details-grid"><details><summary>생성과 스캔의 비중 차이</summary><p class="scope">표본 크기가 다른 두 출처를 번호 등장 비중으로 비교합니다.</p>{#if sum(snapshot.sources.generated.numberCounts)>0&&sum(snapshot.sources.scanned.numberCounts)>0}<dl class="data-list">{#each activityComparison(snapshot).slice(0,10) as n (n.number)}<div><dt><SimpleBall number={n.number} size="sm"/></dt><dd>생성 {percent(n.generatedShare)} · 스캔 {percent(n.scannedShare)}</dd></div>{/each}</dl>{:else}<p class="notice">두 출처 모두에 번호가 모이면 비교할 수 있습니다.</p>{/if}</details>
  <details><summary>함께 등장한 번호 Top 10</summary>{#if data.pairs.length}<dl class="data-list">{#each data.pairs.slice(0,10) as p (`${p.a}:${p.b}`)}<div><dt class="balls"><SimpleBall number={p.a} size="sm"/><SimpleBall number={p.b} size="sm"/></dt><dd>{p.count.toLocaleString()}개 조합</dd></div>{/each}</dl>{:else}<p class="notice">이 기간에 집계된 번호 쌍이 아직 없습니다.</p>{/if}</details>
  <details><summary>홀짝·연속번호·합계 분포</summary><p class="scope">패턴 집계 대상 {data.patterns.combinations.toLocaleString()}게임. 과거 번호별 합계와 집계 범위가 다를 수 있습니다.</p>{#if data.patterns.combinations}<dl class="data-list">{#each data.patterns.oddCounts as count,index (index)}<div><dt>홀 {index} : 짝 {6-index}</dt><dd>{percent(count/data.patterns.combinations)}</dd></div>{/each}<div><dt>연속번호 포함</dt><dd>{percent(data.patterns.withConsecutive/data.patterns.combinations)}</dd></div></dl><h4>번호 합계</h4><dl class="data-list">{#each data.patterns.sumCounts as count,index (index)}{#if count}<div><dt>{index*20}~{index*20+19}</dt><dd>{percent(count/data.patterns.combinations)}</dd></div>{/if}{/each}</dl>{:else}<p class="notice">{period==='day'?'24시간 보기에서는 번호별 집계를 제공합니다. 회차를 선택하면 패턴을 볼 수 있습니다.':'새 패턴 집계가 모이면 표시됩니다.'}</p>{/if}</details>
  <details><summary>번호 구간별 분포</summary><dl class="data-list">{#each [[1,10],[11,20],[21,30],[31,40],[41,45]] as [a,b] (a)}<div><dt>{a}~{b}번</dt><dd>{percent(total?sum(data.numberCounts.slice(a-1,b))/total:0)}</dd></div>{/each}</dl></details>
  <details><summary>시간별 활동</summary><p class="scope">최근 24시간 · 시간 단위로 새로 집계된 조합</p>{#if data.hours.length}<dl class="data-list">{#each data.hours as h (h.hour)}<div><dt>{new Date(h.hour+9*3600000).toISOString().slice(5,13).replace('T',' ')}시</dt><dd>{h.combinations.toLocaleString()}게임</dd></div>{/each}</dl>{:else}<p class="notice">최근 24시간에 집계된 조합이 없습니다.</p>{/if}</details></div>
  <p class="scope footer">통계 출처: 645.live · 중복 기록 포함 · 번호의 등장 빈도는 당첨 확률을 뜻하지 않습니다.</p>
 {/if}
</section>
<style>
.activity{display:grid;gap:1.25rem;color:var(--color-base-content)}button,select{font:inherit}button{cursor:pointer}button:disabled{opacity:.4;cursor:default}button:focus-visible,a:focus-visible,summary:focus-visible,select:focus-visible{outline:2px solid var(--color-primary);outline-offset:4px}.sources{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid var(--color-base-300)}.sources button,.sources a{display:flex;align-items:center;justify-content:center;text-decoration:none;min-height:52px;background:none;border:none;font-size:1rem;font-weight:650;color:inherit;border-bottom:3px solid transparent}.sources button.chosen,.sources a.chosen{color:var(--color-primary);border-bottom-color:var(--color-primary)}.filters{display:flex;flex-wrap:wrap;gap:.5rem}.filters button,.round button{min-height:44px;padding:.4rem .85rem;background:var(--color-base-200);border:0;border-radius:.5rem;color:inherit;font-size:.8rem}.filters button.chosen{background:color-mix(in oklch,var(--color-primary) 12%,var(--color-base-100));color:var(--color-primary);font-weight:650}.round{display:flex;align-items:center;justify-content:center;gap:1rem}.round select{background:var(--color-base-100);color:inherit;border:1px solid var(--color-base-300);border-radius:.5rem;padding:.5rem;min-height:44px}.summary{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:1.25rem 0;border-bottom:1px solid var(--color-base-300)}.eyebrow{font-size:.8rem;color:var(--color-primary);font-weight:600;margin:0 0 .5rem}.metric{font-size:clamp(2rem,4vw,3rem);font-weight:750;letter-spacing:-.04em;font-variant-numeric:tabular-nums;margin:0}.metric span{font-size:.85rem;font-weight:500;margin-left:.5rem;letter-spacing:0}.scope,.caption{font-size:.8rem;line-height:1.7;color:color-mix(in oklch,var(--color-base-content) 64%,transparent)}.scope{margin:0}.caption{display:block;margin-top:.3rem}.workspace{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:clamp(1.5rem,4vw,4rem)}.section-row{display:flex;justify-content:space-between;align-items:center;gap:.5rem;margin-bottom:1rem}h3{font-size:1.2rem;font-weight:700;margin:0}h4{font-size:.9rem;font-weight:650;margin:1.5rem 0 .85rem}.text-action{background:none;border:0;color:var(--color-primary);font-size:.8rem;min-height:44px;padding:.4rem}.ranking-list{list-style:none;padding:0;margin:1rem 0 0}.ranking-list>li>button{display:flex;align-items:center;gap:.8rem;min-height:72px;width:100%;padding:.75rem .25rem;background:none;border:0;border-bottom:1px solid var(--color-base-300);text-align:left;color:inherit}.ranking-list>li>button.current{background:var(--color-base-200)}.rank{width:1.25rem;text-align:center;font-size:.8rem;color:color-mix(in oklch,var(--color-base-content) 55%,transparent)}.bar-column{flex:1;min-width:0}.bar{display:block;height:6px;background:var(--color-base-200);border-radius:3px;overflow:hidden}.bar>span{display:block;height:100%;background:var(--color-primary);border-radius:3px;transition:width .3s}.ranking-list strong{font-size:.95rem;font-variant-numeric:tabular-nums;white-space:nowrap}.ranking-list small{font-size:.7rem;margin-left:.3rem;font-weight:400}.mobile-detail{display:none}.inspector{padding:1.5rem;background:var(--color-base-200);border-radius:1rem;align-self:start}.inspector>p{font-size:.85rem;line-height:1.8}.detail-lead{font-weight:600}.data-list{margin:.85rem 0 0}.data-list>div{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.65rem 0;border-bottom:1px solid var(--color-base-300);font-size:.8rem}.data-list dd{margin:0;text-align:right;font-variant-numeric:tabular-nums}.data-list dt{color:color-mix(in oklch,var(--color-base-content) 72%,transparent)}.mini-grid,.balls{display:flex;align-items:center;gap:.4rem;flex-wrap:wrap}.mini-grid{margin-top:1rem}.mini-grid button{background:none;border:0;min-height:44px;min-width:44px}.recap,.personal{border-top:1px solid var(--color-base-300);margin-top:1.5rem}.recap p{font-size:.85rem;line-height:1.8}.recap a{font-size:.8rem;color:var(--color-primary)}.saved{padding:.75rem 0}.details-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:2rem;margin-top:1.25rem}.details-grid details{padding:1rem 0;border-top:1px solid var(--color-base-300);min-width:0}.details-grid summary{font-size:.95rem;font-weight:650;cursor:pointer;min-height:44px;line-height:44px}.notice{padding:1.5rem 0;font-size:.9rem;line-height:1.8}.footer{padding-top:1rem}.notice h3{margin-bottom:.75rem}@media(max-width:700px){.mobile-detail{display:block;margin:1rem 0}.selected-mobile{display:none}.workspace,.details-grid{grid-template-columns:1fr}.summary{align-items:flex-start;flex-direction:column}.inspector{padding:1.25rem}.ranking-list>li>button{gap:.65rem}}@media(prefers-reduced-motion:reduce){.bar>span{transition:none}}
</style>
