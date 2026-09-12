<script lang="ts">
import { onMount } from "svelte";
import { JsonLd, MetaTags } from "svelte-meta-tags";
import { browser } from "$app/environment";
import { resolve } from "$app/paths";
import { page } from "$app/state";
import AdSlot from "$lib/components/ads/AdSlot.svelte";
import StructuredAgentPage from "$lib/components/agent/StructuredAgentPage.svelte";
import SimpleBall from "$lib/components/SimpleBall.svelte";
import ScanStatusGrid from "$lib/modules/lotto/components/ScanStatusGrid.svelte";
import {
	createOrganizationSchema,
	createWebSiteSchema,
	getGenericOgImage,
	SITE_NAME,
	SITE_ORIGIN,
} from "$lib/seo";
import { trackEvent } from "$lib/utils/analytics";
import {
	calculateExpectedLatestRound,
	type LottoDrawResult,
} from "$lib/utils/lotto-common";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();
type HomeDraw = Omit<LottoDrawResult, "totSellamnt">;
let liveDraw = $state<HomeDraw | null>(null);
let clientDisplayRound = $state<number | null>(null);
const displayRound = $derived(clientDisplayRound ?? data.displayRound);
const scanRound = $derived.by(() => {
	const requested = browser
		? Number(page.url.searchParams.get("scanRound"))
		: 0;
	return Number.isInteger(requested) &&
		requested > 0 &&
		requested <= displayRound
		? requested
		: displayRound;
});
function trackScanEntry() {
	trackEvent("qr_scan_cta", { location: "home_live" });
}
const draw = $derived(
	liveDraw && (!data.latestDraw || liveDraw.drwNo >= data.latestDraw.drwNo)
		? liveDraw
		: data.latestDraw,
);
const latestRound = $derived(Math.max(draw?.drwNo ?? 0, data.latestRound ?? 0));
const agentMode = $derived(
	data.agentMode || (browser && page.url.searchParams.get("mode") === "agent"),
);

function parseLatestDraw(snapshot: unknown): HomeDraw | null {
	if (!snapshot || typeof snapshot !== "object") return null;
	const payload = snapshot as { latestRound?: unknown; rounds?: unknown };
	if (!Number.isInteger(payload.latestRound) || !Array.isArray(payload.rounds))
		return null;
	const row = payload.rounds.find(
		(item) => item?.round === payload.latestRound,
	);
	if (
		!row ||
		row.round < 1 ||
		!Array.isArray(row.numbers) ||
		row.numbers.length !== 6
	)
		return null;
	const numbers = row.numbers as unknown[];
	if (
		!numbers.every(
			(number) =>
				Number.isInteger(number) && Number(number) >= 1 && Number(number) <= 45,
		) ||
		new Set(numbers).size !== 6
	)
		return null;
	if (
		!Number.isInteger(row.bonusNumber) ||
		row.bonusNumber < 1 ||
		row.bonusNumber > 45 ||
		numbers.includes(row.bonusNumber)
	)
		return null;
	if (
		typeof row.drawDate !== "string" ||
		!/^\d{4}-\d{2}-\d{2}$/.test(row.drawDate) ||
		!Number.isFinite(Date.parse(row.drawDate))
	)
		return null;
	if (
		!Number.isFinite(row.firstPrizeAmount) ||
		row.firstPrizeAmount < 0 ||
		!Number.isInteger(row.firstPrizeWinnerCount) ||
		row.firstPrizeWinnerCount < 0
	)
		return null;
	if (row.firstPrizeWinnerCount > 0 && row.firstPrizeAmount === 0) return null;
	const [drwtNo1, drwtNo2, drwtNo3, drwtNo4, drwtNo5, drwtNo6] =
		numbers as number[];
	return {
		drwNo: row.round,
		drwNoDate: row.drawDate,
		drwtNo1,
		drwtNo2,
		drwtNo3,
		drwtNo4,
		drwtNo5,
		drwtNo6,
		bnusNo: row.bonusNumber,
		firstWinamnt: row.firstPrizeAmount,
		firstPrzwnerCo: row.firstPrizeWinnerCount,
	};
}

