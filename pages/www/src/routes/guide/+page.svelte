<script lang="ts">
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";
import LinkButton from "$lib/ui/LinkButton.svelte";
import { JsonLd, MetaTags } from "svelte-meta-tags";

// Breadcrumbs 데이터
const breadcrumbItems = [
	{ label: "홈", href: "/" },
	{ label: "로또 가이드", href: "/guide", current: true },
];

// 가이드 섹션 데이터
const guideSection = [
	{
		id: "basic",
		title: "📚 로또 6/45 기본 가이드",
		items: [
			{
				title: "로또란 무엇인가요?",
				content:
					"로또 6/45는 1부터 45까지의 숫자 중 6개를 선택하여 추첨번호와 일치하는 개수에 따라 당첨되는 복권입니다. 매주 토요일 오후 8시 45분에 추첨이 진행됩니다.",
			},
			{
				title: "게임 방법",
				content:
					"1장당 1,000원으로 구매할 수 있으며, A부터 E까지 5게임을 한 장에서 플레이할 수 있습니다. 수동 선택 또는 자동 선택(컴퓨터가 무작위 선택) 중 선택 가능합니다.",
			},
			{
				title: "당첨 기준",
				content:
					"1등: 6개 모두 일치, 2등: 5개 일치 + 보너스번호, 3등: 5개 일치, 4등: 4개 일치, 5등: 3개 일치로 구성됩니다.",
			},
		],
	},
	{
		id: "probability",
		title: "🎯 당첨 확률과 상금",
		items: [
			{
				title: "당첨 확률",
				content:
					"1등 당첨 확률은 약 814만 분의 1입니다. 2등은 약 135만 분의 1, 3등은 약 3만 5천 분의 1, 4등은 약 733분의 1, 5등은 약 45분의 1입니다.",
			},
			{
				title: "예상 상금",
				content:
					"1등 상금은 누적 방식으로 평균 20억원 내외이며, 당첨자 수에 따라 분배됩니다. 2등~5등은 고정 상금으로 운영됩니다.",
			},
			{
				title: "세금 안내",
				content:
					"당첨금이 5만원을 초과하면 22%의 세금이 자동으로 원천징수됩니다. 3억원 이상 고액 당첨 시 추가 세금 신고가 필요합니다.",
			},
		],
	},
	{
		id: "purchase",
		title: "🛒 구매 방법과 팁",
		items: [
			{
				title: "구매 장소",
				content:
					"전국 로또 판매점, 편의점, 온라인(동행복권 사이트), 모바일 앱에서 구매 가능합니다. 판매 마감은 추첨일 오후 8시까지입니다.",
			},
			{
				title: "번호 선택 전략",
				content:
					"통계적으로는 모든 번호가 동일한 확률을 가지지만, 과거 당첨번호 분석, 홀짝 균형, 연속번호 회피 등의 전략을 활용할 수 있습니다.",
			},
			{
				title: "현명한 구매 팁",
				content:
					"여유 자금으로만 구매하고, 과도한 구매는 피해야 합니다. 꾸준한 소액 구매가 무리한 고액 구매보다 현명합니다.",
			},
		],
	},
	{
		id: "claim",
		title: "🏆 당첨 확인과 수령",
		items: [
			{
				title: "당첨 확인",
				content:
					"추첨 후 동행복권 홈페이지, 모바일 앱, 로또 판매점에서 당첨번호를 확인할 수 있습니다. QR코드를 통한 확인도 가능합니다.",
			},
			{
				title: "당첨금 수령",
				content:
					"5만원 이하: 판매점에서 즉시 수령, 5만원 초과: 은행 또는 농협중앙회에서 수령, 1억원 이상: 농협중앙회 본점 또는 지역본부에서만 수령 가능합니다.",
			},
			{
				title: "수령 기한",
				content:
					"당첨금 수령 기한은 지급 개시일로부터 1년입니다. 기한 내 미수령 시 당첨금은 복권기금으로 귀속됩니다.",
			},
		],
	},
	{
		id: "terms",
		title: "📋 중요 용어 설명",
		items: [
			{
				title: "보너스 번호",
				content:
					"기본 6개 번호 외에 추가로 추첨되는 1개 번호로, 2등 당첨 시에만 사용됩니다.",
			},
			{
				title: "수동/자동 선택",
				content:
					"수동: 직접 번호를 선택하는 방식, 자동: 컴퓨터가 무작위로 번호를 선택하는 방식입니다.",
			},
			{
				title: "누적금",
				content:
					"1등 당첨자가 없을 경우 다음 회차로 이월되는 상금으로, 이월 횟수가 많을수록 1등 상금이 커집니다.",
			},
		],
	},
	{
		id: "statistics",
		title: "📊 통계 활용법",
		items: [
			{
				title: "출현 빈도 분석",
				content:
					"각 번호별 과거 출현 횟수를 분석하여 '뜨거운 번호'와 '차가운 번호'를 파악할 수 있습니다. 단, 미래 당첨을 보장하지는 않습니다.",
			},
			{
				title: "패턴 분석",
				content:
					"홀짝 분포, 고저 분포, 연속번호 패턴 등을 분석하여 번호 선택에 참고할 수 있습니다.",
			},
			{
				title: "통계의 한계",
				content:
					"과거 데이터는 참고용일 뿐, 로또는 완전한 확률 게임이므로 통계로 미래를 예측할 수는 없습니다.",
			},
		],
	},
	{
		id: "responsible",
		title: "⚖️ 건전한 복권 문화",
		items: [
			{
				title: "적정 구매",
				content:
					"월 소득의 1-2% 이내에서 여유 자금으로만 구매하고, 생활비나 투자금을 사용하지 않아야 합니다.",
			},
			{
				title: "중독 예방",
				content:
					"복권은 오락의 성격이 강하므로 과도한 기대나 의존을 피하고, 구매 한도를 정해두는 것이 좋습니다.",
			},
			{
				title: "도움 받기",
				content:
					"복권 중독이 의심되면 한국도박문제관리센터(국번없이 1336) 등 전문 기관의 도움을 받을 수 있습니다.",
			},
		],
	},
];
</script>

