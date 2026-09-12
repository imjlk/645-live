<script lang="ts">
import { JsonLd, MetaTags } from "svelte-meta-tags";
import { goto } from "$app/navigation";
import { resolve } from "$app/paths";
import AdSlot from "$lib/components/ads/AdSlot.svelte";
import {
	absoluteUrl,
	createBreadcrumbSchema,
	createCollectionPageSchema,
	getGenericOgImage,
} from "$lib/seo/index.js";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();
let loading = $state(false);
let rank = $state("all");
let region = $state("all");
let search = $state("");
const regions = $derived(
	[
		...new Set(
			data.initialStores
				.map((store) => store.address.trim().split(/\s+/)[0])
				.filter(Boolean),
		),
	].sort(),
);
const filteredStores = $derived(
	data.initialStores.filter(
		(store) =>
			(rank === "all" || store.win_type === rank) &&
			(region === "all" || store.address.trim().split(/\s+/)[0] === region) &&
			(!search.trim() ||
				`${store.store_name} ${store.address}`
					.toLocaleLowerCase()
					.includes(search.trim().toLocaleLowerCase())),
	),
);

async function selectRound(round: number) {
	loading = true;
	try {
		await goto(resolve(`/winning-stores?round=${round}`), { noScroll: true });
		region = "all";
	} finally {
		loading = false;
	}
}

const canonicalUrl = absoluteUrl("/winning-stores");
const pageTitle = "로또 1등·2등 당첨 판매점과 주소 조회";
const pageDescription =
	"로또 6/45 회차별 1등·2등 당첨 판매점 이름과 주소, 자동·수동 선택 방식을 확인하세요. 회차와 등수, 지역을 선택하거나 상호와 주소로 검색해 원하는 판매점을 찾고 해당 회차의 당첨번호도 함께 확인할 수 있습니다.";
const ogImage = getGenericOgImage({
	title: pageTitle,
	description: "회차·등수·지역으로 찾는 로또 당첨 판매점",
	layout: "blog",
	theme: "dark",
});
</script>

<MetaTags title={pageTitle} titleTemplate="%s | 645.live" description={pageDescription} canonical={canonicalUrl}
	openGraph={{ type: "website", url: canonicalUrl, title: pageTitle, description: pageDescription, siteName: "645.live", images: [ogImage] }}
	twitter={{ cardType: "summary_large_image", title: pageTitle, description: pageDescription, image: ogImage.url, imageAlt: ogImage.alt }} />
<JsonLd schema={createCollectionPageSchema({ path: "/winning-stores", name: pageTitle, description: pageDescription })} />
<JsonLd schema={createBreadcrumbSchema([{ name: "홈", path: "/" }, { name: "당첨 판매점", path: "/winning-stores" }])} />

