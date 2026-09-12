<script lang="ts">
import { JsonLd, MetaTags } from "svelte-meta-tags";
import { resolve } from "$app/paths";
import AdSlot from "$lib/components/ads/AdSlot.svelte";
import {
	ColorBadge,
	LottoBall,
	StatsCard,
	StatsPageHero,
} from "$lib/components/stats";
import {
	createBreadcrumbSchema,
	createCollectionPageSchema,
	createOrganizationSchema,
	createWebSiteSchema,
	getGenericOgImage,
} from "$lib/seo/index.js";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();

const pageTitle = "로또 번호 통계 · 출현 횟수와 기간별 분포";
let selectedSnapshot = $state(0);
const pageDescription =
	"로또 6/45 번호별 출현 횟수와 홀짝·고저·색상·보너스 번호 통계를 확인하세요. 최근 10회·50회·100회와 전체 회차의 분포를 비교하고, 번호별 추첨 이력과 통계 반영 시점도 함께 살펴볼 수 있습니다.";
const topNumberSummary = $derived(
	data.topNumberStats[0] ?? {
		number: "-",
		draw_count: 0,
	},
);
const bottomNumberSummary = $derived(
	data.bottomNumberStats[0] ?? {
		number: "-",
		draw_count: 0,
	},
);
const ogImage = $derived(
	getGenericOgImage({
		title: "로또 6/45 통계 분석",
		description: `최근 로또 당첨 번호 패턴부터 번호별 출현 빈도까지 전체 ${data.totalRounds}회차 통계를 한곳에서 확인하세요.`,
		layout: "blog",
		theme: "dark",
	}),
);

const timestampFormatter = new Intl.DateTimeFormat("ko-KR", {
	dateStyle: "medium",
	timeStyle: "short",
	timeZone: "Asia/Seoul",
});

const formattedUpdatedAt = $derived(
	data.freshness.lastUpdatedAt
		? timestampFormatter.format(new Date(data.freshness.lastUpdatedAt))
		: "",
);
const heroSignals = $derived([
	{
		label: "최신 회차",
		value: data.latestRound > 0 ? `${data.latestRound}회차` : "-",
		note: data.latestDrawDate || "추첨일 확인 중",
	},
	{
		label: "누적 분석",
		value: `${data.totalRounds}회차`,
		note: "본 번호 6개 집계",
	},
	{
		label: "최다 출현",
		value:
			topNumberSummary.number !== "-" ? `${topNumberSummary.number}번` : "-",
		note:
			topNumberSummary.number !== "-"
				? `${topNumberSummary.draw_count}회 등장`
				: "데이터 확인 중",
	},
	{
		label: "최소 출현",
		value:
			bottomNumberSummary.number !== "-"
				? `${bottomNumberSummary.number}번`
				: "-",
		note:
			bottomNumberSummary.number !== "-"
				? `${bottomNumberSummary.draw_count}회 등장`
				: "데이터 확인 중",
	},
]);
const summaryCards = $derived([
	{
		label: "최근 10회",
		copy: data.summarySnapshots.recent10,
	},
	{
		label: "최근 50회",
		copy: data.summarySnapshots.recent50,
	},
	{
		label: "최근 100회",
		copy: data.summarySnapshots.recent100,
	},
	{
		label: `전체 ${data.totalRounds}회차`,
		copy: data.summarySnapshots.overall,
	},
]);
const bonusTopSummary = $derived(data.bonusAnalysis.topBonusNumber);
const latestBonusSummary = $derived(data.bonusAnalysis.latestBonusDraw);

const collectionSchema = createCollectionPageSchema({
	path: "/stats",
	name: "로또 6/45 통계 분석",
	description:
		"번호별 출현 빈도, 홀짝, 고저, 색상, 번호쌍, AC값까지 로또 통계를 종합 분석하는 페이지",
});
const breadcrumbSchema = createBreadcrumbSchema([
	{ name: "홈", path: "/" },
	{ name: "로또 통계", path: "/stats" },
]);

