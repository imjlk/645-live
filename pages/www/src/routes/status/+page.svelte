<script lang="ts">
import StructuredAgentPage from "$lib/components/agent/StructuredAgentPage.svelte";
import { absoluteUrl } from "$lib/seo/index.js";
import MetaTags from "$lib/seo/PageMeta.svelte";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();

const issueCount = $derived(data.status.issues.length);
const statusLabel = $derived(
	data.status.status === "ok"
		? "정상"
		: data.status.status === "degraded"
			? "주의"
			: data.status.status,
);
const databaseLabel = $derived(
	data.status.dependencies.database === "ready"
		? "정상"
		: data.status.dependencies.database === "unavailable"
			? "사용 불가"
			: data.status.dependencies.database,
);
const checkedAtLabel = $derived(
	new Date(data.status.timestamp).toLocaleString("ko-KR", {
		timeZone: "Asia/Seoul",
	}),
);
</script>

<MetaTags
	title="상태"
	titleTemplate="%s | 645.live"
	description="645.live 데이터 조회와 회원 서비스의 현재 상태를 확인하세요. 데이터베이스 연결, 사용 가능한 로그인 방식, 확인된 문제와 마지막 점검 시각을 안내하며, API 상태 정보와 관련 연동 문서도 제공합니다."
	canonical={absoluteUrl("/status")}
	robots="index,follow"
/>

<div class="content-page space-y-6">
	<section class="rounded-xl border border-base-300/70 bg-base-100/85 p-6 shadow-sm">
		<p class="text-xs font-semibold tracking-[0.22em] text-base-content/45">실시간 상태</p>
		<div class="mt-3 flex flex-wrap items-center gap-3">
			<h1 class="text-3xl font-black tracking-[-0.04em] text-base-content">
				서비스 상태: {statusLabel}
			</h1>
			<span class={`badge badge-lg ${data.status.status === "ok" ? "badge-success" : "badge-warning"}`}>
				{statusLabel}
			</span>
		</div>
		<p class="mt-3 max-w-3xl text-sm leading-7 text-base-content/75">
			마지막 확인 시각은 {checkedAtLabel}입니다. 공개 결과와 통계는 로그인 없이 조회할 수 있습니다. 회원 스캔 기록을 이용하려면 로그인해주세요.
		</p>
		<div class="mt-5 grid gap-4 md:grid-cols-3">
			<div class="rounded-lg border border-base-300/70 bg-base-200/60 p-4">
				<p class="text-xs tracking-[0.2em] text-base-content/45">데이터베이스</p>
				<p class="mt-2 text-xl font-semibold text-base-content">{databaseLabel}</p>
			</div>
			<div class="rounded-lg border border-base-300/70 bg-base-200/60 p-4">
				<p class="text-xs tracking-[0.2em] text-base-content/45">소셜 로그인</p>
				<p class="mt-2 text-xl font-semibold text-base-content">{data.status.auth.socialProviders.length}</p>
			</div>
			<div class="rounded-lg border border-base-300/70 bg-base-200/60 p-4">
				<p class="text-xs tracking-[0.2em] text-base-content/45">열린 이슈</p>
				<p class="mt-2 text-xl font-semibold text-base-content">{issueCount}</p>
			</div>
		</div>
		{#if issueCount > 0}
			<div class="mt-5 rounded-lg border border-warning/40 bg-warning/10 p-4">
				<p class="font-semibold text-warning">현재 이슈</p>
				{#each data.status.issues as issue (`${issue.code}-${issue.message}`)}
					<p class="mt-2 text-sm leading-6 text-base-content/78">
						<strong>{issue.code}</strong>: {issue.message}
					</p>
				{/each}
			</div>
		{/if}
	</section>

	<StructuredAgentPage page={data.page} headingLevel={2} />
</div>
