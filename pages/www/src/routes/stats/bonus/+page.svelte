<script lang="ts">
	import {
		LottoBall,
		StatsPageHero,
		StatsSummary,
		StatsTable,
	} from "$lib/components/stats";
	import {
		createBreadcrumbSchema,
		createCollectionPageSchema,
		createOrganizationSchema,
		createWebSiteSchema,
		getGenericOgImage,
	} from "$lib/seo/index.js";
	import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";
	import LinkButton from "$lib/ui/LinkButton.svelte";
	import { JsonLd, MetaTags } from "svelte-meta-tags";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	const analysis = $derived(data.bonusAnalysis);
	const pageTitle = "로또 보너스 번호 통계 | 많이 나온 보너스 번호·최근 흐름 분석";
	const pageDescription =
		"역대 로또 보너스 번호 출현 횟수와 최근 10·50·100회 흐름을 확인하세요. 많이 나온 보너스 번호, 적게 나온 번호, 본 번호와의 차이, 보너스 포함 통계를 한 번에 비교합니다.";
	const ogImage = $derived(
		getGenericOgImage({
			title: "로또 보너스 번호 통계",
			description: `최신 ${analysis.latestRound}회차 기준 보너스 번호 흐름과 출현 순위를 한 화면에서 비교하세요.`,
			layout: "blog",
			theme: "dark",
		}),
	);

	const breadcrumbItems = [
		{ label: "홈", href: "/" },
		{ label: "통계", href: "/stats" },
		{ label: "보너스 번호", href: "/stats/bonus", current: true },
	];

	const breadcrumbSchema = createBreadcrumbSchema([
		{ name: "홈", path: "/" },
		{ name: "로또 통계", path: "/stats" },
		{ name: "보너스 번호 통계", path: "/stats/bonus" },
	]);
	const collectionSchema = createCollectionPageSchema({
		path: "/stats/bonus",
		name: "로또 보너스 번호 통계",
		description: pageDescription,
	});

	const faqItems = [
		{
			question: "보너스 번호는 무엇인가요?",
			answer:
				"보너스 번호는 각 회차에서 6개 본 번호와 별도로 추첨되는 일곱 번째 번호이며, 2등 판정에 직접 사용됩니다.",
		},
		{
			question: "보너스 번호 통계는 어떻게 해석하면 되나요?",
			answer:
				"보너스 번호 통계는 특정 번호가 보너스로 자주 등장했는지, 최근 10·50·100회 흐름에서 어떤 구간과 색상이 상대적으로 많았는지 살펴보는 참고 지표입니다.",
		},
		{
			question: "본 번호 통계와 보너스 번호 통계는 왜 따로 보나요?",
			answer:
				"보너스 번호는 회차마다 1개만 추첨되기 때문에 본 번호 통계와 기대값이 다릅니다. 두 통계를 함께 비교하면 특정 번호가 본 번호에 강한지, 보너스에서 상대적으로 자주 보이는지 구분할 수 있습니다.",
		},
		{
			question: "보너스 포함 합산 순위는 무엇을 뜻하나요?",
			answer:
				"본 번호 출현 횟수와 보너스 출현 횟수를 합친 값으로, 어떤 번호가 전체 추첨 결과에서 얼마나 자주 등장했는지 한 번에 비교하기 위한 지표입니다.",
		},
		{
			question: "보너스 번호 흐름이 다음 회차 예측에 도움이 되나요?",
			answer:
				"보너스 번호 흐름은 과거 데이터를 해석하는 데는 도움이 되지만, 다음 회차 당첨을 보장하지는 않습니다. 이 페이지의 통계는 참고용으로 보는 것이 가장 적절합니다.",
		},
	];

	const faqSchema = {
		"@type": "FAQPage",
		mainEntity: faqItems.map((item) => ({
			"@type": "Question",
			name: item.question,
			acceptedAnswer: {
				"@type": "Answer",
				text: item.answer,
			},
		})),
	};

	function getColorClass(color: string | undefined): string {
		const colorMap: Record<string, string> = {
			yellow: "bg-yellow-500",
			blue: "bg-blue-500",
			red: "bg-red-500",
			grey: "bg-gray-500",
			green: "bg-green-500",
		};
		return colorMap[color ?? "grey"] || "bg-gray-500";
	}

	function getColorLabel(color: string | undefined): string {
		const colorMap: Record<string, string> = {
			yellow: "노랑",
			blue: "파랑",
			red: "빨강",
			grey: "회색",
			green: "초록",
		};
		return colorMap[color ?? "grey"] || "회색";
	}

	const topShareNumber = $derived(analysis.topBonusShareNumbers[0] ?? null);
	const maxBonusDeviation = $derived(
		analysis.topBonusNumber ? Number(analysis.topBonusNumber.bonus_deviation ?? 0) : 0,
	);
	const rankingRows = $derived(analysis.bonusNumberStats);
	const topBonusRows = $derived(rankingRows.slice(0, 5));
	const bottomBonusRows = $derived(
		[...rankingRows]
			.sort((a, b) => a.bonus_count - b.bonus_count || a.number - b.number)
			.slice(0, 5),
	);
	const recentlyMissingPreview = $derived(analysis.recentlyMissingNumbers.slice(0, 12));
	const topRecentLeader = $derived(analysis.comparisonHighlights.recentLeader);
	const combinedRankingRows = $derived(
		[...rankingRows]
			.filter((row) => typeof row.rank_delta === "number")
			.sort((a, b) => Math.abs(b.rank_delta ?? 0) - Math.abs(a.rank_delta ?? 0))
			.slice(0, 12),
	);
	const parityDistribution = $derived(
		rankingRows.reduce(
			(acc, row) => {
				if (row.number % 2 === 0) {
					acc.even += row.bonus_count;
				} else {
					acc.odd += row.bonus_count;
				}
				return acc;
			},
			{ odd: 0, even: 0 },
		),
	);
	const highLowDistribution = $derived(
		rankingRows.reduce(
			(acc, row) => {
				if (row.number >= 23) {
					acc.high += row.bonus_count;
				} else {
					acc.low += row.bonus_count;
				}
				return acc;
			},
			{ low: 0, high: 0 },
		),
	);
	const sectionDistribution = $derived(
		[1, 2, 3, 4, 5].map((section) => {
			const count = rankingRows
				.filter((row) => row.section === section)
				.reduce((sum, row) => sum + row.bonus_count, 0);
			return {
				section,
				count,
				share: analysis.totalRounds > 0 ? ((count / analysis.totalRounds) * 100).toFixed(1) : "0.0",
			};
		}),
	);
	const colorDistribution = $derived(
		["yellow", "blue", "red", "grey", "green"].map((color) => {
			const count = rankingRows
				.filter((row) => row.color === color)
				.reduce((sum, row) => sum + row.bonus_count, 0);
			return {
				color,
				label: getColorLabel(color),
				count,
				share: analysis.totalRounds > 0 ? ((count / analysis.totalRounds) * 100).toFixed(1) : "0.0",
			};
		}),
	);
	const comparisonCards = $derived([
		{
			label: "보너스 강세 번호",
			stat: analysis.comparisonHighlights.bonusHeavy,
			copy: analysis.comparisonHighlights.bonusHeavy
				? `${analysis.comparisonHighlights.bonusHeavy.number}번은 본 번호 순위보다 보너스 순위가 ${analysis.comparisonHighlights.bonusHeavy.rank_delta}계단 더 높습니다.`
				: "본 번호와 보너스 순위 차이를 계산할 데이터가 아직 없습니다.",
		},
		{
			label: "본 번호 강세 번호",
			stat: analysis.comparisonHighlights.mainHeavy,
			copy: analysis.comparisonHighlights.mainHeavy
				? `${analysis.comparisonHighlights.mainHeavy.number}번은 본 번호 쪽이 더 강하고, 보너스 순위는 상대적으로 낮습니다.`
				: "본 번호 강세 번호를 계산할 데이터가 아직 없습니다.",
		},
		{
			label: "합산 기준 선두",
			stat: analysis.comparisonHighlights.combinedLeader,
			copy: analysis.comparisonHighlights.combinedLeader
				? `${analysis.comparisonHighlights.combinedLeader.number}번은 본 번호와 보너스를 합쳐 ${analysis.comparisonHighlights.combinedLeader.combined_count}회로 가장 많이 등장했습니다.`
				: "합산 기준 선두 번호를 계산할 데이터가 아직 없습니다.",
		},
		{
			label: "최근 100회 선두",
			stat: analysis.comparisonHighlights.recentLeader,
			copy: analysis.comparisonHighlights.recentLeader
				? `${analysis.comparisonHighlights.recentLeader.number}번이 최근 100회 보너스로 ${analysis.comparisonHighlights.recentLeader.recent_100_bonus_count}회 등장했습니다.`
				: "최근 100회 선두 번호를 계산할 데이터가 아직 없습니다.",
		},
	]);
	const insightCards = $derived([
		{
			step: "01",
			badge: "기준선",
			title: "기대값 먼저 보기",
			summary: `전체 ${analysis.totalRounds}회차 기준 번호당 기대 보너스 횟수는 ${analysis.expectedBonusCount.toFixed(1)}회입니다. 이 기준선에서 얼마나 위나 아래에 있는지를 먼저 보는 것이 가장 빠른 해석입니다.`,
			points: [
				"편차가 큰 번호는 장기 기준선보다 얼마나 많이 혹은 적게 나왔는지 바로 보여줍니다.",
				"횟수만 보지 말고 기대값 대비 편차를 같이 봐야 숫자의 의미가 선명해집니다.",
			],
		},
		{
			step: "02",
			badge: "비교",
			title: "본 번호와 함께 비교하기",
			summary: "보너스 순위와 본 번호 순위를 함께 보면 특정 번호가 보너스에서 상대적으로 강한지, 본 번호 쪽이 더 강한지 한 번에 읽을 수 있습니다.",
			points: [
				"보너스 순위와 본 번호 순위 차이는 번호의 성격 차이를 가장 직관적으로 보여줍니다.",
				"합산 등장 횟수는 본 번호와 보너스를 묶은 전체 노출감을 보여줍니다.",
			],
		},
		{
			step: "03",
			badge: "흐름",
			title: "최근 흐름 해석하기",
			summary: "최근 10회는 단기 쏠림을, 최근 50·100회는 더 완만한 평균 흐름을 보여줍니다. 짧은 구간만 보고 판단하지 말고 전체 통계와 함께 보는 편이 좋습니다.",
			points: [
				"최근 10회는 변화 감지용, 최근 50·100회는 완만한 평균 흐름 확인용으로 보는 편이 안정적입니다.",
				"색상·구간·홀짝 분포까지 함께 보면 최근 보너스 번호가 어디에 몰렸는지 더 쉽게 파악할 수 있습니다.",
			],
		},
	]);

	function rankDeltaLabel(value: number | undefined): string {
		if (typeof value !== "number" || value === 0) {
			return "변화 없음";
		}
		return value > 0 ? `${value}계단 상승` : `${Math.abs(value)}계단 하락`;
	}
