<script lang="ts">
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";
import LinkButton from "$lib/ui/LinkButton.svelte";
import { JsonLd, MetaTags } from "svelte-meta-tags";

// Breadcrumbs 데이터
const breadcrumbItems = [
	{ label: "홈", href: "/" },
	{ label: "자주 묻는 질문", href: "/faq", current: true },
];

// FAQ 데이터
const faqCategories = [
	{
		id: "basic",
		title: "🎯 기본 사용법",
		items: [
			{
				question: "645.live는 어떤 서비스인가요?",
				answer:
					"645.live는 로또 6/45 관련 종합 정보 서비스입니다. 실시간 스캔 현황, 당첨번호 통계, 번호 생성기, 당첨점 조회 등 다양한 기능을 무료로 제공합니다.",
			},
			{
				question: "QR 스캔은 어떻게 사용하나요?",
				answer:
					"로또 용지의 QR 코드를 스캔하면 당첨번호와 자동으로 비교하여 당첨 여부를 확인할 수 있습니다. 카메라 권한을 허용한 후 QR 코드를 화면에 맞춰 주세요.",
			},
			{
				question: "번호 생성기는 어떤 원리인가요?",
				answer:
					"완전히 무작위로 번호를 생성하며, 과거 통계 데이터를 참고한 가중치 생성도 지원합니다. 하지만 어떤 방식도 당첨을 보장하지는 않습니다.",
			},
			{
				question: "통계 데이터는 얼마나 정확한가요?",
				answer:
					"동행복권의 공식 당첨번호 데이터를 기반으로 하며, 매주 업데이트됩니다. 모든 통계는 참고용이며 미래 당첨을 예측하지 않습니다.",
			},
		],
	},
	{
		id: "features",
		title: "📊 기능별 질문",
		items: [
			{
				question: "실시간 스캔 현황은 무엇인가요?",
				answer:
					"사용자들이 QR 스캔을 통해 확인한 번호들의 실시간 집계 현황입니다. 어떤 번호가 많이 선택되고 있는지 참고할 수 있습니다.",
			},
			{
				question: "당첨점 조회에서 정보가 없는 이유는?",
				answer:
					"해당 회차에 1등 또는 2등 당첨자가 없거나, 아직 당첨점 정보가 공개되지 않았을 수 있습니다. 보통 추첨 후 1-2일 내에 업데이트됩니다.",
			},
			{
				question: "번호별 통계에서 '뜨거운 번호'와 '차가운 번호'는 무엇인가요?",
				answer:
					"'뜨거운 번호'는 최근에 자주 출현한 번호, '차가운 번호'는 오랫동안 출현하지 않은 번호입니다. 하지만 모든 번호는 동일한 당첨 확률을 가집니다.",
			},
			{
				question: "모바일에서도 모든 기능을 사용할 수 있나요?",
				answer:
					"네, 모든 기능이 모바일에 최적화되어 있습니다. 터치 제스처, 모바일 네비게이션, 반응형 디자인을 지원합니다.",
			},
		],
	},
	{
		id: "technical",
		title: "⚙️ 기술적 질문",
		items: [
			{
				question: "오프라인에서도 사용할 수 있나요?",
				answer:
					"일부 기본 기능은 오프라인에서도 작동하지만, 실시간 데이터나 최신 통계는 인터넷 연결이 필요합니다.",
			},
			{
				question: "카메라 권한이 필요한 이유는?",
				answer:
					"QR 스캔 기능을 위해서만 사용되며, 촬영이나 저장하지 않습니다. 스캔 후 즉시 권한 사용이 중단됩니다.",
			},
			{
				question: "데이터 사용량은 얼마나 되나요?",
				answer:
					"대부분의 콘텐츠가 텍스트 기반이므로 데이터 사용량이 적습니다. 한 달 일반적 사용 시 약 10-20MB 정도입니다.",
			},
			{
				question: "브라우저 호환성은 어떻게 되나요?",
				answer:
					"Chrome, Safari, Firefox, Edge 등 모든 주요 브라우저를 지원합니다. QR 스캔은 카메라를 지원하는 브라우저에서만 작동합니다.",
			},
		],
	},
	{
		id: "lotto",
		title: "🎫 로또 관련 질문",
		items: [
			{
				question: "로또 구매는 어디서 할 수 있나요?",
				answer:
					"전국 로또 판매점, 편의점, 동행복권 온라인 홈페이지, 모바일 앱에서 구매 가능합니다. 판매 마감은 매주 토요일 오후 8시입니다.",
			},
			{
				question: "당첨 확률을 높이는 방법이 있나요?",
				answer:
					"로또는 완전한 확률 게임으로, 어떤 번호나 전략도 당첨 확률을 높일 수 없습니다. 모든 번호 조합이 동일한 확률을 가집니다.",
			},
			{
				question: "과거 당첨번호를 분석하면 도움이 될까요?",
				answer:
					"통계적 참고 자료로는 유용하지만, 과거 결과가 미래 당첨번호에 영향을 주지는 않습니다. 각 추첨은 독립적인 사건입니다.",
			},
			{
				question: "자동과 수동 중 어느 것이 더 좋나요?",
				answer:
					"당첨 확률은 동일합니다. 자동은 편리하지만 중복 번호 가능성이 있고, 수동은 개인 선호를 반영할 수 있습니다.",
			},
		],
	},
	{
		id: "service",
		title: "🛠️ 서비스 관련",
		items: [
			{
				question: "회원가입이 필요한가요?",
				answer:
					"대부분의 기능은 회원가입 없이 사용 가능합니다. 개인 설정 저장이나 히스토리 관리를 원하시면 간단한 회원가입을 할 수 있습니다.",
			},
			{
				question: "서비스 이용 요금이 있나요?",
				answer:
					"모든 기본 기능은 완전 무료입니다. 광고 없는 프리미엄 기능은 향후 제공될 예정이지만, 핵심 기능은 항상 무료로 유지됩니다.",
			},
			{
				question: "개인정보는 어떻게 관리되나요?",
				answer:
					"최소한의 정보만 수집하며, 제3자에게 제공하지 않습니다. 자세한 내용은 개인정보 처리방침을 참고해 주세요.",
			},
			{
				question: "오류나 개선사항은 어디에 신고하나요?",
				answer:
					"페이지 하단의 문의하기 링크를 통해 신고해 주시면 빠른 시간 내에 해결하겠습니다. 사용자 피드백을 적극 환영합니다.",
			},
		],
	},
	{
		id: "safety",
		title: "🔒 보안 및 안전",
		items: [
			{
				question: "QR 스캔이 안전한가요?",
				answer:
					"네, QR 코드는 단순히 번호 정보만 포함하고 있으며, 개인정보나 금융정보는 없습니다. 스캔 과정에서 어떤 데이터도 외부로 전송되지 않습니다.",
			},
			{
				question: "사이트에서 로또를 직접 구매할 수 있나요?",
				answer:
					"아니오, 저희는 정보 제공 서비스만 운영합니다. 로또 구매는 공식 판매처에서만 가능하며, 저희와는 무관합니다.",
			},
			{
				question: "당첨번호 정보는 공식적인가요?",
				answer:
					"네, 동행복권의 공식 API를 통해 당첨번호를 가져오며, 추첨 직후 업데이트됩니다. 하지만 공식 확인은 반드시 동행복권에서 해주세요.",
			},
			{
				question: "피싱이나 사기 사이트는 아닌가요?",
				answer:
					"645.live는 정보 제공만 하는 합법적인 서비스입니다. 결제나 개인정보 입력을 요구하지 않으며, HTTPS 보안 연결을 사용합니다.",
			},
		],
	},
];

