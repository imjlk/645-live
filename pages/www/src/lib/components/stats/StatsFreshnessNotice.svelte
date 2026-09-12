<script lang="ts">
import type { StatsFreshness } from "$lib/trailbase/stats-freshness";

let { freshness }: { freshness: StatsFreshness } = $props();
const timestampFormatter = new Intl.DateTimeFormat("ko-KR", {
	dateStyle: "medium",
	timeStyle: "short",
	timeZone: "Asia/Seoul",
});
const formattedUpdatedAt = $derived(
	freshness.lastUpdatedAt
		? timestampFormatter.format(new Date(freshness.lastUpdatedAt))
		: "",
);
</script>

<div class="freshness" class:stale={freshness.isStale}>
	<span class="freshness-status"><span class="dot" aria-hidden="true"></span>{freshness.latestRound <= 0 ? "통계 확인 중" : freshness.isStale ? "통계 반영 중" : "반영 완료"}</span>
	<p>
		{#if freshness.latestRound <= 0}
			갱신 정보를 불러오지 못했어요.
		{:else if freshness.isStale}
			현재 {freshness.analysisRound}회 기준 · 최신 추첨 {freshness.latestRound}회
		{:else}
			{freshness.latestRound}회 기준{freshness.latestDrawDate ? ` · ${freshness.latestDrawDate}` : ""}
		{/if}
	</p>
	{#if formattedUpdatedAt}<span class="updated">갱신 {formattedUpdatedAt}</span>{/if}
</div>

<style>
	.freshness { display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem 0.75rem; font-size: 0.8125rem; line-height: 1.5; color: color-mix(in oklab, var(--color-base-content) 72%, transparent); }
	.freshness-status { display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 600; color: var(--color-base-content); }
	.dot { width: 0.375rem; height: 0.375rem; border-radius: 50%; background: var(--color-primary); }
	.stale { padding: 0.75rem; border-left: 3px solid var(--color-warning); background: color-mix(in oklab, var(--color-warning) 8%, var(--color-base-100)); }
	.stale .dot { background: var(--color-warning); }
	.updated { color: color-mix(in oklab, var(--color-base-content) 65%, transparent); }
</style>