onMount(() => {
	let activeRequest: AbortController | null = null;
	let lastRequestedAt = 0;
	const refresh = async () => {
		clientDisplayRound = calculateExpectedLatestRound();
		if (activeRequest || Date.now() - lastRequestedAt < 60_000) return;
		lastRequestedAt = Date.now();
		const controller = new AbortController();
		activeRequest = controller;
		const timeout = setTimeout(() => controller.abort(), 10_000);
		try {
			const response = await fetch(resolve("/api/lotto-draws-recent.json"), {
				signal: controller.signal,
				cache: "no-cache",
			});
			if (!response.ok) return;
			const latest = parseLatestDraw(await response.json());
			if (
				latest &&
				!controller.signal.aborted &&
				latest.drwNo >= (draw?.drwNo ?? 0)
			)
				liveDraw = latest;
		} catch {
			// Keep the complete draw embedded in static HTML during transient API failures.
		} finally {
			clearTimeout(timeout);
			activeRequest = null;
		}
	};
	const onFocus = () => {
		if (document.visibilityState === "visible") void refresh();
	};
	void refresh();
	window.addEventListener("focus", onFocus);
	window.addEventListener("online", onFocus);
	document.addEventListener("visibilitychange", onFocus);
	return () => {
		activeRequest?.abort();
		window.removeEventListener("focus", onFocus);
		window.removeEventListener("online", onFocus);
		document.removeEventListener("visibilitychange", onFocus);
	};
});
const numbers = $derived(
	draw
		? [
				draw.drwtNo1,
				draw.drwtNo2,
				draw.drwtNo3,
				draw.drwtNo4,
				draw.drwtNo5,
				draw.drwtNo6,
			]
		: [],
);
const pageTitle = $derived(
	agentMode
		? "645.live API·에이전트 연동 안내"
		: "로또 당첨번호·QR 확인·번호 통계 | 645.live",
);
const description = $derived(
	agentMode
		? "645.live 공개 로또 조회 API와 MCP, 데이터 출처, 회원 스캔 연동 경로를 확인하세요. 최근 회차 결과와 번호 통계를 구조화된 형식으로 조회하고, 서비스 문서와 인증 안내에서 필요한 연동 정보를 찾을 수 있습니다."
		: "645.live에서 로또 6/45 최신 당첨번호와 실시간 QR 스캔 현황, 번호 통계, 당첨 판매점을 확인하세요. 용지 QR이나 사진으로 당첨 여부를 확인하면 번호별 집계에 반영되며, 로그인하면 스캔 내역을 계정에 저장할 수 있습니다.",
);
const canonical = $derived(
	agentMode ? `${SITE_ORIGIN}/?mode=agent` : SITE_ORIGIN,
);
const ogImage = $derived(
	getGenericOgImage({
		title: "로또 당첨번호와 QR 확인",
		description: "최신 결과부터 번호 통계까지, 645.live",
		theme: "dark",
		layout: "hero",
	}),
);
const amountLabel = $derived.by(() => {
	if (!draw || !Number.isFinite(draw.firstWinamnt)) return "확인 중";
	if (draw.firstPrzwnerCo === 0) return "당첨자 없음";
	const amount = Math.floor(draw.firstWinamnt / 10000);
	const eok = Math.floor(amount / 10000);
	const man = amount % 10000;
	return `${eok > 0 ? `${eok}억 ` : ""}${man.toLocaleString()}만 원`;
});
const faq = [
	{
		question: "당첨 결과와 스캔 현황은 어떻게 다른가요?",
		answer:
			"당첨 결과는 공식 추첨 번호를, 스캔 현황은 이 사이트에 등록된 티켓의 번호별 집계를 보여줍니다. 스캔 집계는 전체 구매자의 선택을 대표하지 않습니다.",
	},
	{
		question: "로그인 없이도 당첨 여부를 확인할 수 있나요?",
		answer:
			"QR 스캔과 사진으로 당첨 여부를 확인할 수 있습니다. 로그인하면 스캔 기록을 계정에 저장해 다시 확인할 수 있습니다.",
	},
	{
		question: "많이 나온 번호가 다음에도 유리한가요?",
		answer:
			"과거 출현 빈도는 다음 추첨에서 개별 번호가 나올 가능성을 높이지 않습니다. 통계는 과거 결과를 비교하는 자료입니다.",
	},
];
</script>
<MetaTags title={pageTitle} {description} {canonical} robots={agentMode ? "noindex,follow" : "index,follow"}
 openGraph={{type:"website",url:canonical,title:pageTitle,description,siteName:SITE_NAME,locale:"ko_KR",images:[ogImage]}}
 twitter={{cardType:"summary_large_image",title:pageTitle,description,image:ogImage.url,imageAlt:ogImage.alt}} />
