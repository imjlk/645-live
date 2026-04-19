<script lang="ts">
	import { resolve } from "$app/paths";
	import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";
	import {
		CONTACT_PATH,
		SITE_GITHUB,
		SITE_TWITTER,
		absoluteUrl,
	} from "$lib/seo/index.js";
	import { MetaTags } from "svelte-meta-tags";

	const breadcrumbItems = [
		{ label: "홈", href: "/" },
		{ label: "문의", current: true },
	];

	const twitterUrl = `https://x.com/${SITE_TWITTER.replace(/^@/, "")}`;
</script>

<MetaTags
	title="문의"
	titleTemplate="%s | 645.live"
	description="645.live의 공개 문의 채널과 이슈 제보 경로를 안내합니다."
	canonical={absoluteUrl(CONTACT_PATH)}
	robots="index,follow"
/>

<div class="p-6 space-y-6">
	<Breadcrumbs items={breadcrumbItems} />

	<div class="space-y-2 text-center">
		<h1 class="text-3xl font-bold text-primary">645.live 문의</h1>
		<p class="text-base-content/70">
			공개 API, 문서, MCP, 데이터 이슈, 제품 문의는 아래 공개 채널로 받고 있습니다.
		</p>
	</div>

	<div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
		<section class="card bg-base-100 shadow-sm">
			<div class="card-body prose prose-sm sm:prose max-w-none">
				<h2>문의 전에 같이 보내주면 좋은 정보</h2>
				<ul>
					<li>문제가 발생한 페이지 또는 엔드포인트 URL</li>
					<li>관련 회차 번호나 통계 페이지</li>
					<li>공개 API, MCP, QR 스캔, 회원 스캔 중 어느 흐름인지</li>
					<li>가능하면 재현 단계와 응답 메시지</li>
				</ul>

				<h2>지원 범위</h2>
				<p>
					645.live는 현재 공개 읽기 API, 통계/설명 페이지, MCP 탐색 표면, 회원 스캔 흐름을 중심으로 운영합니다.
					OAuth 기반 에이전트 인증과 별도 결제/상거래 프로토콜은 아직 준비 중입니다.
				</p>
			</div>
		</section>

		<aside class="card bg-base-100 shadow-sm">
			<div class="card-body space-y-4">
				<div>
					<h2 class="card-title text-lg">공개 채널</h2>
					<p class="text-sm text-base-content/70">
						현재 전용 지원 이메일 대신 아래 공개 채널을 사용합니다.
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
					<a class="link link-primary" href={resolve("/docs")}>개발자 문서 보기</a>
					<a class="link link-primary" href={resolve("/status")}>상태 페이지 보기</a>
					<a class="link link-primary" href={resolve("/compare")}>비교/차별점 보기</a>
				</div>
			</div>
		</aside>
	</div>
</div>
