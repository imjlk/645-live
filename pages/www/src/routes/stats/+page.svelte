<script lang="ts">
	import { resolve } from "$app/paths";
	import {
		ColorBadge,
		LottoBall,
		StatsCard,
		StatsFreshnessNotice,
	} from "$lib/components/stats";
	import {
		createBreadcrumbSchema,
		createCollectionPageSchema,
		createOrganizationSchema,
		createWebSiteSchema,
		getGenericOgImage,
	} from "$lib/seo/index.js";
	import { JsonLd, MetaTags } from "svelte-meta-tags";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	const pageTitle = "로또 6/45 통계 분석 | 번호별 출현 빈도와 패턴 분석";
	const pageDescription =
		"최근 로또 당첨 번호 패턴, 번호별 출현 빈도, 홀짝·고저·색상·번호쌍·AC값 통계를 한곳에서 비교하는 645.live 대표 통계 허브입니다.";
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
			note: "전체 데이터 기준선",
		},
		{
			label: "최다 출현",
			value:
				topNumberSummary.number !== "-"
					? `${topNumberSummary.number}번`
					: "-",
			note:
				topNumberSummary.number !== "-"
					? `${topNumberSummary.draw_count}회 등장`
					: "데이터 확인 중",
		},
		{
			label: "저빈도 번호",
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
				"자주 나온 번호는 최근 흐름을 이해하는 데는 도움이 되지만, 다음 회차 당첨을 보장하지는 않습니다. 번호별 출현 빈도는 참고 지표로 보고, 최근 패턴과 전체 통계를 함께 비교하는 방식이 더 적절합니다.",
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
				"아닙니다. QR 스캔 인기 번호는 사람들이 실제로 많이 선택한 번호 흐름을 보여주고, 당첨번호 패턴은 추첨 결과로 나온 번호의 흐름을 보여줍니다. 두 데이터는 서로 다른 성격이므로 함께 볼 때 더 해석 가치가 높습니다.",
		},
		{
			question: "통계로 로또 번호를 예측할 수 있나요?",
			answer:
				"통계는 과거 데이터를 정리해 흐름을 이해하는 데 도움을 주지만, 특정 번호나 조합의 당첨을 보장하지는 않습니다. 이 페이지의 통계는 참고용으로 활용하는 것이 가장 적절합니다.",
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
			title: "연속·중복",
			description: "연속번호와 회차 간 중복 패턴 보기",
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
	];
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

