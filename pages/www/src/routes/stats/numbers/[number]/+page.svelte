<script lang="ts">
import { JsonLd, MetaTags } from "svelte-meta-tags";
import { resolve } from "$app/paths";
import AdSlot from "$lib/components/ads/AdSlot.svelte";
import { LottoBall, StatsPageHero } from "$lib/components/stats";
import { getGenericOgImage } from "$lib/seo/index.js";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();
const selected = $derived(data.selectedNumber);
const colorDetail = $derived(
	data.colorInfo[data.numberStats.color as keyof typeof data.colorInfo],
);
const bonusExpectedCount = $derived(data.totalRounds / 45);
const bonusDeviation = $derived(
	data.numberStats.bonus_count - bonusExpectedCount,
);
const totalAppearances = $derived(data.totalAppearances);
const bonusShare = $derived(
	totalAppearances > 0
		? ((data.numberStats.bonus_count / totalAppearances) * 100).toFixed(1)
		: "0.0",
);
const pageTitle = $derived(`로또 ${selected}번 출현 횟수와 최근 추첨 이력`);
const pageDescription = $derived(
	`로또 6/45 ${selected}번의 전체 ${data.totalRounds}회 추첨 기록을 확인하세요. 본 번호로 ${data.numberStats.draw_count}회, 보너스로 ${data.numberStats.bonus_count}회 나왔으며 마지막 본 번호 출현은 ${data.numberStats.last_draw_round}회입니다. 최근 출현 이력과 기대값 대비 차이를 함께 비교할 수 있습니다.`,
);
const ogImage = $derived(
	getGenericOgImage({
		title: pageTitle,
		description: pageDescription,
		layout: "minimal",
		theme: "dark",
	}),
);
const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	timeZone: "Asia/Seoul",
});
</script>

<MetaTags title={pageTitle} titleTemplate="%s | 645.live" description={pageDescription} canonical={`https://645.live/stats/numbers/${selected}`}
	openGraph={{ type: "website", title: pageTitle, description: pageDescription, url: `https://645.live/stats/numbers/${selected}`, siteName: "645.live", locale: "ko_KR", images: [ogImage] }}
	twitter={{ cardType: "summary_large_image", title: pageTitle, description: pageDescription, image: ogImage.url, imageAlt: ogImage.alt }}
/>

<JsonLd schema={{
	"@type": "Dataset", name: pageTitle, description: pageDescription,
	url: `https://645.live/stats/numbers/${selected}`,
	creator: { "@type": "Organization", name: "645.live" },
	license: "https://645.live/terms-of-service",
	variableMeasured: [
		{ "@type": "PropertyValue", name: "본 번호 출현 횟수", value: data.numberStats.draw_count },
		{ "@type": "PropertyValue", name: "보너스 출현 횟수", value: data.numberStats.bonus_count },
		{ "@type": "PropertyValue", name: "본 번호 출현율", value: `${data.numberStats.averageFrequency}%` },
		{ "@type": "PropertyValue", name: "마지막 본 번호 출현 회차", value: data.numberStats.last_draw_round }
	]
}} />

