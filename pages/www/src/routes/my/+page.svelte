<script lang="ts">
import { resolve } from "$app/paths";
import type { PublicSession } from "@645/shared";
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";
import { absoluteUrl } from "$lib/seo/index.js";
import { MetaTags } from "svelte-meta-tags";

let { data }: { data: { session: PublicSession } } = $props();

// Breadcrumbs 데이터
const breadcrumbItems = [
	{ label: "홈", href: "/" },
	{ label: "내 645", current: true },
];
</script>

<MetaTags
	title="내 645"
	titleTemplate="%s | 645.live"
	description="회원 전용 개인화 로또 기능 페이지"
	canonical={absoluteUrl("/my")}
	robots="noindex,nofollow"
/>

<div class="p-6 space-y-6">
	<!-- Breadcrumbs -->
	<Breadcrumbs items={breadcrumbItems} />

	<!-- 페이지 헤더 -->
	<div class="text-center space-y-2">
		<h1 class="text-3xl font-bold text-primary">내 645</h1>
		<p class="text-base-content/70">
			보호된 세션이 정상 연결된 상태입니다. 개인화 기능은 다음 단계에서 이어집니다.
		</p>
	</div>

	<!-- 개발 중 안내 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body text-center space-y-4">
			<h2 class="card-title justify-center">세션 셸 활성화 완료</h2>
			<div class="rounded-xl bg-base-200 p-4 text-left max-w-md mx-auto">
				<p><strong>사용자 ID</strong>: {data.session.user.id}</p>
				<p><strong>이메일</strong>: {data.session.user.email ?? "미설정"}</p>
				<p><strong>이름</strong>: {data.session.user.name ?? "미설정"}</p>
			</div>
			<p class="text-base-content/60">
				이 페이지는 현재 보호 라우트와 세션 동작을 검증하는 단계입니다. 곧 개인화된 로또 분석 기능을 제공할 예정입니다.
			</p>
			<div class="card-actions justify-center mt-4">
				<a href={resolve("/stats")} class="btn btn-primary">통계 페이지로 이동</a>
				<a href={resolve("/")} class="btn btn-outline">홈으로 이동</a>
			</div>
		</div>
	</div>
</div>