<MetaTags
	title="로또 6/45 완전 가이드 | 초보자를 위한 로또 이용법"
	titleTemplate="%s | 645.live"
	description="로또 6/45 초보자를 위한 완전 가이드. 게임 방법, 당첨 확률, 구매 방법, 당첨금 수령까지 모든 정보를 한 곳에서 확인하세요."
	canonical="https://www.645.live/guide"
	keywords={["로또가이드", "로또방법", "로또구매", "로또당첨확률", "로또초보", "6/45가이드", "로또팁", "로또용어", "로또상금", "로또세금"]}
	robots="index,follow"
	additionalRobotsProps={{
		maxSnippet: 320,
		maxImagePreview: 'large',
		maxVideoPreview: 60
	}}
	additionalMetaTags={[
		{
			name: 'application-name',
			content: '645.live'
		},
		{
			name: 'theme-color',
			content: '#3B82F6'
		},
		{
			name: 'format-detection',
			content: 'telephone=no'
		},
		{
			name: 'author',
			content: '645.live'
		},
		{
			name: 'generator',
			content: 'SvelteKit'
		},
		{
			property: 'article:publisher',
			content: 'https://www.645.live'
		}
	]}
	openGraph={{
		type: 'article',
		url: 'https://www.645.live/guide',
		title: '로또 6/45 완전 가이드 | 초보자를 위한 로또 이용법',
		description: '로또 6/45 초보자를 위한 완전 가이드. 게임 방법부터 당첨금 수령까지 모든 정보를 제공합니다.',
		locale: 'ko_KR',
		images: [{
			url: `https://www.645.live/og?title=${encodeURIComponent('로또 6/45 완전 가이드')}&description=${encodeURIComponent('초보자를 위한 로또 이용법 - 게임방법, 확률, 구매팁, 당첨수령까지')}&layout=hero&theme=dark`,
			width: 1200,
			height: 630,
			alt: '로또 6/45 완전 가이드',
			type: 'image/svg+xml'
		}],
		siteName: '645.live',
		article: {
			section: '로또 가이드',
			tags: ['로또', '가이드', '초보자', '이용법', '6/45', '복권', '당첨', '구매방법'],
			publishedTime: '2024-01-01T00:00:00.000Z',
			modifiedTime: new Date().toISOString()
		}
	}}
	twitter={{
		cardType: 'summary_large_image',
		site: '@645live',
		title: '로또 6/45 완전 가이드',
		description: '초보자를 위한 로또 이용법 - 게임방법부터 당첨금 수령까지',
		image: `https://www.645.live/og?title=${encodeURIComponent('로또 6/45 완전 가이드')}&description=${encodeURIComponent('초보자를 위한 로또 이용법')}&layout=hero&theme=dark`,
		imageAlt: '로또 6/45 완전 가이드'
	}}
/>

<JsonLd
	schema={{
		'@type': 'Article',
		headline: '로또 6/45 완전 가이드 | 초보자를 위한 로또 이용법',
		description: '로또 6/45 초보자를 위한 완전 가이드. 게임 방법, 당첨 확률, 구매 방법, 당첨금 수령까지 모든 정보를 한 곳에서 확인하세요.',
		url: 'https://www.645.live/guide',
		datePublished: '2024-01-01T00:00:00.000Z',
		dateModified: new Date().toISOString(),
		author: {
			'@type': 'Organization',
			name: '645.live'
		},
		publisher: {
			'@type': 'Organization',
			name: '645.live',
			url: 'https://www.645.live'
		},
		mainEntityOfPage: {
			'@type': 'WebPage',
			'@id': 'https://www.645.live/guide'
		},
		articleSection: '로또 가이드',
		keywords: ['로또', '가이드', '초보자', '6/45', '복권', '당첨확률', '구매방법'],
		about: {
			'@type': 'Thing',
			name: '로또 6/45',
			description: '대한민국 로또 복권 게임'
		}
	}}