// 검색 기능을 위한 상태
let searchQuery = $state("");
let filteredCategories = $derived(() => {
	if (!searchQuery.trim()) return faqCategories;

	const query = searchQuery.toLowerCase();
	return faqCategories
		.map((category) => ({
			...category,
			items: category.items.filter(
				(item) =>
					item.question.toLowerCase().includes(query) ||
					item.answer.toLowerCase().includes(query),
			),
		}))
		.filter((category) => category.items.length > 0);
});

// 아코디언 상태 관리
let openItems = $state<Set<string>>(new Set());

function toggleItem(categoryId: string, itemIndex: number) {
	const key = `${categoryId}-${itemIndex}`;
	if (openItems.has(key)) {
		openItems.delete(key);
	} else {
		openItems.add(key);
	}
	openItems = new Set(openItems); // 반응성 트리거
}

function isItemOpen(categoryId: string, itemIndex: number): boolean {
	return openItems.has(`${categoryId}-${itemIndex}`);
}
</script>

<MetaTags
	title="자주 묻는 질문 FAQ | 로또 6/45 서비스 이용 안내"
	titleTemplate="%s | 645.live"
	description="645.live 로또 서비스 이용 중 궁금한 점들을 해결해 보세요. QR 스캔, 통계 분석, 번호 생성기 사용법부터 로또 기본 정보까지."
	canonical="https://www.645.live/faq"
	keywords={["로또FAQ", "로또질문", "QR스캔방법", "로또통계", "번호생성기", "당첨확인", "로또구매", "645live사용법"]}
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
		type: 'website',
		url: 'https://www.645.live/faq',
		title: '자주 묻는 질문 FAQ | 로또 6/45 서비스 이용 안내',
		description: '645.live 로또 서비스 이용 중 궁금한 점들을 해결해 보세요. QR 스캔부터 통계 분석까지.',
		locale: 'ko_KR',
		images: [{
			url: `https://www.645.live/og?title=${encodeURIComponent('자주 묻는 질문 FAQ')}&description=${encodeURIComponent('로또 서비스 이용 가이드 - QR스캔, 통계분석, 번호생성기 사용법')}&layout=minimal&theme=dark`,
			width: 1200,
			height: 630,
			alt: '자주 묻는 질문 FAQ',
			type: 'image/svg+xml'
		}],
		siteName: '645.live'
	}}
	twitter={{
		cardType: 'summary_large_image',
		site: '@645live',
		title: '자주 묻는 질문 FAQ',
		description: '로또 서비스 이용 중 궁금한 점들을 해결해 보세요.',
		image: `https://www.645.live/og?title=${encodeURIComponent('자주 묻는 질문 FAQ')}&description=${encodeURIComponent('로또 서비스 이용 가이드')}&layout=minimal&theme=dark`,
		imageAlt: '자주 묻는 질문 FAQ'
	}}