<JsonLd schema={createOrganizationSchema()} /><JsonLd schema={createWebSiteSchema()} />
{#if agentMode}
 <div class="content-page"><StructuredAgentPage page={data.agentPage} /></div>
{:else}
 <div class="content-page home-page">
  <div class="home-columns">
   <div class="home-primary">
    <section class="draw-result" aria-labelledby="draw-title">
     <div class="result-context"><span>최근 발표 결과</span>{#if draw}<time datetime={draw.drwNoDate}>{draw.drwNoDate.replaceAll("-", ".")} 추첨</time>{/if}</div>
     <h1 id="draw-title">{draw ? `제${draw.drwNo}회 당첨번호` : "로또 당첨 결과"}</h1>
     {#if draw}
      <div class="winning-numbers" aria-label="당첨번호">
       {#each numbers as number (number)}<SimpleBall {number} size="lg" />{/each}
       <span class="plus" aria-hidden="true">+</span>
       <div class="bonus"><SimpleBall number={draw.bnusNo} size="lg" /><span>보너스</span></div>
      </div>
      <div class="prize-summary"><div><span>1등 1인당 당첨금</span><strong>{amountLabel}</strong><small>세전 · 만 원 미만 절사</small></div><div><span>1등 당첨자</span><strong>{draw.firstPrzwnerCo.toLocaleString()}<small>명</small></strong></div></div>
     {:else}
      <div class="empty-result"><p>당첨 결과를 불러오지 못했어요.</p><a class="link link-primary" href={resolve("/history")}>회차별 결과 확인하기</a></div>
     {/if}
     <p class="data-note">공식 추첨 결과 기준 · <a href={resolve("/data-sources")}>데이터 출처</a>{#if draw}<a href={resolve(`/history?round=${draw.drwNo}`)}>회차 상세 보기 ↗</a>{/if}</p>
    </section>
    <section id="live-scans" class="home-section live-scans" aria-labelledby="scan-heading">
     <div class="section-heading"><h2 id="scan-heading">함께 모으는 실시간 스캔 현황</h2><span class="section-label">{scanRound}회 · 사이트 등록 기준</span></div>
     <p class="scan-description">용지 QR을 확인하면 내 번호가 이 현황판에 반영돼요.<br />다른 이용자가 등록한 번호도 새로고침 없이 함께 볼 수 있어요.</p>
     <div class="scan-actions"><a class="btn btn-primary" href={resolve("/qr-scan?from=home-live")} onclick={trackScanEntry}>내 로또 QR 스캔하기 <span aria-hidden="true">→</span></a><span>로그인 없이 확인 · 사진으로도 가능</span></div>
     {#if scanRound !== displayRound}<p class="scan-round-note">제{scanRound}회에 등록된 스캔을 보고 있어요. <a class="text-link" href={resolve("/#live-scans")}>현재 판매 회차 보기 →</a></p>{/if}
     <ScanStatusGrid initialRound={scanRound} {latestRound} headlineRound={scanRound} allowFallbackPreview={false} showHeader={true} forceClientRefresh={true} gridColumns={{mobile:5,tablet:9,desktop:9,large:9}} />
     <p class="scan-scope">645.live에 등록된 QR 기준입니다. 전체 구매자의 선택이나 다음 당첨 확률을 의미하지 않습니다.</p>
    </section>
    <AdSlot placement="home-inline" format="horizontal" />
    <section class="home-section" aria-labelledby="explore-heading">
     <div class="section-heading"><h2 id="explore-heading">숫자로 보는 로또</h2><a href={resolve("/stats")} class="text-link">전체 통계 ↗</a></div>
     <div class="explore-links">
      <a href={resolve("/stats/numbers")}><strong>번호별 출현 빈도</strong><span>1번부터 45번까지, 과거 추첨 기록 비교</span><b aria-hidden="true">↗</b></a>
      <a href={resolve("/stats/odd-even")}><strong>최근 회차의 홀짝 분포</strong><span>최근 10회부터 전체 회차까지 비교</span><b aria-hidden="true">↗</b></a>
      <a href={resolve("/winning-stores")}><strong>회차별 당첨 판매점</strong><span>1등·2등 당첨점과 주소 확인</span><b aria-hidden="true">↗</b></a>
     </div>
    </section>
    {#if data.newsPosts.length > 0}
     <section class="home-section" aria-labelledby="news-heading"><div class="section-heading"><h2 id="news-heading">회차별 소식</h2><a href={resolve("/news")} class="text-link">모든 소식 ↗</a></div><div class="home-news">{#each data.newsPosts as post (post.slug)}<a href={resolve("/news/posts/[slug]", { slug: post.slug })}><time datetime={post.date}>{post.date}</time><h3>{post.title}</h3><p>{post.description}</p></a>{/each}</div></section>
    {/if}
   </div>
   <aside class="home-aside" aria-label="회차 안내와 광고">
    <section class="round-context"><span class="section-label">스캔 집계 회차</span><h2>제{displayRound}회</h2><p>구매한 용지의 QR로 당첨 여부와 스캔 기록을 확인하세요.</p><a class="text-link" href={resolve("/qr-scan")}>내 로또 확인하기 →</a></section>
    <AdSlot placement="home-rail" format="rectangle" />
    <div class="trust-note"><strong>데이터를 구분해서 봅니다</strong><p>당첨 통계는 추첨 결과,<br />스캔 현황은 이용자 등록 데이터입니다.</p><a href={resolve("/methodology")}>통계 기준과 읽는 법 ↗</a></div>
   </aside>
  </div>
  <section class="home-faq home-section" aria-labelledby="faq-heading"><h2 id="faq-heading">이용 전 알아두세요</h2>{#each faq as item (item.question)}<details><summary>{item.question}</summary><p>{item.answer}</p></details>{/each}</section>
 </div>
{/if}
<style>
 .home-columns { display: grid; grid-template-columns: minmax(0,1fr) 300px; gap: 3rem; }
 .home-primary { min-width: 0; }
 .result-context { display: flex; gap: 1rem; flex-wrap: wrap; color: var(--text-muted); font-size: 0.8125rem; }
 .result-context>span { font-weight: 600; }
 h1 { margin-block: 0.6rem 1rem; font-size: clamp(1.4rem,2.7vw,2rem); font-weight: 780; letter-spacing: -0.05em; line-height: 1.25; }
 .winning-numbers { display: flex; align-items: start; gap: 0.6rem; margin-bottom: 1rem; }
 .bonus { display: flex; align-items: center; flex-direction: column; gap: 0.5rem; }
 .bonus>span { color: var(--text-muted); font-size: 0.75rem; }
 .plus { align-self: start; line-height: 4rem; color: var(--text-muted); }
 .prize-summary { display: flex; flex-wrap: wrap; gap: 1.5rem 3rem; margin-bottom: 0.75rem; }
 .prize-summary>div { display: flex; flex-direction: column; gap: 0.5rem; }
 .prize-summary span { color: var(--text-muted); font-size: 0.8125rem; }
 .prize-summary strong { font-size: clamp(1.2rem,2.3vw,1.5rem); letter-spacing: -0.035em; font-variant-numeric: tabular-nums; }
 .prize-summary small { font-size: 0.75rem; color: var(--text-muted); font-weight: 400; }
 .prize-summary strong small { margin-left: 0.35rem; font-size: 0.9375rem; }
 .data-note { display: flex; flex-wrap: wrap; gap: 0.5rem; font-size: 0.75rem; color: var(--text-muted); margin-top: 1rem; line-height: 1.75; }
 .data-note a:hover { text-decoration: underline; }
 .home-section { margin-top: var(--section-space); padding-top: 1.75rem; border-top: 1px solid var(--color-base-300); }
 .scan-description { color: var(--text-muted); font-size: 0.875rem; line-height: 1.75; }
 .live-scans { margin-top: 1.75rem; scroll-margin-top: 6rem; }
 .live-scans .section-heading h2 { font-size: clamp(1.25rem,2.5vw,1.6rem); letter-spacing: -0.045em; }
 .scan-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 0.75rem 1rem; margin-block: 1.1rem 1.5rem; }
 .scan-actions .btn { min-height: 48px; padding-inline: 1.2rem; }
 .scan-actions>span, .scan-scope { color: var(--text-muted); font-size: 0.75rem; line-height: 1.7; }
 .scan-round-note { margin-bottom: 1rem; font-size: 0.8125rem; line-height: 1.7; }
 .scan-scope { margin-top: 0.5rem; }
 .empty-result { padding: 2rem 0; line-height: 2; }
 .text-link { color: var(--color-primary); font-size: 0.875rem; font-weight: 600; }
 .explore-links a { display: grid; grid-template-columns: 1fr auto; padding-block: 1rem; gap: 0.3rem 1rem; border-bottom: 1px solid var(--color-base-300); }
 .explore-links a:last-child { border-bottom: 0; }
 .explore-links span { font-size: 0.875rem; color: var(--text-muted); grid-column: 1; }
 .explore-links b { grid-column: 2; grid-row: 1 / 3; align-self: center; color: var(--color-primary); }
 .home-news>a { display: block; padding-block: 1.2rem; border-bottom: 1px solid var(--color-base-300); }
 .home-news time { font-size: 0.75rem; color: var(--text-muted); }
 .home-news h3 { font-size: 1.05rem; font-weight: 650; margin-block: 0.5rem; }
 .home-news p { font-size: 0.875rem; line-height: 1.7; color: var(--text-muted); }
 .home-news a:hover h3, .explore-links a:hover strong { color: var(--color-primary); }
 .round-context { background: var(--color-base-200); padding: 1.5rem; border-radius: 0.75rem; }
 .round-context h2 { font-size: 1.85rem; font-weight: 750; margin-block: 0.8rem; letter-spacing: -0.04em; }
 .round-context p, .trust-note p { color: var(--text-muted); font-size: 0.875rem; line-height: 1.75; margin-bottom: 1rem; }
 .trust-note { margin-top: 2rem; font-size: 0.8125rem; }
 .trust-note p { margin-top: 0.7rem; }
 .trust-note a { color: var(--color-primary); }
 .home-faq h2 { font-size: 1.2rem; font-weight: 700; margin-bottom: 1rem; }
 .home-faq details { border-bottom: 1px solid var(--color-base-300); }
 .home-faq summary { padding: 1.1rem 0; font-size: 0.9375rem; font-weight: 600; }
 .home-faq p { color: var(--text-muted); line-height: 1.85; padding-bottom: 1.25rem; max-width: 75ch; font-size: 0.9375rem; }
 @media (max-width: 1023px) { .home-columns { grid-template-columns: 1fr; } .home-aside { display: none; } }
 @media (max-width: 600px) {
  .winning-numbers { gap: 0.3rem; }
  .winning-numbers :global(.simple-ball) { width: clamp(2.05rem,9.2vw,3rem); height: clamp(2.05rem,9.2vw,3rem); font-size: 1rem; }
  .plus { line-height: 2.6rem; font-size: 0.875rem; }
  .prize-summary { gap: 2rem; }
  .scan-actions .btn { width: 100%; font-size: 0.9375rem; }
 }
</style>