const faqItems = [
	{
		question: "최근 로또 당첨 번호 패턴은 어떻게 해석하면 되나요?",
		answer:
			"최근 로또 당첨 번호 패턴은 극단적으로 한쪽에 치우친 조합이 있는지, 홀짝과 고저가 비교적 균형에 가까운 조합이 더 자주 나타나는 흐름이 보이는지 참고해서 보실 수 있습니다. 다만 최근 10회처럼 짧은 구간에서는 일시적인 쏠림이 생길 수 있어, 최근 10회·50회·100회와 전체 회차를 함께 보는 것이 좋습니다.",
	},
	{
		question: "최근 자주 나온 번호가 다음 회차에도 유리한가요?",
		answer:
			"아니요. 각 추첨은 독립적이므로 과거에 자주 나왔다는 사실이 다음 추첨의 개별 번호 확률을 높이지 않습니다. 출현 빈도는 선택한 기간의 과거 결과를 요약한 값입니다.",
	},
	{
		question: "홀짝 분석과 고저 분석은 어떻게 다른가요?",
		answer:
			"홀짝 분석은 당첨번호 6개 중 홀수와 짝수의 비율을 보는 통계이고, 고저 분석은 낮은 번호 구간과 높은 번호 구간의 분포를 보는 통계입니다. 두 지표를 함께 보면 최근 회차가 균형형인지 편중형인지 더 쉽게 파악할 수 있습니다.",
	},
	{
		question: "최근 10회와 최근 100회 분석 결과가 다른 이유는 무엇인가요?",
		answer:
			"최근 10회는 단기 흐름을 보여주고, 최근 100회는 더 넓은 범위의 평균적인 패턴을 보여줍니다. 짧은 구간은 변동성이 크기 때문에, 단기 분석과 장기 분석을 함께 비교해야 현재 흐름을 더 정확하게 이해할 수 있습니다.",
	},
	{
		question: "QR 스캔 인기 번호와 실제 당첨번호 패턴은 같은 의미인가요?",
		answer:
			"아닙니다. QR 스캔 집계는 이 사이트에 등록된 용지의 번호를 집계하고, 당첨번호 통계는 공식 추첨 결과를 집계합니다. 스캔 데이터는 전체 구매자의 선택을 대표하지 않습니다.",
	},
	{
		question: "통계로 로또 번호를 예측할 수 있나요?",
		answer:
			"아니요. 이 통계는 과거 추첨 결과의 분포를 보여줍니다. 공정한 추첨에서는 모든 6개 번호 조합의 당첨 확률이 같으며, 과거 결과가 다음 추첨의 확률을 바꾸지 않습니다.",
	},
	{
		question: "보너스 번호는 왜 따로 보나요?",
		answer:
			"보너스 번호는 2등 판정에 직접 사용되고, 회차마다 1개만 추첨되기 때문에 본 번호 통계와 다른 흐름을 보일 수 있습니다. 그래서 본 번호와 분리해서 보고, 필요할 때는 보너스 포함 통계까지 함께 비교하는 것이 좋습니다.",
	},
];

const faqSchema = {
	"@type": "FAQPage",
	mainEntity: faqItems.map((item) => ({
		"@type": "Question",
		name: item.question.trim(),
		acceptedAnswer: {
			"@type": "Answer",
			text: item.answer.trim(),
		},
	})),
};

const statsCategories = [
	{
		href: "/stats/numbers",
		icon: "🔢",
		title: "번호별 통계",
		description: "자주 나온 번호와 적게 나온 번호 전체 보기",
	},
	{
		href: "/stats/odd-even",
		icon: "⚖️",
		title: "홀짝 분석",
		description: "최근 로또 홀짝 패턴 자세히 보기",
	},
	{
		href: "/stats/colors",
		icon: "🎨",
		title: "색상 분포",
		description: "최근 로또 색상 분포 자세히 보기",
	},
	{
		href: "/stats/sections",
		icon: "📊",
		title: "구간별 분석",
		description: "번호 구간별 분포 자세히 보기",
	},
	{
		href: "/stats/high-low",
		icon: "📈",
		title: "고저 패턴",
		description: "최근 로또 고저 패턴 자세히 보기",
	},
	{
		href: "/stats/pairs",
		icon: "👥",
		title: "번호 쌍",
		description: "함께 자주 나온 번호쌍 보기",
	},
	{
		href: "/stats/repeat",
		icon: "🔄",
		title: "회차 간 중복",
		description: "직전 회차와 겹친 번호 보기",
	},
	{
		href: "/stats/unit-digit",
		icon: "🔟",
		title: "끝수 분석",
		description: "끝수 분포 통계 보기",
	},
	{
		href: "/stats/bonus",
		icon: "⭐",
		title: "보너스 번호",
		description: "많이 나온 보너스 번호와 최근 흐름 보기",
	},
	{
		href: "/stats/ac",
		icon: "🧮",
		title: "AC값",
		description: "최근 AC값 패턴 자세히 보기",
	},
] as const;
</script>

