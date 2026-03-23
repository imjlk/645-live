<script lang="ts">
	import type { StatsFreshness } from "$lib/trailbase/stats-freshness";

	type Props = {
		freshness: StatsFreshness;
	};

	let { freshness }: Props = $props();

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

<div
	class={`rounded-xl border px-4 py-3 text-sm ${
		freshness.isStale
			? "border-warning/40 bg-warning/10 text-warning-content"
			: "border-base-300 bg-base-200/70 text-base-content/80"
	}`}
>
	{#if freshness.isStale}
		<p class="font-medium text-base-content">
			일부 통계가 아직 최신 회차까지 반영되지 않았습니다.
		</p>
		<p class="mt-1 leading-relaxed">
			최신 추첨 결과는 <strong>{freshness.latestRound}회차</strong>이지만, 현재 표시 중인 통계는
			<strong>{freshness.analysisRound}회차</strong> 기준입니다. {freshness.sourceLabel} 데이터를
			갱신하는 중입니다.
		</p>
	{:else}
		<p class="leading-relaxed">
			최신 <strong>{freshness.latestRound}회차</strong> 기준 통계입니다.
			{#if freshness.latestDrawDate}
				({freshness.latestDrawDate})
			{/if}
		</p>
	{/if}

	{#if formattedUpdatedAt}
		<p class="mt-2 text-xs opacity-70">
			최종 업데이트: {formattedUpdatedAt}
		</p>
	{/if}
</div>
