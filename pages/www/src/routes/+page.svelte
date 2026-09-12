<script lang="ts">
import { resolve } from "$app/paths";
import { JsonLd, MetaTags } from "svelte-meta-tags";
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
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();
const draw = $derived(data.latestDraw);
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
	data.agentMode
		? "645.live API·에이전트 연동 안내"
		: "로또 당첨번호·QR 확인·번호 통계 | 645.live",
);
const description = $derived(
	data.agentMode
		? "645.live 공개 로또 조회 API와 MCP, 데이터 출처, 회원 스캔 연동 경로를 확인하세요. 최근 회차 결과와 번호 통계를 구조화된 형식으로 조회하고, 서비스 문서와 인증 안내에서 필요한 연동 정보를 찾을 수 있습니다."
		: "645.live에서 로또 6/45 최신 당첨번호와 회차별 결과, 번호 통계, 당첨 판매점 정보를 확인하세요. 용지 QR 스캔이나 사진으로 당첨 여부를 확인하고, 로그인하면 스캔 내역을 계정에 저장할 수 있습니다.",
);
const canonical = $derived(
	data.agentMode ? `${SITE_ORIGIN}/?mode=agent` : SITE_ORIGIN,
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
<MetaTags title={pageTitle} {description} {canonical} robots={data.agentMode ? "noindex,follow" : "index,follow"}
 openGraph={{type:"website",url:canonical,title:pageTitle,description,siteName:SITE_NAME,locale:"ko_KR",images:[ogImage]}}
 twitter={{cardType:"summary_large_image",title:pageTitle,description,image:ogImage.url,imageAlt:ogImage.alt}} />
<JsonLd schema={createOrganizationSchema()} /><JsonLd schema={createWebSiteSchema()} />
{#if data.agentMode}
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
     <div class="primary-actions"><a class="btn btn-primary" href={resolve("/qr-scan")}>QR로 당첨 확인</a><a class="btn btn-outline" href={resolve("/generator")}>번호 만들기</a></div>
     <p class="data-note">공식 추첨 결과 기준 · <a href={resolve("/data-sources")}>데이터 출처</a>{#if draw}<a href={`${resolve("/history")}?round=${draw.drwNo}`}>회차 상세 보기 ↗</a>{/if}</p>
    </section>
    <AdSlot placement="home-inline" format="horizontal" />
    <section class="home-section" aria-labelledby="scan-heading">
     <div class="section-heading"><h2 id="scan-heading">이번 회차 스캔 현황</h2><span class="section-label">{data.displayRound}회 · 사이트 등록 기준</span></div>
     {#if data.latestRoundHasScanData}
      <details class="scan-details"><summary>번호별 스캔 집계 보기</summary><ScanStatusGrid initialRound={data.displayRound} latestRound={data.latestRound} headlineRound={data.displayRound} latestRoundHasScanData={true} allowFallbackPreview={false} showHeader={true} forceClientRefresh={true} gridColumns={{mobile:5,tablet:9,desktop:9,large:9}} /></details>
     {:else}
      <div class="empty-scan"><strong>아직 등록된 스캔이 없어요</strong><p>첫 스캔이 등록되면 번호별 집계가 표시됩니다.</p><a href={resolve("/qr-scan")} class="link link-primary">내 로또 확인하기 →</a></div>
     {/if}
    </section>
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
    <section class="round-context"><span class="section-label">스캔 집계 회차</span><h2>제{data.displayRound}회</h2><p>구매한 용지의 QR로 당첨 여부와 스캔 기록을 확인하세요.</p><a class="text-link" href={resolve("/qr-scan")}>내 로또 확인하기 →</a></section>
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
 h1 { margin-block: 0.8rem 1.75rem; font-size: clamp(1.75rem,3.2vw,2.5rem); font-weight: 780; letter-spacing: -0.05em; line-height: 1.25; }
 .winning-numbers { display: flex; align-items: start; gap: 0.6rem; margin-bottom: 1.75rem; }
 .bonus { display: flex; align-items: center; flex-direction: column; gap: 0.5rem; }
 .bonus>span { color: var(--text-muted); font-size: 0.75rem; }
 .plus { align-self: start; line-height: 4rem; color: var(--text-muted); }
 .prize-summary { border-top: 1px solid var(--color-base-300); padding-top: 1.5rem; display: flex; gap: 3rem; margin-bottom: 1.75rem; }
 .prize-summary>div { display: flex; flex-direction: column; gap: 0.5rem; }
 .prize-summary span { color: var(--text-muted); font-size: 0.8125rem; }
 .prize-summary strong { font-size: clamp(1.35rem,2.8vw,1.85rem); letter-spacing: -0.035em; font-variant-numeric: tabular-nums; }
 .prize-summary small { font-size: 0.75rem; color: var(--text-muted); font-weight: 400; }
 .prize-summary strong small { margin-left: 0.35rem; font-size: 0.9375rem; }
 .primary-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; }
 .primary-actions .btn { min-height: 48px; padding-inline: 1.25rem; }
 .data-note { display: flex; flex-wrap: wrap; gap: 0.5rem; font-size: 0.75rem; color: var(--text-muted); margin-top: 1rem; line-height: 1.75; }
 .data-note a:hover { text-decoration: underline; }
 .home-section { margin-top: var(--section-space); padding-top: 1.75rem; border-top: 1px solid var(--color-base-300); }
 .empty-scan { padding: 1.5rem; border-radius: 0.75rem; background: var(--color-base-200); }
 .empty-scan strong { font-size: 0.9375rem; }
 .empty-scan p { color: var(--text-muted); font-size: 0.875rem; line-height: 1.75; margin-top: 0.4rem; }
 .empty-scan a { display: inline-block; margin-top: 0.8rem; font-size: 0.875rem; }
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
 .scan-details summary { padding: 0.8rem 0; font-weight: 600; }
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
  .primary-actions .btn { font-size: 0.875rem; padding-inline: 1rem; }
 }
</style>