<MetaTags
	title={pageTitle}
	titleTemplate="%s | 645.live"
	description={pageDescription}
	canonical="https://645.live/stats"
	keywords={["로또통계", "로또분석", "로또당첨번호", "번호별통계", "홀짝분석", "고저분석", "로또패턴", "AC값", "로또허브"]}
	robots="index,follow"
	additionalRobotsProps={{
		maxSnippet: 320,
		maxImagePreview: "large",
		maxVideoPreview: 60,
	}}
	openGraph={{
		type: "website",
		url: "https://645.live/stats",
		title: pageTitle,
		description: pageDescription,
		locale: "ko_KR",
		images: [ogImage],
		siteName: "645.live",
	}}
	twitter={{
		cardType: "summary_large_image",
		site: "@645live",
		title: pageTitle,
		description: pageDescription,
		image: ogImage.url,
		imageAlt: ogImage.alt,
	}}
/>

<JsonLd schema={collectionSchema} />
<JsonLd schema={breadcrumbSchema} />
<JsonLd schema={createOrganizationSchema()} />
<JsonLd schema={createWebSiteSchema()} />
<JsonLd schema={faqSchema} />

<div class="stats-page stats-hub">
	<StatsPageHero
		eyebrow="공식 추첨 통계"
		title="로또 번호 통계"
		description="번호별 출현 횟수와 회차별 분포를 확인하세요."
		freshness={data.freshness}
		metrics={heroSignals}
	/>

	<nav class="analysis-nav" aria-label="통계 항목">
		{#each statsCategories as category (category.href)}
			<a href={resolve(category.href)}>{category.title}</a>
		{/each}
	</nav>

	<section aria-labelledby="frequency-heading">
		<div class="section-head">
			<div><h2 id="frequency-heading">번호별 출현 횟수</h2><p>전체 {data.totalRounds}회 본 번호 기준</p></div>
			<a href={resolve("/stats/numbers")}>45개 번호 모두 보기 <span aria-hidden="true">→</span></a>
		</div>
		<div class="frequency-columns">
			<div>
				<h3>많이 나온 번호</h3>
				{#each data.topNumberStats.slice(0, 5) as stat, index (stat.number)}
					<div class="number-row">
						<span class="rank">{index + 1}</span>
						<LottoBall number={stat.number} href={`/stats/numbers/${stat.number}`} interactive />
						<div class="frequency-track" aria-hidden="true"><span style={`width: ${topNumberSummary.draw_count ? stat.draw_count / topNumberSummary.draw_count * 100 : 0}%`}></span></div>
						<strong>{stat.draw_count}<span>회</span></strong>
					</div>
				{:else}<p class="empty">번호 통계를 불러오지 못했어요.</p>{/each}
			</div>
			<div>
				<h3>적게 나온 번호</h3>
				{#each data.bottomNumberStats.slice(0, 5) as stat, index (stat.number)}
					<div class="number-row">
						<span class="rank">{index + 1}</span>
						<LottoBall number={stat.number} href={`/stats/numbers/${stat.number}`} interactive />
						<div class="frequency-track" aria-hidden="true"><span style={`width: ${topNumberSummary.draw_count ? stat.draw_count / topNumberSummary.draw_count * 100 : 0}%`}></span></div>
						<strong>{stat.draw_count}<span>회</span></strong>
					</div>
				{:else}<p class="empty">번호 통계를 불러오지 못했어요.</p>{/each}
			</div>
		</div>
		<p class="data-note">과거 출현 횟수는 다음 추첨에서 개별 번호가 나올 가능성을 높이지 않습니다.</p>
	</section>

	<AdSlot placement="stats-inline" format="horizontal" />

	<section class="snapshot-section" aria-labelledby="snapshot-heading">
		<div class="section-head"><h2 id="snapshot-heading">기간별 요약</h2></div>
		<div class="snapshot-tabs" role="group" aria-label="요약 기간">
			{#each summaryCards as item, index (item.label)}
				<button type="button" class:active={selectedSnapshot === index} aria-pressed={selectedSnapshot === index} onclick={() => selectedSnapshot = index}>{item.label}</button>
			{/each}
		</div>
		<p class="snapshot-copy">{summaryCards[selectedSnapshot].copy}</p>
		<div class="snapshot-links">
			<a href={resolve(selectedSnapshot === 3 ? "/stats/odd-even" : `/stats/odd-even/recent/${[10, 50, 100][selectedSnapshot]}`)}>홀짝 분포 보기 →</a>
			<a href={resolve(selectedSnapshot === 3 ? "/stats/high-low" : `/stats/high-low/recent/${[10, 50, 100][selectedSnapshot]}`)}>고저 분포 보기 →</a>
		</div>
	</section>

	<div class="detail-columns">
		<section>
			<div class="section-head"><h2>최근 홀짝 분포</h2><a href={resolve("/stats/odd-even")}>상세 →</a></div>
			{#each data.recentOddEvenStats.slice(0, 5) as stat (stat.round)}
				<div class="data-row"><span>{stat.round}회</span><strong>홀수 {stat.odd_count} <span class="divider-text">/</span> 짝수 {stat.even_count}</strong></div>
			{/each}
		</section>
		<section>
			<div class="section-head"><h2>최근 색상 분포</h2><a href={resolve("/stats/colors")}>상세 →</a></div>
			{#each data.recentColorStats.slice(0, 5) as stat (stat.round)}
				<div class="data-row">
					<span>{stat.round}회</span>
					<div class="color-row">
						<ColorBadge color="yellow" count={stat.yellow_count} /><ColorBadge color="blue" count={stat.blue_count} /><ColorBadge color="red" count={stat.red_count} /><ColorBadge color="grey" count={stat.grey_count} /><ColorBadge color="green" count={stat.green_count} />
					</div>
				</div>
			{/each}
		</section>
		<section>
			<div class="section-head"><h2>함께 나온 번호쌍</h2><a href={resolve("/stats/pairs")}>상세 →</a></div>
			{#each data.topPairStats.slice(0, 5) as stat (`${stat.number_a}-${stat.number_b}`)}
				<div class="data-row">
					<div class="pair-row"><LottoBall number={stat.number_a} href={`/stats/numbers/${stat.number_a}`} /><span class="divider-text">+</span><LottoBall number={stat.number_b} href={`/stats/numbers/${stat.number_b}`} /></div>
					<strong>{stat.pair_count}회</strong>
				</div>
			{/each}
		</section>
		<section>
			<div class="section-head"><h2>보너스 번호</h2><a href={resolve("/stats/bonus")}>상세 →</a></div>
			<div class="data-row"><span>최근 보너스</span>{#if latestBonusSummary}<div class="pair-row"><span>{latestBonusSummary.round}회</span><LottoBall number={latestBonusSummary.bonus_number} href={`/stats/numbers/${latestBonusSummary.bonus_number}`} /></div>{:else}<span>확인 중</span>{/if}</div>
			<div class="data-row"><span>최다 출현</span>{#if bonusTopSummary}<div class="pair-row"><strong>{bonusTopSummary.bonus_count}회</strong><LottoBall number={bonusTopSummary.number} href={`/stats/numbers/${bonusTopSummary.number}`} /></div>{:else}<span>확인 중</span>{/if}</div>
			<p class="data-note">{data.bonusAnalysis.recent100Summary || "보너스 번호는 본 번호와 분리해 집계합니다."}</p>
		</section>
	</div>

	<section aria-labelledby="all-analysis-heading">
		<div class="section-head"><h2 id="all-analysis-heading">다른 통계 살펴보기</h2></div>
		<div class="category-list">{#each statsCategories as category (category.href)}<StatsCard href={category.href} title={category.title} description={category.description} />{/each}</div>
	</section>

	<section aria-labelledby="stats-faq-heading">
		<div class="section-head"><h2 id="stats-faq-heading">통계, 이렇게 읽으세요</h2></div>
		<div class="faq-list">
			{#each faqItems as item (item.question)}
				<details><summary>{item.question}</summary><p>{item.answer}</p></details>
			{/each}
		</div>
	</section>

	<div class="tools-links">
		<a href={resolve("/qr-scan")}><strong>내 티켓 당첨 확인</strong><span>카메라나 사진으로 QR 확인 →</span></a>
		<a href={resolve("/generator")}><strong>조건에 맞는 번호 만들기</strong><span>포함수·제외수·홀짝 조건 설정 →</span></a>
	</div>
	{#if formattedUpdatedAt}<footer class="data-note">통계 갱신: {formattedUpdatedAt}</footer>{/if}
</div>

<style>
	.analysis-nav { display: flex; gap: 0.4rem; overflow-x: auto; padding-bottom: 0.3rem; scrollbar-width: thin; }
	.analysis-nav a { display: inline-flex; align-items: center; flex-shrink: 0; min-height: 2.75rem; padding: 0.65rem 0.85rem; border: 1px solid var(--color-base-300); border-radius: 0.5rem; font-size: 0.8125rem; font-weight: 600; background: var(--color-base-100); transition: background 140ms ease; }
	.analysis-nav a:hover { background: var(--color-base-200); color: var(--color-primary); }
	.section-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 0.4rem 1rem; margin-bottom: 1rem; }
	.section-head h2 { font-size: var(--section-title-size); font-weight: 750; line-height: 1.4; letter-spacing: -0.02em; }
	.section-head p { margin-top: 0.3rem; font-size: 0.8125rem; color: color-mix(in oklab, var(--color-base-content) 68%, transparent); }
	.section-head a, .snapshot-links a { font-size: 0.8125rem; font-weight: 600; color: var(--color-primary); }
	.frequency-columns { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
	h3 { font-size: 0.875rem; font-weight: 650; margin-bottom: 0.55rem; }
	.number-row { display: flex; align-items: center; gap: 0.5rem; min-height: 3.25rem; border-bottom: 1px solid var(--color-base-300); }
	.rank { color: color-mix(in oklab, var(--color-base-content) 60%, transparent); font-size: 0.75rem; width: 0.6rem; }
	.number-row strong { margin-left: auto; font-size: 0.9375rem; font-weight: 650; font-variant-numeric: tabular-nums; white-space: nowrap; }
	.number-row strong span { margin-left: 0.1rem; font-size: 0.75rem; font-weight: 400; }
	.frequency-track { display: none; height: 0.3rem; flex: 1; background: var(--color-base-200); border-radius: 1rem; overflow: hidden; }
	.frequency-track span { display: block; height: 100%; background: var(--color-primary); border-radius: inherit; opacity: 0.75; }
	.data-note { margin-top: 0.85rem; font-size: 0.8125rem; line-height: 1.65; color: color-mix(in oklab, var(--color-base-content) 70%, transparent); }
	.snapshot-section { border-block: 1px solid var(--color-base-300); padding-block: 1.5rem; }
	.snapshot-tabs { display: flex; flex-wrap: wrap; gap: 0.4rem; }
	.snapshot-tabs button { min-height: 2.75rem; border-radius: 0.5rem; padding: 0.6rem 0.75rem; font-size: 0.8125rem; font-weight: 600; background: var(--color-base-200); transition: background 140ms ease; cursor: pointer; }
	.snapshot-tabs .active { background: var(--color-primary); color: var(--color-primary-content); }
	.snapshot-copy { margin-top: 1rem; max-width: var(--reading-width); font-size: var(--body-copy-size); line-height: var(--body-copy-line-height); }
	.snapshot-links { margin-top: 0.75rem; display: flex; flex-wrap: wrap; gap: 1rem; }
	.detail-columns { display: grid; gap: var(--section-space); }
	.data-row { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; min-height: 3.25rem; padding-block: 0.35rem; border-bottom: 1px solid var(--color-base-300); font-size: 0.875rem; font-variant-numeric: tabular-nums; }
	.data-row strong { font-weight: 600; }
	.color-row, .pair-row { display: flex; align-items: center; gap: 0.4rem; }
	.divider-text { color: color-mix(in oklab, var(--color-base-content) 45%, transparent); padding-inline: 0.15rem; }
	.category-list { display: grid; gap: 0 1.5rem; }
	.faq-list { border-top: 1px solid var(--color-base-300); }
	details { border-bottom: 1px solid var(--color-base-300); }
	summary { padding-block: 1rem; cursor: pointer; font-size: 0.9375rem; font-weight: 600; }
	details p { max-width: var(--reading-width); padding-bottom: 1rem; font-size: var(--body-copy-size); line-height: var(--body-copy-line-height); color: color-mix(in oklab, var(--color-base-content) 76%, transparent); }
	.tools-links { display: grid; gap: 0.75rem; }
	.tools-links a { display: grid; gap: 0.4rem; padding: 1rem; background: var(--color-base-200); border-radius: 0.65rem; }
	.tools-links strong { font-size: 0.9375rem; }
	.tools-links span { color: color-mix(in oklab, var(--color-base-content) 70%, transparent); font-size: 0.8125rem; }
	.empty { font-size: 0.875rem; color: color-mix(in oklab, var(--color-base-content) 70%, transparent); }
	a:focus-visible, button:focus-visible, summary:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 3px; }
	@media (min-width: 640px) { .frequency-track { display: block; } .frequency-columns { gap: 2rem; } .category-list { grid-template-columns: repeat(2, minmax(0, 1fr)); } .tools-links { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
	@media (min-width: 900px) { .detail-columns { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2.5rem; } .category-list { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
	@media (prefers-reduced-motion: reduce) { .analysis-nav a, .snapshot-tabs button { transition: none; } }
</style>