<div class="stats-page number-detail">
	<nav class="breadcrumb" aria-label="현재 위치"><a href={resolve("/stats")}>통계</a><span aria-hidden="true">/</span><a href={resolve("/stats/numbers")}>번호별 통계</a><span aria-hidden="true">/</span><span>{selected}번</span></nav>
	<StatsPageHero
		eyebrow="공식 추첨 통계"
		title={`${selected}번 출현 기록`}
		description={`본 번호와 보너스의 출현 횟수를 구분해 확인하세요. ${colorDetail?.name ?? ""} 구간 · ${selected % 2 === 0 ? "짝수" : "홀수"} · ${data.isHighNumber ? "23~45 고구간" : "1~22 저구간"}`}
		freshness={data.freshness}
		metrics={[
			{ label: "본 번호 출현", value: `${data.numberStats.draw_count}회`, note: `전체 ${data.totalRounds}회 기준` },
			{ label: "보너스 출현", value: `${data.numberStats.bonus_count}회`, note: "본 번호와 별도 집계" },
			{ label: "본 번호 출현율", value: `${data.numberStats.averageFrequency}%`, note: "출현 회차 ÷ 전체 회차" },
			{ label: "마지막 본 번호", value: `${data.numberStats.last_draw_round}회`, note: "가장 최근 출현 회차" }
		]}
	/>

	<div class="number-controls">
		<nav aria-label="이전 다음 번호">
			{#if selected > 1}<a href={resolve("/stats/numbers/[number]", { number: String(selected - 1) })}>← {selected - 1}번</a>{/if}
			<a href={resolve("/stats/numbers")}>전체 번호</a>
			{#if selected < 45}<a href={resolve("/stats/numbers/[number]", { number: String(selected + 1) })}>{selected + 1}번 →</a>{/if}
		</nav>
		<details><summary>번호 선택</summary><div class="number-picker">
			{#each Array.from({ length: 45 }, (_, i) => i + 1) as number (number)}
				<a href={resolve("/stats/numbers/[number]", { number: String(number) })} class:current={selected === number} aria-current={selected === number ? "page" : undefined} aria-label={`${number}번 추첨 통계`}>{number}</a>
			{/each}
		</div></details>
	</div>

	<AdSlot placement="stats-inline" format="horizontal" />

	<section aria-labelledby="recent-draws-heading">
		<div class="section-heading"><h2 id="recent-draws-heading">최근 출현 이력</h2><p>본 번호·보너스로 등장한 최근 20개 기록</p></div>
		{#if data.recentDraws.length > 0}
			<!-- Keyboard users need a focusable horizontal scroll region. -->
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<div class="draw-table-scroll" tabindex="0" role="region" aria-label="최근 출현 이력 표, 가로 스크롤 가능">
				<table class="table table-zebra draw-table">
					<thead><tr><th scope="col">회차 / 추첨일</th><th scope="col">당첨번호</th><th scope="col">보너스</th><th scope="col">출현 유형</th></tr></thead>
					<tbody>{#each data.recentDraws as draw (draw.round)}
						<tr>
							<th scope="row"><a href={resolve(`/history?round=${draw.round}`)}>{draw.round}회</a><small>{dateFormatter.format(new Date(draw.drawDate))}</small></th>
							<td><div class="winning-numbers">{#each [...draw.numbers].sort((a, b) => a - b) as number (number)}<span class:highlight={number === selected}><LottoBall {number} size="small" /></span>{/each}</div></td>
							<td><span class:highlight={draw.bonusNumber === selected}><LottoBall number={draw.bonusNumber} size="small" /></span></td>
							<td>{draw.isMain ? "본 번호" : "보너스"}</td>
						</tr>
					{/each}</tbody>
				</table>
			</div>
		{:else}<p class="muted">최근 출현 기록을 불러오지 못했어요.</p>{/if}
	</section>

	<div class="analysis-columns">
		<section>
			<div class="section-heading"><h2>기대값과의 차이</h2></div>
			<dl class="comparison-list">
				<div><dt>실제 본 번호 출현</dt><dd>{data.numberStats.draw_count}회</dd></div>
				<div><dt>이론적 기대값</dt><dd>{data.numberStats.expectedFrequency}회</dd></div>
				<div><dt>실제 횟수 − 기대값</dt><dd>{Number(data.numberStats.deviation) > 0 ? "+" : ""}{data.numberStats.deviation}회</dd></div>
			</dl>
			<p class="muted">본 번호 기대값은 전체 {data.totalRounds}회 × 6 ÷ 45입니다. 이 차이는 과거 추첨 결과의 편차이며, 다음 회차에 보정되어 나오는 값이 아닙니다.</p>
		</section>
		<section>
			<div class="section-heading"><h2>보너스 출현 비교</h2><a href={resolve("/stats/bonus")}>보너스 통계 →</a></div>
			<dl class="comparison-list">
				<div><dt>본 번호 + 보너스</dt><dd>{totalAppearances}회</dd></div>
				<div><dt>합산 중 보너스 비중</dt><dd>{bonusShare}%</dd></div>
				<div><dt>보너스 기대값과의 차이</dt><dd>{bonusDeviation > 0 ? "+" : ""}{bonusDeviation.toFixed(1)}회</dd></div>
			</dl>
			<p class="muted">보너스는 회차마다 1개이므로 기대값은 {bonusExpectedCount.toFixed(1)}회입니다. 본 번호 출현 횟수와 계산 기준이 다릅니다.</p>
		</section>
	</div>

	<p class="interpretation">과거 출현 빈도는 다음 추첨에서 개별 번호가 나올 가능성을 높이지 않습니다.</p>
	<footer><a href={resolve("/n/[index]", { index: String(selected) })}>{selected}번의 스캔 집계 보기 →</a><a href={resolve("/stats")}>다른 통계 살펴보기 →</a></footer>
</div>

<style>
	.breadcrumb { display: flex; flex-wrap: wrap; gap: 0.5rem; font-size: 0.8125rem; color: color-mix(in oklab, var(--color-base-content) 68%, transparent); }
	.number-controls { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: flex-start; justify-content: space-between; }
	.number-controls nav { display: flex; flex-wrap: wrap; gap: 0.4rem; }
	.number-controls nav a, summary { display: inline-flex; align-items: center; min-height: 2.75rem; padding: 0.6rem 0.8rem; border: 1px solid var(--color-base-300); border-radius: 0.5rem; font-size: 0.8125rem; font-weight: 600; cursor: pointer; }
	.number-picker { display: grid; grid-template-columns: repeat(6, 2.75rem); gap: 0.35rem; padding-top: 0.75rem; }
	.number-picker a { display: grid; place-items: center; min-height: 2.75rem; border: 1px solid var(--color-base-300); border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600; font-variant-numeric: tabular-nums; }
	.number-picker .current { background: var(--color-primary); border-color: var(--color-primary); color: var(--color-primary-content); }
	.section-heading { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 0.4rem 1rem; margin-bottom: 1rem; }
	h2 { font-size: 1.125rem; font-weight: 700; letter-spacing: -0.02em; }
	.section-heading p, .section-heading a { font-size: 0.8125rem; }
	.section-heading p { color: color-mix(in oklab, var(--color-base-content) 68%, transparent); }
	.section-heading a { color: var(--color-primary); font-weight: 600; }
	.draw-table-scroll { overflow-x: auto; border-block: 1px solid var(--color-base-300); }
	.draw-table { min-width: 29rem; }
	.draw-table th { white-space: nowrap; }
	.draw-table th a { color: var(--color-primary); }
	.draw-table small { display: block; margin-top: 0.3rem; color: color-mix(in oklab, var(--color-base-content) 65%, transparent); font-size: 0.75rem; font-weight: 400; }
	.winning-numbers { display: flex; align-items: center; gap: 0.4rem; }
	.highlight { display: inline-flex; outline: 2px solid var(--color-primary); outline-offset: 2px; border-radius: 50%; }
	.analysis-columns { display: grid; gap: 1.5rem; }
	.comparison-list > div { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; padding-block: 0.85rem; border-bottom: 1px solid var(--color-base-300); }
	dt { font-size: 0.875rem; color: color-mix(in oklab, var(--color-base-content) 75%, transparent); }
	dd { font-weight: 650; font-size: 0.9375rem; font-variant-numeric: tabular-nums; white-space: nowrap; }
	.muted { margin-top: 0.85rem; font-size: 0.8125rem; line-height: 1.7; color: color-mix(in oklab, var(--color-base-content) 72%, transparent); }
	.interpretation { padding: 1rem; border-radius: 0.6rem; background: var(--color-base-200); font-size: 0.875rem; line-height: 1.65; }
	footer { display: flex; flex-wrap: wrap; gap: 1rem; color: var(--color-primary); font-size: 0.875rem; font-weight: 600; }
	a:focus-visible, summary:focus-visible, .draw-table-scroll:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 3px; }
	@media (min-width: 768px) { .analysis-columns { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2rem; } }
</style>