</script>

<MetaTags
	title={pageTitle}
	titleTemplate="%s | 645.live"
		description={pageDescription}
	canonical="https://645.live/stats/bonus"
	keywords={["로또 보너스 번호", "보너스 번호 통계", "로또 보너스 분석", "보너스 출현 순위", "보너스 번호 의미", "로또 통계"]}
	robots="index,follow"
	additionalRobotsProps={{
		maxSnippet: 320,
		maxImagePreview: "large",
		maxVideoPreview: 60,
	}}
	openGraph={{
		type: "website",
		url: "https://645.live/stats/bonus",
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
<JsonLd
	schema={{
		"@context": "https://schema.org",
		"@type": "Dataset",
		name: "로또 보너스 번호 통계",
		description: pageDescription,
		url: "https://645.live/stats/bonus",
		creator: {
			"@type": "Organization",
			name: "645.live",
		},
		license: "https://645.live/terms-of-service",
		temporalCoverage: `1회차/${analysis.totalRounds}회차`,
		variableMeasured: [
			{
				"@type": "PropertyValue",
				name: "기대 보너스 출현 횟수",
				value: analysis.expectedBonusCount.toFixed(1),
			},
			{
				"@type": "PropertyValue",
				name: "최신 보너스 번호",
				value: analysis.latestBonusDraw?.bonus_number ?? 0,
			},
		],
	}}
/>
<JsonLd schema={faqSchema} />

<div class="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 max-sm:px-0">
	<Breadcrumbs items={breadcrumbItems} />

	<StatsPageHero
		eyebrow="Bonus Number Hub"
		title="로또 보너스 번호 통계"
		description={`보너스 번호는 각 회차에서 1개만 추첨되며 2등 판정에 사용됩니다. 현재 ${analysis.latestRound}회차 기준 번호당 평균 보너스 출현 기대값은 약 ${analysis.expectedBonusCount.toFixed(1)}회입니다. 이 페이지에서는 어떤 번호가 보너스로 자주 나왔는지, 최근 10·50·100회 흐름이 어떤지, 본 번호 통계와 비교하면 무엇이 다른지 한눈에 확인할 수 있습니다.`}
		freshness={data.freshness}
		metrics={[
			{
				label: "최신 반영",
				value: analysis.latestRound > 0 ? `${analysis.latestRound}회차` : "-",
				note: analysis.latestDrawDate || "추첨일 확인 중",
				tone: "primary",
			},
			{
				label: "최신 보너스",
				value: analysis.latestBonusDraw ? `${analysis.latestBonusDraw.bonus_number}번` : "-",
				note: analysis.latestBonusDraw ? `${analysis.latestBonusDraw.round}회차 기준` : "최신 보너스 번호 확인 중",
				tone: "secondary",
			},
			{
				label: "기대 출현",
				value: `${analysis.expectedBonusCount.toFixed(1)}회`,
				note: "번호당 이론적 보너스 기대값",
				tone: "accent",
			},
			{
				label: "최다 보너스",
				value: analysis.topBonusNumber ? `${analysis.topBonusNumber.number}번` : "-",
				note: analysis.topBonusNumber ? `${analysis.topBonusNumber.bonus_count}회 등장` : "보너스 상위 번호 집계 중",
			},
		]}
	/>

	<StatsSummary
		stats={[
			{
				title: "최신 보너스",
				value: analysis.latestBonusDraw ? `${analysis.latestBonusDraw.bonus_number}번` : "-",
				description: analysis.latestBonusDraw ? `${analysis.latestBonusDraw.round}회차` : "최신 반영 대기",
				theme: "primary",
			},
			{
				title: "최다 보너스",
				value: analysis.topBonusNumber ? `${analysis.topBonusNumber.number}번` : "-",
				description: analysis.topBonusNumber ? `${analysis.topBonusNumber.bonus_count}회 출현` : "데이터 확인 중",
				theme: "secondary",
			},
			{
				title: "최대 편차",
				value: `${maxBonusDeviation > 0 ? "+" : ""}${maxBonusDeviation.toFixed(1)}`,
				description: "기대값 대비 보너스 편차",
				theme: "accent",
			},
			{
				title: "최근 100회 강세",
				value: topRecentLeader ? `${topRecentLeader.number}번` : "-",
				description: topRecentLeader ? `${topRecentLeader.recent_100_bonus_count}회 등장` : "데이터 확인 중",
				theme: "info",
			},
			{
				title: "보너스 비중 상위",
				value: topShareNumber ? `${topShareNumber.number}번` : "-",
				description: topShareNumber ? `${topShareNumber.bonus_share}%가 보너스` : "데이터 확인 중",
				theme: "success",
			},
		]}
		columns={5}
	/>

	<section class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title text-lg sm:text-xl">많이 나온 보너스 번호와 적게 나온 보너스 번호</h2>
			<p class="text-sm leading-6 text-base-content/70">
				전체 회차 기준으로 어떤 번호가 보너스로 자주 나왔는지 확인할 수 있습니다. 단순 횟수만 보기보다 기대값 대비 편차와 마지막 보너스 출현 회차를 함께 보면 최근 흐름까지 더 쉽게 해석할 수 있습니다.
			</p>

			<div class="mt-4 grid gap-4 lg:grid-cols-2">
				<div class="rounded-3xl border border-base-300/60 bg-base-200/60 p-4">
					<p class="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">많이 나온 보너스 번호</p>
					<div class="mt-3 space-y-2">
						{#each topBonusRows as row (row.number)}
							<div class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-base-100/85 px-3 py-2">
								<div class="shrink-0">
									<LottoBall number={row.number} href={`/stats/numbers/${row.number}`} interactive={true} />
								</div>
								<div class="min-w-0">
									<p class="text-sm font-semibold text-base-content">{row.number}번</p>
									<p class="truncate text-xs text-base-content/60">기대값 대비 {Number(row.bonus_deviation) > 0 ? "+" : ""}{row.bonus_deviation}</p>
								</div>
								<p class="whitespace-nowrap text-sm font-semibold tabular-nums text-base-content">{row.bonus_count}회</p>
							</div>
						{/each}
					</div>
				</div>
				<div class="rounded-3xl border border-base-300/60 bg-base-200/60 p-4">
					<p class="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">적게 나온 보너스 번호</p>
					<div class="mt-3 space-y-2">
						{#each bottomBonusRows as row (row.number)}
							<div class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-base-100/85 px-3 py-2">
								<div class="shrink-0">
									<LottoBall number={row.number} href={`/stats/numbers/${row.number}`} interactive={true} />
								</div>
								<div class="min-w-0">
									<p class="text-sm font-semibold text-base-content">{row.number}번</p>
									<p class="truncate text-xs text-base-content/60">마지막 보너스 {row.last_bonus_round ? `${row.last_bonus_round}회차` : "-"}</p>
								</div>
								<p class="whitespace-nowrap text-sm font-semibold tabular-nums text-base-content">{row.bonus_count}회</p>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<p class="mt-4 rounded-2xl bg-primary/8 px-4 py-3 text-sm leading-6 text-base-content/75">
				현재 전체 회차 기준으로 가장 자주 나온 보너스 번호는
				<strong class="text-base-content"> {analysis.topBonusNumber ? `${analysis.topBonusNumber.number}번` : "-"}</strong>이며,
				기대값 대비
				<strong class="text-base-content"> {maxBonusDeviation > 0 ? "+" : ""}{maxBonusDeviation.toFixed(1)}회</strong>
				높습니다.
			</p>

			<div class="mt-5">
				<StatsTable
					title="보너스 번호 출현 순위"
					columns={[
						{
							key: "number",
							title: "번호",
							sticky: true,
							minWidth: "72px",
							render: (_value: unknown, row: any) => `
								<a href="/stats/numbers/${row.number}" class="inline-flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-xs ${getColorClass(row.color)}">
									${row.number}
								</a>
							`,
						},
						{
							key: "bonus_count",
							title: "보너스 횟수",
							minWidth: "96px",
							render: (value: unknown, row: any) => `
								<div class="font-semibold">${value}회</div>
								<div class="text-[11px] opacity-60">보너스 순위 ${row.bonus_rank ?? "-"}</div>
							`,
						},
						{
							key: "bonus_deviation",
							title: "기대값 대비 편차",
							minWidth: "110px",
							render: (value: unknown) => {
								const amount = Number(value);
								const tone = amount > 0 ? "text-emerald-600" : amount < 0 ? "text-rose-600" : "text-base-content/70";
								return `<span class="${tone} font-semibold">${amount > 0 ? "+" : ""}${amount.toFixed(1)}</span>`;
							},
						},
						{
							key: "recent_100_bonus_count",
							title: "최근 100회",
							minWidth: "88px",
							render: (value: unknown) => `${value ?? 0}회`,
						},
						{
							key: "last_bonus_round",
							title: "마지막 보너스",
							minWidth: "110px",
							render: (value: unknown) => (value ? `${value}회차` : "-"),
						},
						{
							key: "main_count",
							title: "본 번호 횟수",
							minWidth: "100px",
							render: (value: unknown, row: any) => `
								<div>${value}회</div>
								<div class="text-[11px] opacity-60">본 번호 순위 ${row.main_rank ?? "-"}</div>
							`,
						},
						{
							key: "bonus_share",
							title: "보너스 비중",
							minWidth: "92px",
							render: (value: unknown) => `${value ?? "0.0"}%`,
						},
					]}
					data={rankingRows}
				/>
			</div>
		</div>
	</section>

	<section class="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
		<div class="card bg-base-100 shadow-sm">
			<div class="card-body">
				<h2 class="card-title text-lg sm:text-xl">보너스 번호와 본 번호는 어떻게 다른가요?</h2>
				<p class="text-sm leading-6 text-base-content/70">
					공식 통계가 잘 보여주지 않는 차별점은 본 번호 통계와 보너스 통계를 나란히 비교하는 것입니다. 어떤 번호가 보너스에서 상대적으로 강한지, 본 번호에 비해 순위가 어떻게 달라지는지 바로 읽을 수 있게 정리했습니다.
				</p>
				<div class="mt-4 grid gap-3 sm:grid-cols-2">
					{#each comparisonCards as card (card.label)}
						<div class="rounded-3xl border border-base-300/60 bg-base-200/65 p-4">
							<p class="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">{card.label}</p>
							{#if card.stat}
								<div class="mt-3 flex items-center gap-3">
									<LottoBall number={card.stat.number} href={`/stats/numbers/${card.stat.number}`} interactive={true} />
									<div>
										<p class="text-sm font-semibold text-base-content">{card.stat.number}번</p>
										<p class="text-xs text-base-content/60">보너스 {card.stat.bonus_count}회 · 본 번호 {card.stat.main_count}회</p>
									</div>
								</div>
							{/if}
							<p class="mt-3 text-sm leading-6 text-base-content/72">{card.copy}</p>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<div class="card bg-base-100 shadow-sm">
			<div class="card-body">
				<h2 class="card-title text-lg">보너스 비중 상위 번호</h2>
				<p class="text-sm leading-6 text-base-content/70">
					본 번호와 보너스를 합친 등장 횟수 중, 보너스로 등장한 비중이 높은 번호입니다.
				</p>
				<div class="mt-4 space-y-3">
					{#each analysis.topBonusShareNumbers as stat (stat.number)}
						<div class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-base-300/60 bg-base-200/55 px-3 py-3">
							<div class="shrink-0">
								<LottoBall number={stat.number} href={`/stats/numbers/${stat.number}`} interactive={true} />
							</div>
							<div class="min-w-0">
								<p class="text-sm font-semibold text-base-content">{stat.number}번</p>
								<p class="truncate text-xs text-base-content/60">본 번호 {stat.main_count}회 · 보너스 {stat.bonus_count}회</p>
							</div>
							<p class="whitespace-nowrap text-sm font-semibold tabular-nums text-base-content">{stat.bonus_share}%</p>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<section class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title text-lg sm:text-xl">보너스 포함 통계로 보면 순위가 어떻게 달라지나요?</h2>
			<p class="text-sm leading-6 text-base-content/70">
				본 번호만 기준으로 볼 때와 보너스 번호를 포함해 볼 때는 번호 순위가 달라질 수 있습니다. 이 표에서는 본 번호 통계, 보너스 횟수, 보너스 포함 합산 횟수를 한 번에 비교합니다.
			</p>
			<div class="mt-5">
				<StatsTable
					title="보너스 포함 순위 변화"
					columns={[
						{
							key: "number",
							title: "번호",
							sticky: true,
							minWidth: "72px",
							render: (_value: unknown, row: any) => `
								<a href="/stats/numbers/${row.number}" class="inline-flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-xs ${getColorClass(row.color)}">
									${row.number}
								</a>
							`,
						},
						{
							key: "main_count",
							title: "본 번호",
							minWidth: "88px",
							render: (value: unknown) => `${value}회`,
						},
						{
							key: "bonus_count",
							title: "보너스",
							minWidth: "88px",
							render: (value: unknown) => `${value}회`,
						},
						{
							key: "combined_count",
							title: "보너스 포함",
							minWidth: "96px",
							render: (value: unknown) => `${value}회`,
						},
						{
							key: "main_rank",
							title: "본 번호 순위",
							minWidth: "98px",
							render: (value: unknown) => `${value}위`,
						},
						{
							key: "combined_rank",
							title: "합산 순위",
							minWidth: "88px",
							render: (value: unknown) => `${value}위`,
						},
						{
							key: "rank_delta",
							title: "순위 변화",
							minWidth: "96px",
							render: (value: unknown) => {
								const delta = Number(value);
								const tone = delta > 0 ? "text-emerald-600" : delta < 0 ? "text-rose-600" : "text-base-content/70";
								return `<span class="${tone} font-semibold">${rankDeltaLabel(delta)}</span>`;
							},
						},
					]}
					data={combinedRankingRows}
				/>
			</div>
		</div>
	</section>

	<section class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title text-lg sm:text-xl">최근 보너스 번호 흐름은 어떤가요?</h2>
			<div class="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
				<div>
					<p class="text-sm font-semibold text-base-content">최근 10회 보너스 번호</p>
					<div class="mt-3 space-y-2">
						{#each analysis.recent10BonusStats as stat (stat.round)}
							<div class="flex items-center justify-between rounded-2xl border border-base-300/60 bg-base-200/55 px-3 py-3">
								<div>
									<p class="text-sm font-semibold text-base-content">{stat.round}회차</p>
									<p class="text-xs text-base-content/60">{getColorLabel(stat.color)} · {stat.section}구간 · {stat.is_odd ? "홀수" : "짝수"}</p>
								</div>
								<LottoBall number={stat.bonus_number} href={`/stats/numbers/${stat.bonus_number}`} interactive={true} />
							</div>
						{/each}
					</div>
				</div>
				<div class="space-y-3">
					<div class="rounded-3xl border border-base-300/60 bg-base-200/55 p-4">
						<p class="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">최근 50회</p>
						<p class="mt-3 text-sm leading-6 text-base-content/72">{analysis.recent50Summary}</p>
					</div>
					<div class="rounded-3xl border border-base-300/60 bg-base-200/55 p-4">
						<p class="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">최근 100회</p>
						<p class="mt-3 text-sm leading-6 text-base-content/72">{analysis.recent100Summary}</p>
					</div>
					<div class="rounded-3xl border border-base-300/60 bg-base-200/55 p-4">
						<p class="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">최근 100회 미출현</p>
						<div class="mt-3 flex flex-wrap gap-2">
							{#if recentlyMissingPreview.length > 0}
								{#each recentlyMissingPreview as number (number)}
									<LottoBall number={number} href={`/stats/numbers/${number}`} interactive={true} />
								{/each}
							{:else}
								<p class="text-sm text-base-content/70">최근 100회 안에 모든 구간에서 보너스 번호가 한 번 이상 나왔습니다.</p>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<section class="rounded-[2rem] border border-base-300/60 bg-gradient-to-br from-warning/10 via-base-100 to-warning/5 p-5 shadow-sm sm:p-6">
		<div class="max-w-3xl">
			<p class="text-xs font-semibold uppercase tracking-[0.22em] text-warning">⭐ Insight Guide</p>
			<h2 class="mt-3 text-2xl font-black tracking-[-0.04em] text-base-content sm:text-3xl">
				보너스 번호를 읽는 방법
			</h2>
			<p class="mt-3 text-sm leading-7 text-base-content/72 sm:text-base">
				이 섹션은 긴 설명을 읽기보다, 어떤 순서로 지표를 보면 보너스 통계가 빨리 읽히는지 안내하는 요약 카드입니다.
			</p>
		</div>

		<div class="mt-5 grid gap-3">
			{#each insightCards as card (card.step)}
				<article class="rounded-[1.7rem] border border-base-300/60 bg-base-100/90 p-4 shadow-sm sm:p-5">
					<div class="flex items-start gap-4">
						<div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-warning text-warning-content">
							<span class="text-sm font-black tracking-[0.08em]">{card.step}</span>
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<h3 class="text-lg font-bold text-base-content">{card.title}</h3>
								<span class="rounded-full bg-base-200 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-base-content/55">
									{card.badge}
								</span>
							</div>
							<p class="mt-2 text-sm leading-7 text-base-content/72 sm:text-[0.95rem]">
								{card.summary}
							</p>
							<div class="mt-4 grid gap-2 sm:grid-cols-2">
								{#each card.points as point (point)}
									<div class="rounded-2xl bg-base-200/70 px-3 py-2 text-xs leading-5 text-base-content/68 sm:text-[0.82rem]">
										{point}
									</div>
								{/each}
							</div>
						</div>
					</div>
				</article>
			{/each}
		</div>
	</section>

	<section class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title text-lg sm:text-xl">보너스 번호의 구간·홀짝·색상 분포</h2>
			<p class="text-sm leading-6 text-base-content/70">
				보너스는 회차마다 1개만 추첨되기 때문에, 조합보다는 어느 구간과 색상에 상대적으로 많이 분포했는지 보는 쪽이 더 직관적입니다.
			</p>
			<div class="mt-5 grid gap-4 lg:grid-cols-3">
				<div class="rounded-3xl border border-base-300/60 bg-base-200/55 p-4">
					<p class="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">구간 분포</p>
					<div class="mt-3 space-y-2">
						{#each sectionDistribution as item (item.section)}
							<div class="flex items-center justify-between text-sm">
								<span>{item.section}구간 ({(item.section - 1) * 10 + 1}-{Math.min(item.section * 10, 45)})</span>
								<span class="font-semibold">{item.count}회 · {item.share}%</span>
							</div>
						{/each}
					</div>
				</div>
				<div class="rounded-3xl border border-base-300/60 bg-base-200/55 p-4">
					<p class="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">홀짝·고저 분포</p>
					<div class="mt-3 space-y-2 text-sm">
						<div class="flex items-center justify-between">
							<span>홀수</span>
							<span class="font-semibold">{parityDistribution.odd}회</span>
						</div>
						<div class="flex items-center justify-between">
							<span>짝수</span>
							<span class="font-semibold">{parityDistribution.even}회</span>
						</div>
						<div class="flex items-center justify-between">
							<span>저번대 (1-22)</span>
							<span class="font-semibold">{highLowDistribution.low}회</span>
						</div>
						<div class="flex items-center justify-between">
							<span>고번대 (23-45)</span>
							<span class="font-semibold">{highLowDistribution.high}회</span>
						</div>
					</div>
				</div>
				<div class="rounded-3xl border border-base-300/60 bg-base-200/55 p-4">
					<p class="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">색상 분포</p>
					<div class="mt-3 space-y-2">
						{#each colorDistribution as item (item.color)}
							<div class="flex items-center justify-between text-sm">
								<div class="flex items-center gap-2">
									<span class={`inline-block h-3 w-3 rounded-full ${getColorClass(item.color)}`}></span>
									<span>{item.label}</span>
								</div>
								<span class="font-semibold">{item.count}회 · {item.share}%</span>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</section>

	<section class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<p class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/45">FAQ</p>
					<h2 class="mt-2 text-2xl font-bold text-base-content">자주 묻는 질문</h2>
				</div>
				<LinkButton href="/stats" class="btn btn-outline btn-sm">
					전체 통계 허브로 돌아가기
				</LinkButton>
			</div>
			<div class="mt-5 grid gap-3">
				{#each faqItems as item (item.question)}
					<div class="rounded-3xl border border-base-300/60 bg-base-200/55 p-4">
						<h3 class="text-base font-semibold text-base-content">{item.question}</h3>
						<p class="mt-2 text-sm leading-6 text-base-content/72">{item.answer}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>
</div>