<div class="stats-shell container mx-auto px-4 py-8 max-sm:px-0">
	<div class="stats-shell__glow stats-shell__glow--rose"></div>
	<div class="stats-shell__glow stats-shell__glow--blue"></div>

	<header class="stats-hero">
		<div class="stats-hero__copy">
			<p class="stats-hero__eyebrow">645.live 대표 통계 허브</p>
			<h1 class="stats-hero__title">로또 6/45 통계 분석</h1>
			<p class="stats-hero__lead">
				최근 로또 당첨 번호 패턴부터 번호별 출현 빈도, 홀짝·고저·색상·번호쌍·AC값까지 한 화면 안에서 비교할 수 있는 대표 분석 허브입니다.
			</p>

			<div class="stats-hero__freshness">
				<StatsFreshnessNotice freshness={data.freshness} />
			</div>

			<div class="stats-hero__summary">
				<h2 class="stats-section-label">최근 로또 당첨 번호 패턴 분석 요약</h2>
				<div class="space-y-3 text-sm leading-7 text-base-content/80 sm:text-base">
					<p>
						최근 로또 당첨 번호 패턴을 보면, 완전히 한쪽으로 치우친 조합보다
						<strong class="text-base-content">홀짝, 고저, 구간 분포가 비교적 균형에 가까운 조합</strong>이 더 자주 나타나는 흐름을 확인할 수 있습니다.
						다만 짧은 구간에서는 일시적인 쏠림이 자주 발생하므로, 최근 10회·50회·100회와 전체 회차를 함께 비교해서 보는 것이 좋습니다.
					</p>
					<p>
						이 페이지는 <strong class="text-base-content">번호별 출현 빈도, 홀짝 분포, 색상 분포, 구간 분포, 고저 분포, 번호쌍, 연속번호, 끝수, AC값</strong>을 한곳에서 비교할 수 있는 로또 통계 허브입니다.
						전체 흐름과 최근 흐름을 함께 확인해, 어떤 번호와 조합이 자주 보였는지 빠르게 파악할 수 있도록 정리했습니다.
					</p>
				</div>
			</div>

			<p class="stats-hero__note">
				통계는 과거 데이터를 정리한 참고 정보이며, 특정 번호의 당첨을 보장하지 않습니다.
			</p>
		</div>

		<div class="stats-hero__panel">
			<div class="stats-hero__signal-grid">
				{#each heroSignals as signal (signal.label)}
					<div class="stats-signal-card">
						<p class="stats-signal-card__label">{signal.label}</p>
						<p class="stats-signal-card__value">{signal.value}</p>
						<p class="stats-signal-card__note">{signal.note}</p>
					</div>
				{/each}
			</div>

			<div class="stats-snapshot-panel">
				<div class="stats-snapshot-panel__head">
					<h2 class="stats-section-label">최근 흐름 빠르게 보기</h2>
					<p>짧은 구간과 장기 흐름을 한 번에 비교할 수 있도록 핵심 해석만 추렸습니다.</p>
				</div>
				<div class="stats-snapshot-list">
					{#each summaryCards as card (card.label)}
						<div class="stats-snapshot-item">
							<p class="stats-snapshot-item__label">{card.label}</p>
							<p class="stats-snapshot-item__copy">{card.copy}</p>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</header>

	<nav class="mt-8">
		<div class="mb-4 flex items-end justify-between gap-4 max-sm:flex-col max-sm:items-start">
			<div>
				<p class="stats-section-label">세부 분석 바로가기</p>
				<h2 class="text-2xl font-bold text-base-content">원하는 패턴으로 바로 이동</h2>
			</div>
			<p class="max-w-xl text-sm leading-6 text-base-content/65">
				숫자 하나의 출현 빈도부터 최근 AC값 변화까지, broad 허브인 이 페이지에서 세부 통계 페이지로 바로 이어집니다.
			</p>
		</div>
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
			{#each statsCategories as category (category.href)}
				<StatsCard
					href={category.href}
					icon={category.icon}
					title={category.title}
					description={category.description}
				/>
			{/each}
		</div>
	</nav>

	<div class="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
		<section class="stats-panel stats-panel--mint">
			<h2 class="flex items-center text-xl font-bold">
				<span class="mr-2 text-2xl">🔢</span>
				번호별 출현 빈도
			</h2>
			<p class="mt-2 text-sm leading-6 text-base-content/70">
				자주 나온 번호와 상대적으로 적게 나온 번호를 함께 보면 전체 회차 기준선과 최근 선택 편차를 빠르게 파악할 수 있습니다.
			</p>
			<div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div>
					<h3 class="mb-2 font-semibold text-success">최다 출현 번호</h3>
					<div class="space-y-2">
						{#each data.topNumberStats.slice(0, 5) as stat (`top-${stat.number}`)}
							<div class="flex items-center justify-between">
								<LottoBall number={stat.number} href="/stats/numbers/{stat.number}" interactive={true} />
								<span class="text-sm text-base-content/70">{stat.draw_count}회</span>
							</div>
						{/each}
					</div>
				</div>
				<div>
					<h3 class="mb-2 font-semibold text-error">최소 출현 번호</h3>
					<div class="space-y-2">
						{#each data.bottomNumberStats.slice(0, 5) as stat (`bottom-${stat.number}`)}
							<div class="flex items-center justify-between">
								<LottoBall number={stat.number} href="/stats/numbers/{stat.number}" interactive={true} />
								<span class="text-sm text-base-content/70">{stat.draw_count}회</span>
							</div>
						{/each}
					</div>
				</div>
			</div>
			<div class="mt-4 text-center">
				<a href={resolve("/stats/numbers")} class="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
					자주 나온 번호와 적게 나온 번호 전체 보기
				</a>
			</div>
		</section>

		<section class="stats-panel stats-panel--sky">
			<h2 class="flex items-center text-xl font-bold">
				<span class="mr-2 text-2xl">⭐</span>
				보너스 번호 흐름
			</h2>
			<p class="mt-2 text-sm leading-6 text-base-content/70">
				보너스 번호는 2등 판정에 직접 사용되는 일곱 번째 번호입니다. 최근 보너스 번호와 자주 나온 번호를 함께 보면 본 번호 통계와 다른 흐름을 비교할 수 있습니다.
			</p>
			<div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
				<div class="rounded-3xl border border-base-300/60 bg-base-100/85 p-4">
					<p class="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">최신 보너스</p>
					<p class="mt-3 text-3xl font-black text-base-content">
						{#if latestBonusSummary}
							{latestBonusSummary.bonus_number}번
						{:else}
							-
						{/if}
					</p>
					<p class="mt-2 text-sm text-base-content/65">
						{#if latestBonusSummary}
							{latestBonusSummary.round}회차 기준
						{:else}
							최신 보너스 번호 확인 중
						{/if}
					</p>
				</div>
				<div class="rounded-3xl border border-base-300/60 bg-base-100/85 p-4">
					<p class="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">최다 보너스</p>
					<p class="mt-3 text-3xl font-black text-base-content">
						{#if bonusTopSummary}
							{bonusTopSummary.number}번
						{:else}
							-
						{/if}
					</p>
					<p class="mt-2 text-sm text-base-content/65">
						{#if bonusTopSummary}
							보너스로 {bonusTopSummary.bonus_count}회 등장
						{:else}
							집계 데이터 확인 중
						{/if}
					</p>
				</div>
				<div class="rounded-3xl border border-base-300/60 bg-base-100/85 p-4">
					<p class="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">최근 100회 흐름</p>
					<p class="mt-3 text-sm leading-6 text-base-content/75">
						{data.bonusAnalysis.recent100Summary || "최근 100회 보너스 흐름을 불러오는 중입니다."}
					</p>
				</div>
			</div>
			<div class="mt-4 text-center">
				<a href={resolve("/stats/bonus")} class="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
					보너스 번호 통계 자세히 보기
				</a>
			</div>
		</section>

		<section class="stats-panel stats-panel--violet">
			<h2 class="flex items-center text-xl font-bold">
				<span class="mr-2 text-2xl">⚖️</span>
				최근 홀짝 분포
			</h2>
			<p class="mt-2 text-sm leading-6 text-base-content/70">
				최근 회차의 홀짝 비율은 균형형인지 편중형인지 빠르게 보여주며, 단기 흐름과 장기 평균을 비교할 때 기준점이 됩니다.
			</p>
			<div class="mt-4 space-y-3">
				{#each data.recentOddEvenStats.slice(0, 5) as stat (stat.round)}
					<div class="flex items-center justify-between">
						<span class="text-sm text-base-content/70">{stat.round}회차</span>
						<div class="flex items-center space-x-2">
							<span class="rounded bg-blue-500/20 px-2 py-1 text-xs text-blue-600 dark:text-blue-400">
								홀수 {stat.odd_count}개
							</span>
							<span class="rounded bg-red-500/20 px-2 py-1 text-xs text-red-600 dark:text-red-400">
								짝수 {stat.even_count}개
							</span>
						</div>
					</div>
				{/each}
			</div>
			<div class="mt-4 text-center">
				<a href={resolve("/stats/odd-even")} class="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
					최근 로또 홀짝 패턴 자세히 보기
				</a>
			</div>
		</section>

		<section class="stats-panel stats-panel--amber">
			<h2 class="flex items-center text-xl font-bold">
				<span class="mr-2 text-2xl">🎨</span>
				최근 색상 분포
			</h2>
			<p class="mt-2 text-sm leading-6 text-base-content/70">
				색상 분포는 번호가 어느 구간대에 고르게 퍼졌는지 보여주는 빠른 요약으로, 최근 회차의 조합 다양성을 읽는 데 도움이 됩니다.
			</p>
			<div class="mt-4 space-y-3">
				{#each data.recentColorStats.slice(0, 5) as stat (stat.round)}
					<div class="flex items-center justify-between">
						<span class="text-sm text-base-content/70">{stat.round}회차</span>
						<div class="flex items-center space-x-1">
							<ColorBadge color="yellow" count={stat.yellow_count} />
							<ColorBadge color="blue" count={stat.blue_count} />
							<ColorBadge color="red" count={stat.red_count} />
							<ColorBadge color="grey" count={stat.grey_count} />
							<ColorBadge color="green" count={stat.green_count} />
						</div>
					</div>
				{/each}
			</div>
			<div class="mt-4 text-center">
				<a href={resolve("/stats/colors")} class="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
					최근 로또 색상 분포 자세히 보기
				</a>
			</div>
		</section>

		<section class="stats-panel stats-panel--rose">
			<h2 class="flex items-center text-xl font-bold">
				<span class="mr-2 text-2xl">👥</span>
				최다 동반 출현 번호쌍
			</h2>
			<p class="mt-2 text-sm leading-6 text-base-content/70">
				함께 자주 나온 번호쌍은 번호별 단일 출현 빈도와 다른 관점의 결합 패턴을 보여주며, 전체 조합 흐름을 읽는 보조 지표가 됩니다.
			</p>
			<div class="mt-4 space-y-3">
				{#each data.topPairStats.slice(0, 5) as stat (`${stat.number_a}-${stat.number_b}`)}
					<div class="flex items-center justify-between">
						<div class="flex items-center space-x-2">
							<LottoBall number={stat.number_a} href="/stats/numbers/{stat.number_a}" size="small" interactive={true} />
							<span class="text-base-content/40">+</span>
							<LottoBall number={stat.number_b} href="/stats/numbers/{stat.number_b}" size="small" interactive={true} />
						</div>
						<span class="text-sm text-base-content/70">{stat.pair_count}회</span>
					</div>
				{/each}
			</div>
			<div class="mt-4 text-center">
				<a href={resolve("/stats/pairs")} class="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
					함께 자주 나온 번호쌍 보기
				</a>
			</div>
		</section>
	</div>

	<section class="mt-8 rounded-[2rem] border border-base-300/70 bg-base-100/90 p-6 shadow-sm">
		<div class="mb-4 flex items-end justify-between gap-4 max-sm:flex-col max-sm:items-start">
			<div>
				<p class="stats-section-label">읽는 법</p>
				<h2 class="text-2xl font-bold text-base-content">통계를 볼 때 함께 확인하면 좋은 기준</h2>
			</div>
			<p class="max-w-xl text-sm leading-6 text-base-content/65">
				짧은 구간의 변동성과 전체 회차 기준선을 함께 보는 방식이 가장 안정적입니다.
			</p>
		</div>
		<div class="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
			<div class="rounded-2xl bg-base-200/70 p-5">
				<h3 class="mb-2 font-semibold text-base-content">비교 방법</h3>
				<ul class="space-y-1 text-base-content/70">
					<li>최근 10회는 단기 흐름, 최근 50회와 100회는 더 넓은 평균 흐름을 보여줍니다.</li>
					<li>번호별 출현 빈도는 홀짝·고저·구간·AC값과 함께 볼 때 해석 가치가 커집니다.</li>
					<li>QR 스캔 흐름과 실제 당첨 패턴은 의미가 다르므로 함께 비교하는 편이 좋습니다.</li>
				</ul>
			</div>
			<div class="rounded-2xl bg-base-200/70 p-5">
				<h3 class="mb-2 font-semibold text-base-content">주의할 점</h3>
				<ul class="space-y-1 text-base-content/70">
					<li>과거 통계는 참고용이며 다음 회차 결과를 보장하지 않습니다.</li>
					<li>짧은 구간은 일시적인 쏠림이 크므로 전체 회차 기준과 함께 봐야 합니다.</li>
					<li>최신 회차 반영 중일 때는 하위 통계가 잠시 갱신 중으로 표시될 수 있습니다.</li>
				</ul>
			</div>
		</div>
	</section>

	<section class="mt-8 rounded-[2rem] border border-base-300 bg-base-100 p-6 shadow-sm">
		<div class="mb-4 flex items-end justify-between gap-4 max-sm:flex-col max-sm:items-start">
			<div>
				<p class="stats-section-label">FAQ</p>
				<h2 class="text-2xl font-bold text-base-content">자주 묻는 질문</h2>
			</div>
			<p class="max-w-xl text-sm leading-6 text-base-content/65">
				AI 답변과 검색 요약에서 바로 인용되기 쉬운 형태로 핵심 질문을 정리했습니다.
			</p>
		</div>
		<div class="mt-5 grid gap-4 lg:grid-cols-2">
			{#each faqItems as item (item.question)}
				<div class="faq-card">
					<h3 class="text-base font-semibold text-base-content">{item.question}</h3>
					<p class="mt-2 text-sm leading-6 text-base-content/75">{item.answer}</p>
				</div>
			{/each}
		</div>
	</section>

	<footer class="mt-8 text-sm text-base-content/60">
		{#if formattedUpdatedAt}
			최종 업데이트: {formattedUpdatedAt}
		{/if}
		{#if topNumberSummary.number !== "-"}
			<span class="ml-2">최다 출현 번호: {topNumberSummary.number}번 {topNumberSummary.draw_count}회</span>
		{/if}
	</footer>
</div>

<style>
	.stats-shell {
		position: relative;
		isolation: isolate;
	}

	.stats-shell__glow {
		pointer-events: none;
		position: absolute;
		z-index: -1;
		filter: blur(60px);
		opacity: 0.4;
	}

	.stats-shell__glow--rose {
		top: 2rem;
		right: 4rem;
		height: 14rem;
		width: 14rem;
		border-radius: 9999px;
		background: rgba(244, 114, 182, 0.18);
	}

	.stats-shell__glow--blue {
		left: 0;
		top: 18rem;
		height: 16rem;
		width: 16rem;
		border-radius: 9999px;
		background: rgba(96, 165, 250, 0.16);
	}

	.stats-hero {
		display: grid;
		gap: 1.5rem;
		border: 1px solid color-mix(in oklab, oklch(var(--b3)) 72%, white);
		background:
			radial-gradient(circle at top left, rgba(236, 72, 153, 0.12), transparent 34%),
			radial-gradient(circle at 90% 10%, rgba(59, 130, 246, 0.14), transparent 28%),
			linear-gradient(180deg, color-mix(in oklab, oklch(var(--b1)) 92%, white) 0%, color-mix(in oklab, oklch(var(--b1)) 96%, black) 100%);
		border-radius: 2rem;
		padding: 1.5rem;
		box-shadow: 0 24px 64px rgba(15, 23, 42, 0.08);
	}

	.stats-hero__copy {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.stats-hero__eyebrow,
	.stats-section-label {
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: color-mix(in oklab, oklch(var(--p)) 74%, oklch(var(--bc)));
	}

	.stats-hero__title {
		max-width: 11ch;
		font-size: clamp(2.4rem, 4vw, 4.8rem);
		line-height: 0.95;
		letter-spacing: -0.05em;
		font-weight: 800;
		color: oklch(var(--bc));
		text-wrap: balance;
	}

	.stats-hero__lead {
		max-width: 58ch;
		font-size: 1rem;
		line-height: 1.8;
		color: color-mix(in oklab, oklch(var(--bc)) 74%, white);
	}

	.stats-hero__freshness {
		max-width: 52rem;
	}

	.stats-hero__summary {
		max-width: 58rem;
		border-top: 1px solid color-mix(in oklab, oklch(var(--b3)) 72%, white);
		padding-top: 1rem;
	}

	.stats-hero__note {
		display: inline-flex;
		max-width: fit-content;
		border-radius: 9999px;
		padding: 0.8rem 1rem;
		background: rgba(250, 204, 21, 0.1);
		color: color-mix(in oklab, oklch(var(--bc)) 75%, white);
		font-size: 0.9rem;
	}

	.stats-hero__panel {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.stats-hero__signal-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.stats-signal-card,
	.stats-snapshot-item,
	.faq-card {
		border: 1px solid color-mix(in oklab, oklch(var(--b3)) 72%, white);
		background: color-mix(in oklab, oklch(var(--b1)) 92%, white);
		box-shadow: 0 12px 36px rgba(15, 23, 42, 0.06);
	}

	.stats-signal-card {
		border-radius: 1.35rem;
		padding: 1rem;
	}

	.stats-signal-card__label {
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: color-mix(in oklab, oklch(var(--bc)) 50%, white);
	}

	.stats-signal-card__value {
		margin-top: 0.45rem;
		font-size: 1.55rem;
		line-height: 1.1;
		font-weight: 700;
		color: oklch(var(--bc));
	}

	.stats-signal-card__note {
		margin-top: 0.55rem;
		font-size: 0.9rem;
		line-height: 1.5;
		color: color-mix(in oklab, oklch(var(--bc)) 62%, white);
	}

	.stats-snapshot-panel {
		border-radius: 1.6rem;
		background: linear-gradient(180deg, rgba(15, 23, 42, 0.97), rgba(30, 41, 59, 0.92));
		padding: 1rem;
		color: white;
		box-shadow: 0 20px 48px rgba(15, 23, 42, 0.18);
	}

	.stats-snapshot-panel__head p {
		margin-top: 0.4rem;
		font-size: 0.95rem;
		line-height: 1.6;
		color: rgba(255, 255, 255, 0.72);
	}

	.stats-snapshot-panel .stats-section-label {
		color: rgba(255, 255, 255, 0.78);
	}

	.stats-snapshot-list {
		margin-top: 1rem;
		display: grid;
		gap: 0.75rem;
	}

	.stats-snapshot-item {
		border-radius: 1.2rem;
		padding: 0.95rem 1rem;
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.08);
		box-shadow: none;
	}

	.stats-snapshot-item__label {
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.72);
	}

	.stats-snapshot-item__copy {
		margin-top: 0.45rem;
		font-size: 0.95rem;
		line-height: 1.7;
		color: rgba(255, 255, 255, 0.94);
	}

	.stats-panel {
		border-radius: 1.65rem;
		padding: 1.5rem;
		border: 1px solid color-mix(in oklab, oklch(var(--b3)) 70%, white);
		background: linear-gradient(180deg, color-mix(in oklab, oklch(var(--b1)) 96%, white), color-mix(in oklab, oklch(var(--b1)) 90%, white));
		box-shadow: 0 18px 46px rgba(15, 23, 42, 0.06);
	}

	.stats-panel--mint {
		background:
			linear-gradient(180deg, rgba(16, 185, 129, 0.06), transparent 28%),
			linear-gradient(180deg, color-mix(in oklab, oklch(var(--b1)) 96%, white), color-mix(in oklab, oklch(var(--b1)) 90%, white));
	}

	.stats-panel--sky {
		background:
			linear-gradient(180deg, rgba(14, 165, 233, 0.08), transparent 28%),
			linear-gradient(180deg, color-mix(in oklab, oklch(var(--b1)) 96%, white), color-mix(in oklab, oklch(var(--b1)) 90%, white));
	}

	.stats-panel--violet {
		background:
			linear-gradient(180deg, rgba(99, 102, 241, 0.06), transparent 28%),
			linear-gradient(180deg, color-mix(in oklab, oklch(var(--b1)) 96%, white), color-mix(in oklab, oklch(var(--b1)) 90%, white));
	}

	.stats-panel--amber {
		background:
			linear-gradient(180deg, rgba(245, 158, 11, 0.08), transparent 28%),
			linear-gradient(180deg, color-mix(in oklab, oklch(var(--b1)) 96%, white), color-mix(in oklab, oklch(var(--b1)) 90%, white));
	}

	.stats-panel--rose {
		background:
			linear-gradient(180deg, rgba(244, 63, 94, 0.06), transparent 28%),
			linear-gradient(180deg, color-mix(in oklab, oklch(var(--b1)) 96%, white), color-mix(in oklab, oklch(var(--b1)) 90%, white));
	}

	.faq-card {
		position: relative;
		border-radius: 1.4rem;
		padding: 1.15rem 1.15rem 1.15rem 1.35rem;
		overflow: hidden;
	}

	.faq-card::before {
		content: "";
		position: absolute;
		left: 0;
		top: 1rem;
		bottom: 1rem;
		width: 4px;
		border-radius: 9999px;
		background: linear-gradient(180deg, oklch(var(--p)), rgba(244, 114, 182, 0.8));
	}

	@media (min-width: 1024px) {
		.stats-hero {
			grid-template-columns: minmax(0, 1.25fr) minmax(22rem, 0.75fr);
			padding: 2rem;
		}
	}

	@media (max-width: 640px) {
		.stats-shell {
			padding-inline: 0;
		}

		.stats-hero {
			border-radius: 1.5rem;
			padding: 1.1rem;
		}

		.stats-hero__title {
			max-width: 100%;
			font-size: 2.4rem;
		}

		.stats-hero__signal-grid {
			grid-template-columns: 1fr;
		}

		.stats-panel {
			padding: 1.15rem;
		}
	}
</style>
