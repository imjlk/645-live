<script lang="ts">
import { resolve } from "$app/paths";
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";
import { AUTO_NEWS_AUTHOR_PATH, absoluteUrl } from "$lib/seo/index.js";
import { MetaTags } from "svelte-meta-tags";

const breadcrumbItems = [
	{ label: "홈", href: "/" },
	{ label: "작성자", href: "/authors/645-live-auto-news" },
	{ label: "645.live 자동뉴스", current: true },
];
</script>

<MetaTags
	title="645.live 자동뉴스"
	titleTemplate="%s | 645.live"
	description="645.live 자동뉴스가 어떤 데이터와 규칙으로 로또 기사 초안을 생성하는지 소개합니다."
	canonical={absoluteUrl(AUTO_NEWS_AUTHOR_PATH)}
	robots="index,follow"
/>

<div class="p-6 space-y-6">
	<Breadcrumbs items={breadcrumbItems} />

	<div class="text-center space-y-2">
		<h1 class="text-3xl font-bold text-primary">645.live 자동뉴스</h1>
		<p class="text-base-content/70">
			동행복권 공식 발표와 645.live 내부 통계 데이터를 바탕으로 최신 로또 기사를 자동 생성하는 에디토리얼 계정입니다.
		</p>
	</div>

	<div class="card bg-base-100 shadow-sm">
		<div class="card-body prose prose-sm sm:prose max-w-none">
			<h2>어떤 역할을 하나요?</h2>
			<p>
				645.live 자동뉴스는 회차 결과, 당첨자 수, 당첨점 분포, 자체 스캔 데이터, 최근 통계 링크를 조합해 기사 초안을 만듭니다. 기사 구조와 메타데이터는 645.live 운영 기준에 따라 관리됩니다.
			</p>

			<h2>어떤 데이터를 쓰나요?</h2>
			<p>
				기본 사실 관계는 동행복권 공식 발표를 따르고, 645.live 내부 스캔 데이터는 “이번 회차에서 사람들이 무엇을 많이 확인했는지”를 보여주는 보조 인사이트로 사용합니다.
			</p>

			<h2>무엇을 목표로 하나요?</h2>
			<p>
				단순 요약보다 회차별 특징을 빠르게 파악할 수 있는 기사를 만드는 것이 목표입니다. 자동 생성 기사라도 발행 시점, 이미지, 구조화 데이터, 연결 통계까지 함께 갖춘 형태를 지향합니다.
			</p>

			<p>
				더 자세한 기준은 <a href={resolve("/editorial-policy")}>편집 원칙</a>, 데이터 설명은 <a href={resolve("/data-sources")}>데이터 출처</a> 페이지에서 확인할 수 있습니다.
			</p>
		</div>
	</div>
</div>
