<script lang="ts">
import { resolve } from "$app/paths";
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";
import { ABOUT_PATH, SITE_GITHUB, SITE_TWITTER, absoluteUrl } from "$lib/seo/index.js";
import { MetaTags } from "svelte-meta-tags";

const breadcrumbItems = [
	{ label: "홈", href: "/" },
	{ label: "645.live 소개", current: true },
];

const twitterUrl = `https://x.com/${SITE_TWITTER.replace(/^@/, "")}`;
</script>

<MetaTags
	title="645.live 소개"
	titleTemplate="%s | 645.live"
	description="645.live가 로또 회차 데이터, 자체 스캔 현황, 분석 기사를 어떤 기준으로 제공하는지 소개합니다."
	canonical={absoluteUrl(ABOUT_PATH)}
	robots="index,follow"
/>

<div class="p-6 space-y-6">
	<Breadcrumbs items={breadcrumbItems} />

	<div class="text-center space-y-2">
		<h1 class="text-3xl font-bold text-primary">645.live 소개</h1>
		<p class="text-base-content/70">
			동행복권 공식 발표와 645.live 자체 스캔 데이터를 함께 정리해, 최근 회차를 빠르게 이해할 수 있도록 돕는 정보 서비스입니다.
		</p>
	</div>

	<div class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
		<section class="card bg-base-100 shadow-sm">
			<div class="card-body prose prose-sm sm:prose max-w-none">
				<h2>무엇을 제공하나요?</h2>
				<p>
					645.live는 추첨 결과, 당첨점 정보, 번호별 스캔 현황, 회차별 통계와 함께 최신 로또 뉴스를 제공합니다. 단순 결과 나열보다 “이번 회차에서 실제로 무엇이 달랐는지”를 빠르게 파악할 수 있도록 돕는 것이 목표입니다.
				</p>

				<h2>어떻게 운영하나요?</h2>
				<p>
					기본 데이터는 동행복권 공식 발표를 우선 기준으로 삼고, 사이트 내 QR 스캔·번호 선택 흐름에서 쌓이는 자체 데이터를 보조 지표로 사용합니다. 뉴스 초안은 자동 생성될 수 있지만, 템플릿과 데이터 규칙은 645.live 기준으로 관리합니다.
				</p>

				<h2>무엇을 보장하지 않나요?</h2>
				<p>
					645.live는 정보 제공 서비스이며, 당첨이나 수익을 보장하지 않습니다. 기사와 통계는 참고 자료로 제공되며 최종 판단 책임은 이용자에게 있습니다.
				</p>
			</div>
		</section>

		<aside class="card bg-base-100 shadow-sm">
			<div class="card-body space-y-4">
				<div>
					<h2 class="card-title text-lg">운영 채널</h2>
					<p class="text-sm text-base-content/70">
						문의와 제보는 아래 공개 채널로 받습니다.
					</p>
				</div>

				<div class="space-y-2 text-sm">
					<p>
						X:
						<a class="link link-primary" href={twitterUrl} rel="noreferrer" target="_blank">
							{SITE_TWITTER}
						</a>
					</p>
					<p>
						GitHub:
						<a class="link link-primary" href={SITE_GITHUB} rel="noreferrer" target="_blank">
							645-live 저장소
						</a>
					</p>
				</div>

				<div class="divider my-1"></div>

				<div class="space-y-2 text-sm">
					<a class="link link-primary" href={resolve("/editorial-policy")}>편집 원칙 보기</a>
					<a class="link link-primary" href={resolve("/data-sources")}>데이터 출처 보기</a>
					<a class="link link-primary" href={resolve("/authors/645-live-auto-news")}>645.live 자동뉴스 소개</a>
				</div>
			</div>
		</aside>
	</div>
</div>
