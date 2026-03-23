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

<div class="container mx-auto px-4 py-8 max-sm:px-0">
	<header class="space-y-3">
		<h1 class="text-3xl font-bold text-base-content">로또 6/45 통계 분석</h1>
		<p class="text-base-content/70">
			총 <span class="font-semibold text-primary">{data.totalRounds}</span>회차 데이터를 기반으로 한 통계 분석
			{#if data.latestRound > 0}
				(최신: {data.latestRound}회차, {data.latestDrawDate})
			{/if}
		</p>
		<StatsFreshnessNotice freshness={data.freshness} />
	</header>

	<section class="mt-8 rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
		<h2 class="text-2xl font-bold text-base-content">최근 로또 당첨 번호 패턴 분석 요약</h2>
		<div class="mt-4 space-y-3 text-sm leading-7 text-base-content/80 sm:text-base">
			<p>
				최근 로또 당첨 번호 패턴을 보면, 완전히 한쪽으로 치우친 조합보다
				<strong class="text-base-content"> 홀짝, 고저, 구간 분포가 비교적 균형에 가까운 조합</strong>이 더 자주 나타나는 흐름을 확인할 수 있습니다.
				다만 짧은 구간에서는 일시적인 쏠림이 자주 발생하므로, 최근 10회·50회·100회와 전체 회차를 함께 비교해서 보는 것이 좋습니다.
			</p>
			<p>
				이 페이지는 <strong class="text-base-content">번호별 출현 빈도, 홀짝 분포, 색상 분포, 구간 분포, 고저 분포, 번호쌍, 연속번호, 끝수, AC값</strong>을 한곳에서 비교할 수 있는 로또 통계 허브입니다.
				전체 흐름과 최근 흐름을 함께 확인해, 어떤 번호와 조합이 자주 보였는지 빠르게 파악할 수 있도록 정리했습니다.
			</p>
		</div>
		<p class="mt-4 rounded-xl bg-warning/10 px-4 py-3 text-sm text-base-content/80">
			통계는 과거 데이터를 정리한 참고 정보이며, 특정 번호의 당첨을 보장하지 않습니다.
		</p>
	</section>

	<section class="mt-6 rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
		<h3 class="text-xl font-bold text-base-content">최근 흐름 빠르게 보기</h3>
		<div class="mt-4 grid gap-3 sm:grid-cols-2">
			<div class="rounded-xl bg-base-200/80 p-4 text-sm text-base-content/80">
				<p class="font-semibold text-base-content">최근 10회</p>
				<p class="mt-2 leading-6">{data.summarySnapshots.recent10}</p>
			</div>
			<div class="rounded-xl bg-base-200/80 p-4 text-sm text-base-content/80">
				<p class="font-semibold text-base-content">최근 50회</p>
				<p class="mt-2 leading-6">{data.summarySnapshots.recent50}</p>
			</div>
			<div class="rounded-xl bg-base-200/80 p-4 text-sm text-base-content/80">
				<p class="font-semibold text-base-content">최근 100회</p>
				<p class="mt-2 leading-6">{data.summarySnapshots.recent100}</p>
			</div>
			<div class="rounded-xl bg-base-200/80 p-4 text-sm text-base-content/80">
				<p class="font-semibold text-base-content">전체 {data.totalRounds}회차</p>
				<p class="mt-2 leading-6">{data.summarySnapshots.overall}</p>
			</div>
		</div>
	</section>

	<nav class="mt-8">
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

	<div class="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
		<section class="rounded-2xl bg-base-100 p-6 shadow-md">
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

		<section class="rounded-2xl bg-base-100 p-6 shadow-md">
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

		<section class="rounded-2xl bg-base-100 p-6 shadow-md">
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

		<section class="rounded-2xl bg-base-100 p-6 shadow-md">
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

	<section class="mt-8 rounded-2xl bg-base-200 p-6">
		<h2 class="text-xl font-bold text-base-content">통계를 볼 때 함께 확인하면 좋은 기준</h2>
		<div class="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
			<div>
				<h3 class="mb-2 font-semibold text-base-content">비교 방법</h3>
				<ul class="space-y-1 text-base-content/70">
					<li>최근 10회는 단기 흐름, 최근 50회와 100회는 더 넓은 평균 흐름을 보여줍니다.</li>
					<li>번호별 출현 빈도는 홀짝·고저·구간·AC값과 함께 볼 때 해석 가치가 커집니다.</li>
					<li>QR 스캔 흐름과 실제 당첨 패턴은 의미가 다르므로 함께 비교하는 편이 좋습니다.</li>
				</ul>
			</div>
			<div>
				<h3 class="mb-2 font-semibold text-base-content">주의할 점</h3>
				<ul class="space-y-1 text-base-content/70">
					<li>과거 통계는 참고용이며 다음 회차 결과를 보장하지 않습니다.</li>
					<li>짧은 구간은 일시적인 쏠림이 크므로 전체 회차 기준과 함께 봐야 합니다.</li>
					<li>최신 회차 반영 중일 때는 하위 통계가 잠시 갱신 중으로 표시될 수 있습니다.</li>
				</ul>
			</div>
		</div>
	</section>

	<section class="mt-8 rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
		<h2 class="text-2xl font-bold text-base-content">자주 묻는 질문</h2>
		<div class="mt-5 space-y-4">
			{#each faqItems as item (item.question)}
				<div class="rounded-xl bg-base-200/70 p-4">
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
