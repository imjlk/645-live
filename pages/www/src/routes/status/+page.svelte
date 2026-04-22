<script lang="ts">
	import StructuredAgentPage from "$lib/components/agent/StructuredAgentPage.svelte";
	import { absoluteUrl } from "$lib/seo/index.js";
	import { MetaTags } from "svelte-meta-tags";
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
	description={data.page.description}
	canonical={absoluteUrl("/status")}
	robots="index,follow"
/>

<div class="space-y-6 p-6">
	<section class="rounded-[2rem] border border-base-300/70 bg-base-100/85 p-6 shadow-sm">
		<p class="text-xs font-semibold tracking-[0.22em] text-base-content/45">실시간 상태</p>
		<div class="mt-3 flex flex-wrap items-center gap-3">
			<h1 class="text-3xl font-black tracking-[-0.04em] text-base-content">
				645.live 공개 표면 상태는 {statusLabel}입니다.
			</h1>
			<span class={`badge badge-lg ${data.status.status === "ok" ? "badge-success" : "badge-warning"}`}>
				{statusLabel}
			</span>
		</div>
		<p class="mt-3 max-w-3xl text-sm leading-7 text-base-content/75">
			마지막 확인 시각은 {checkedAtLabel}입니다. 공개 조회 API는 익명으로 사용할 수 있고, 로그인 회원 작업은 기존 Better Auth 세션 쿠키 흐름을 계속 사용합니다.
		</p>
		<div class="mt-5 grid gap-4 md:grid-cols-3">
			<div class="rounded-3xl border border-base-300/70 bg-base-200/60 p-4">
				<p class="text-xs tracking-[0.2em] text-base-content/45">데이터베이스</p>
				<p class="mt-2 text-xl font-semibold text-base-content">{databaseLabel}</p>
			</div>
			<div class="rounded-3xl border border-base-300/70 bg-base-200/60 p-4">
				<p class="text-xs tracking-[0.2em] text-base-content/45">소셜 로그인</p>
				<p class="mt-2 text-xl font-semibold text-base-content">{data.status.auth.socialProviders.length}</p>
			</div>
			<div class="rounded-3xl border border-base-300/70 bg-base-200/60 p-4">
				<p class="text-xs tracking-[0.2em] text-base-content/45">열린 이슈</p>
				<p class="mt-2 text-xl font-semibold text-base-content">{issueCount}</p>
			</div>
		</div>
		{#if issueCount > 0}
			<div class="mt-5 rounded-3xl border border-warning/40 bg-warning/10 p-4">
				<p class="font-semibold text-warning">현재 이슈</p>
				{#each data.status.issues as issue (`${issue.code}-${issue.message}`)}
					<p class="mt-2 text-sm leading-6 text-base-content/78">
						<strong>{issue.code}</strong>: {issue.message}
					</p>
				{/each}
			</div>
		{/if}
	</section>

	<StructuredAgentPage page={data.page} />
</div>