<div class="content-page stores-page">
	<header class="page-header"><div><h1>당첨 판매점</h1><p>회차와 지역을 골라 1등·2등 판매점을 찾아보세요.</p></div>
		{#if data.initialRound}<a href={resolve(`/history?round=${data.initialRound}`)} class="btn btn-outline">{data.initialRound}회 당첨 결과 <span aria-hidden="true">↗</span></a>{/if}
	</header>
	<div class="store-filters" aria-label="당첨 판매점 검색 조건">
		<label for="store-round">회차<select id="store-round" class="select" value={data.initialRound} disabled={loading} onchange={(event) => selectRound(Number(event.currentTarget.value))}>
			{#each data.availableRounds as round (round)}<option value={round}>{round}회{round === data.latestRound ? " · 최신" : ""}</option>{/each}
		</select></label>
		<label for="store-rank">등수<select id="store-rank" class="select" bind:value={rank}><option value="all">전체 등수</option><option value="1등">1등</option><option value="2등">2등</option></select></label>
		<label for="store-region">지역<select id="store-region" class="select" bind:value={region}><option value="all">전체 지역</option>{#each regions as item (item)}<option value={item}>{item}</option>{/each}</select></label>
		<label class="search-field" for="store-search">판매점 검색<input id="store-search" class="input" type="search" placeholder="판매점 이름 또는 주소" bind:value={search} /></label>
	</div>
	{#if data.error}<div class="alert alert-error" role="alert">{data.error}</div>
	{:else}
		<section aria-busy={loading} aria-labelledby="stores-heading">
			<div class="results-heading"><div><h2 id="stores-heading">제{data.initialRound}회 판매점</h2><p>1등 {data.initialStatistics.firstPlace}건 · 2등 {data.initialStatistics.secondPlace}건</p></div><p class="result-count" aria-live="polite">{loading ? "불러오는 중…" : `${filteredStores.length.toLocaleString()}건 표시`}</p></div>
			{#if filteredStores.length > 0}
				<ol class="store-list">
					{#each filteredStores as store, index (store.id)}
						<li class="store-row"><span class="rank-label" class:first-rank={store.win_type === "1등"}>{store.win_type}</span><div class="store-details"><h3>{store.store_name}</h3><p>{store.address}</p></div><span class="selection-type">{store.selection_type || "방식 미제공"}</span></li>
						{#if index === 9 && filteredStores.length > 10}<li class="store-ad"><AdSlot placement="stores-inline" format="horizontal" /></li>{/if}
					{/each}
				</ol>
				{#if filteredStores.length <= 10}<AdSlot placement="stores-inline" format="horizontal" />{/if}
			{:else}
				<div class="empty-state"><h3>{data.initialStores.length ? "조건에 맞는 판매점이 없어요" : "아직 판매점 정보가 등록되지 않았어요"}</h3><p>{data.initialStores.length ? "등수나 지역을 바꾸거나 검색어를 지워보세요." : "다른 회차를 선택해 당첨 판매점을 확인할 수 있습니다."}</p>{#if data.initialStores.length}<button class="btn btn-outline" onclick={() => { rank = "all"; region = "all"; search = ""; }}>검색 조건 초기화</button>{/if}</div>
			{/if}
			<p class="footnote">표시된 건수는 등록된 당첨 판매 내역 기준입니다. 같은 판매점이 여러 번 포함될 수 있으며, 과거 당첨 이력은 다음 추첨의 당첨 확률을 높이지 않습니다.</p>
		</section>
	{/if}
</div>

<style>
.page-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
.page-header > div { min-width: 0; flex: 1 1 20rem; }
.stores-page .btn { min-height: 2.75rem; }
.store-filters { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem .75rem; margin-bottom: var(--section-space); }
.store-filters label { display: flex; flex-direction: column; gap: .4rem; font-size: .8rem; font-weight: 600; min-width: 0; }
.select, .input { width: 100%; min-width: 0; min-height: 2.75rem; }
.results-heading { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: .75rem; padding-bottom: 1rem; border-bottom: 1px solid var(--color-base-300); }
.results-heading h2 { font-size: var(--section-title-size); font-weight: 700; }
.results-heading p { font-size: .8rem; color: color-mix(in oklch, var(--color-base-content) 65%, transparent); margin-top: .35rem; }
.results-heading .result-count { color: var(--color-base-content); font-weight: 600; }
.store-list { padding: 0; list-style: none; }
.store-row { display: grid; grid-template-columns: 2.5rem minmax(0, 1fr) auto; align-items: start; gap: .75rem; padding: 1.2rem 0; border-bottom: 1px solid var(--color-base-300); }
.rank-label { display: inline-grid; place-items: center; min-height: 1.65rem; background: var(--color-base-200); border-radius: .4rem; font-size: .75rem; font-weight: 700; }
.first-rank { color: var(--color-primary); background: color-mix(in oklch, var(--color-primary) 10%, transparent); }
.store-details h3 { font-size: .95rem; font-weight: 650; line-height: 1.55; overflow-wrap: anywhere; }
.store-details p { margin-top: .35rem; font-size: .825rem; line-height: 1.6; color: color-mix(in oklch, var(--color-base-content) 65%, transparent); word-break: keep-all; overflow-wrap: anywhere; }
.selection-type { font-size: .75rem; padding-top: .25rem; color: color-mix(in oklch, var(--color-base-content) 65%, transparent); }
.store-ad { padding-block: .5rem; }
.empty-state { padding: 3rem 0; }
.empty-state h3 { font-size: var(--section-title-size); font-weight: 650; }
.empty-state p, .footnote { font-size: .825rem; color: color-mix(in oklch, var(--color-base-content) 65%, transparent); line-height: 1.7; }
.empty-state p { margin: .5rem 0 1rem; }
.footnote { max-width: var(--reading-width); margin-top: 1.5rem; }
@media(max-width: 479px) { .store-filters label[for="store-region"], .search-field { grid-column: 1 / -1; } .store-row { grid-template-columns: 2.5rem minmax(0, 1fr); gap: .4rem .75rem; } .selection-type { grid-column: 2; } }
@media(min-width: 768px) { .store-filters { grid-template-columns: minmax(0, 1fr) minmax(0, .75fr) minmax(0, .9fr) minmax(0, 1.6fr); } .store-row { padding: 1.3rem 0; gap: 1.25rem; } }
</style>