/>

<JsonLd
	schema={{
		'@type': 'FAQPage',
		mainEntity: faqCategories.flatMap(category => 
			category.items.map(item => ({
				'@type': 'Question',
				name: item.question,
				acceptedAnswer: {
					'@type': 'Answer',
					text: item.answer
				}
			}))
		),
		url: 'https://www.645.live/faq',
		inLanguage: 'ko-KR',
		author: {
			'@type': 'Organization',
			name: '645.live'
		}
	}}
/>

<div class="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-5 lg:space-y-6 max-w-4xl mx-auto">
	<!-- Breadcrumbs -->
	<Breadcrumbs items={breadcrumbItems} />

	<!-- 페이지 헤더 -->
	<div class="text-center space-y-3 sm:space-y-4">
		<h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary">자주 묻는 질문</h1>
		<p class="text-base sm:text-lg text-base-content/70 leading-relaxed">
			645.live 이용 중 궁금한 점들을 빠르게 해결해 보세요.<br />
			원하는 질문을 검색하거나 카테고리별로 찾아보실 수 있습니다.
		</p>
	</div>

	<!-- 검색 기능 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body p-4 sm:p-6">
			<div class="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
				<label for="faq-search" class="text-sm font-medium whitespace-nowrap">
					🔍 FAQ 검색:
				</label>
				<input
					id="faq-search"
					type="text"
					bind:value={searchQuery}
					placeholder="궁금한 내용을 검색해 보세요..."
					class="input input-bordered flex-1 text-sm sm:text-base"
				/>
				{#if searchQuery}
					<button
						type="button"
						onclick={() => searchQuery = ""}
						class="btn btn-outline btn-sm"
					>
						초기화
					</button>
				{/if}
			</div>
			{#if searchQuery && filteredCategories.length === 0}
				<div class="mt-4 text-center text-base-content/60">
					<p>검색 결과가 없습니다. 다른 키워드로 검색해 보세요.</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- 빠른 링크 -->
	{#if !searchQuery}
		<div class="card bg-base-100 shadow-sm">
			<div class="card-body p-4 sm:p-6">
				<h2 class="card-title text-lg sm:text-xl mb-4">🚀 빠른 시작</h2>
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
					<LinkButton href="/guide" class="btn btn-outline w-full justify-start text-xs sm:text-sm">
						📚 이용 가이드
					</LinkButton>
					<LinkButton href="/qr-scan" class="btn btn-outline w-full justify-start text-xs sm:text-sm">
						📱 QR 스캔
					</LinkButton>
					<LinkButton href="/stats" class="btn btn-outline w-full justify-start text-xs sm:text-sm">
						📊 통계 분석
					</LinkButton>
					<LinkButton href="/generator" class="btn btn-outline w-full justify-start text-xs sm:text-sm">
						🎲 번호 생성
					</LinkButton>
				</div>
			</div>
		</div>
	{/if}

	<!-- FAQ 카테고리별 목록 -->
	{#each filteredCategories as category}
		<section class="card bg-base-100 shadow-sm">
			<div class="card-body p-4 sm:p-6">
				<h2 class="card-title text-lg sm:text-xl text-primary mb-4 sm:mb-6">
					{category.title}
				</h2>
				
				<div class="space-y-3 sm:space-y-4">
					{#each category.items as item, index}
						{@const isOpen = isItemOpen(category.id, index)}
						<div class="border border-base-300 rounded-lg overflow-hidden">
							<button
								type="button"
								onclick={() => toggleItem(category.id, index)}
								class="w-full px-4 sm:px-6 py-3 sm:py-4 text-left bg-base-50 hover:bg-base-100 transition-colors duration-200 flex items-center justify-between"
								aria-expanded={isOpen}
							>
								<span class="font-medium text-sm sm:text-base text-base-content pr-4">
									{item.question}
								</span>
								<span class="text-primary text-lg font-bold flex-shrink-0 transition-transform duration-200 {isOpen ? 'rotate-45' : ''}">
									+
								</span>
							</button>
							
							{#if isOpen}
								<div class="px-4 sm:px-6 py-3 sm:py-4 bg-white border-t border-base-200">
									<p class="text-sm sm:text-base text-base-content/80 leading-relaxed">
										{item.answer}
									</p>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</section>
	{/each}

	<!-- 추가 도움말 -->
	<div class="card bg-info/10 border border-info/20 shadow-sm">
		<div class="card-body p-4 sm:p-6">
			<h3 class="font-semibold text-info-content mb-3 text-base sm:text-lg flex items-center gap-2">
				💡 더 도움이 필요하시나요?
			</h3>
			<div class="text-sm sm:text-base text-info-content/80 space-y-2">
				<p>원하는 답변을 찾지 못하셨다면 다음을 확인해 보세요:</p>
				<ul class="list-disc list-inside space-y-1 ml-2">
					<li><strong>로또 가이드:</strong> 기본적인 이용 방법과 용어 설명</li>
					<li><strong>개인정보 처리방침:</strong> 데이터 관리 및 보안 관련 정보</li>
					<li><strong>서비스 이용약관:</strong> 서비스 사용 규정 및 제한사항</li>
				</ul>
			</div>
			
			<div class="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
				<LinkButton href="/guide" class="btn btn-info btn-sm flex-1">
					이용 가이드 보기
				</LinkButton>
				<LinkButton href="/privacy" class="btn btn-outline btn-info btn-sm flex-1">
					개인정보 처리방침
				</LinkButton>
			</div>
		</div>
	</div>
</div>

<style>
/* 부드러운 아코디언 애니메이션 */
.transition-transform {
	transition: transform 0.2s ease-in-out;
}

/* 검색 결과 하이라이트 효과 */
.card {
	transition: all 0.2s ease-in-out;
}

.card:hover {
	transform: translateY(-1px);
	box-shadow: 0 8px 25px rgba(0,0,0,0.1);
}

/* 반응형 텍스트 조정 */
@media (max-width: 640px) {
	.card-body {
		padding: 1rem;
	}
	
	h1 {
		line-height: 1.2;
	}
}
</style>