<script lang="ts">
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";
import { EDITORIAL_POLICY_PATH, absoluteUrl } from "$lib/seo/index.js";
import { MetaTags } from "svelte-meta-tags";

const breadcrumbItems = [
	{ label: "홈", href: "/" },
	{ label: "편집 원칙", current: true },
];
</script>

<MetaTags
	title="편집 원칙"
	titleTemplate="%s | 645.live"
	description="645.live 뉴스와 통계 페이지가 어떤 기준으로 자동 생성·갱신되는지 설명합니다."
	canonical={absoluteUrl(EDITORIAL_POLICY_PATH)}
	robots="index,follow"
/>

<div class="p-6 space-y-6">
	<Breadcrumbs items={breadcrumbItems} />

	<div class="text-center space-y-2">
		<h1 class="text-3xl font-bold text-primary">편집 원칙</h1>
		<p class="text-base-content/70">
			645.live는 공식 발표와 자체 데이터에 기반해 자동화된 기사와 통계를 제공하지만, 원본성·명확성·시의성을 가장 중요한 기준으로 둡니다.
		</p>
	</div>

	<div class="card bg-base-100 shadow-sm">
		<div class="card-body prose prose-sm sm:prose max-w-none">
			<h2>1. 기사 생성 기준</h2>
			<p>
				뉴스 초안은 자동 생성될 수 있으며, 제목·요약·본문은 회차 결과와 자체 분석 규칙을 바탕으로 구성됩니다. 동일한 결과를 반복 나열하기보다 회차별 특징과 차이를 강조하도록 템플릿을 관리합니다.
			</p>

			<h2>2. 데이터 우선순위</h2>
			<p>
				동행복권 공식 발표 데이터를 1차 기준으로 사용합니다. 사이트 내부 스캔 현황과 통계는 보조 분석 지표로만 활용하며, 공식 발표와 충돌할 경우 공식 데이터를 우선합니다.
			</p>

			<h2>3. 날짜와 수정 기준</h2>
			<p>
				기사에는 발행일을 명시하고, 본문·메타데이터가 실질적으로 보정된 경우 수정일을 함께 표시합니다. 회차성 콘텐츠 특성상 최신 시점 신호를 중요하게 다룹니다.
			</p>

			<h2>4. 정정 및 보완</h2>
			<p>
				공식 발표 변경, 데이터 수집 지연, 이미지·메타 생성 오류가 확인되면 해당 기사와 관련 페이지를 우선 수정합니다. 중요한 구조 변경은 공개 페이지와 운영 문서에 반영합니다.
			</p>

			<h2>5. 광고·추천성 콘텐츠 기준</h2>
			<p>
				645.live는 정보 제공이 목적이며, 특정 번호 구매나 수익을 보장하는 표현을 지양합니다. 통계와 기사 내용은 참고 정보로 제공됩니다.
			</p>
		</div>
	</div>
</div>