/>

<div class="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-5 lg:space-y-6 max-w-4xl mx-auto">
	<!-- Breadcrumbs -->
	<Breadcrumbs items={breadcrumbItems} />

	<!-- 페이지 헤더 -->
	<div class="text-center space-y-3 sm:space-y-4">
		<h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary">로또 6/45 완전 가이드</h1>
		<p class="text-base sm:text-lg text-base-content/70 leading-relaxed">
			로또를 처음 시작하는 분들을 위한 <strong class="text-primary">종합 안내서</strong>입니다.<br />
			게임 방법부터 당첨금 수령까지 모든 과정을 쉽게 설명합니다.
		</p>
		
		<div class="flex flex-wrap justify-center gap-2 sm:gap-3 mt-4">
			<LinkButton href="/qr-scan" class="btn btn-primary btn-sm">
				QR 스캔하기
			</LinkButton>
			<LinkButton href="/generator" class="btn btn-secondary btn-sm">
				번호 생성하기
			</LinkButton>
			<LinkButton href="/stats" class="btn btn-outline btn-sm">
				통계 보기
			</LinkButton>
		</div>
	</div>

	<!-- 가이드 목차 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-4 sm:p-6">
			<h2 class="card-title text-lg sm:text-xl mb-4">📑 목차</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
				{#each guideSection as section}
					<a 
						href="#{section.id}" 
						class="block p-3 sm:p-4 bg-base-200 hover:bg-base-300 rounded-lg transition-colors duration-200"
					>
						<div class="font-semibold text-primary text-sm sm:text-base">{section.title}</div>
						<div class="text-xs sm:text-sm text-base-content/60 mt-1">
							{section.items.length}개 항목
						</div>
					</a>
				{/each}
			</div>
		</div>
	</div>

	<!-- 주요 가이드 섹션들 -->
	{#each guideSection as section}
		<section id={section.id} class="card bg-base-100 shadow-sm">
			<div class="card-body p-4 sm:p-6">
				<h2 class="card-title text-lg sm:text-xl text-primary mb-4 sm:mb-6">
					{section.title}
				</h2>
				
				<div class="space-y-4 sm:space-y-6">
					{#each section.items as item}
						<div class="border-l-4 border-primary/30 pl-4 sm:pl-6">
							<h3 class="font-semibold text-base sm:text-lg text-secondary mb-2 sm:mb-3">
								{item.title}
							</h3>
							<p class="text-sm sm:text-base text-base-content/80 leading-relaxed">
								{item.content}
							</p>
						</div>
					{/each}
				</div>
			</div>
		</section>
	{/each}

	<!-- 빠른 링크 섹션 -->
	<div class="card bg-gradient-to-r from-primary/5 to-secondary/5 shadow-sm">
		<div class="card-body p-4 sm:p-6">
			<h2 class="card-title text-lg sm:text-xl mb-4">🔗 바로가기</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
				<LinkButton href="/history" class="btn btn-outline w-full justify-start">
					📈 당첨번호 히스토리
				</LinkButton>
				<LinkButton href="/stats/numbers" class="btn btn-outline w-full justify-start">
					🔢 번호별 통계
				</LinkButton>
				<LinkButton href="/winning-stores" class="btn btn-outline w-full justify-start">
					🏪 당첨점 조회
				</LinkButton>
				<LinkButton href="/stats/colors" class="btn btn-outline w-full justify-start">
					🎨 색상별 분석
				</LinkButton>
			</div>
		</div>
	</div>

	<!-- 면책 조항 -->
	<div class="card bg-warning/10 border border-warning/20 shadow-sm">
		<div class="card-body p-4 sm:p-6">
			<h3 class="font-semibold text-warning-content mb-3 flex items-center gap-2">
				⚠️ 중요 안내사항
			</h3>
			<div class="text-sm sm:text-base text-warning-content/80 space-y-2">
				<p>• 로또는 확률 게임으로, 당첨을 보장하지 않습니다.</p>
				<p>• 여유 자금으로만 구매하시고, 과도한 구매는 피해주세요.</p>
				<p>• 모든 통계와 분석은 참고용이며, 미래 당첨을 예측하지 않습니다.</p>
				<p>• 건전한 복권 문화를 위해 적정선을 지켜주세요.</p>
			</div>
		</div>
	</div>
</div>

<style>
/* 부드러운 스크롤 및 앵커 오프셋 */
html {
	scroll-behavior: smooth;
}

section[id] {
	scroll-margin-top: 2rem;
}

/* 목차 링크 호버 효과 */
a[href^="#"]:hover {
	transform: translateY(-1px);
}

/* 반응형 텍스트 크기 조정 */
@media (max-width: 640px) {
	h1 {
		line-height: 1.2;
	}
	
	.card-body {
		padding: 1rem;
	}
}
</style>