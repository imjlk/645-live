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

<div class:stale={freshness.isStale} class="freshness-notice">
	<div class="freshness-notice__badge">
		<span class="freshness-notice__dot" aria-hidden="true"></span>
		<span>{freshness.isStale ? "갱신 중" : "최신 반영"}</span>
	</div>

	<div class="freshness-notice__content">
		{#if freshness.isStale}
			<p class="freshness-notice__title">일부 통계가 아직 최신 회차까지 반영되지 않았습니다.</p>
			<p class="freshness-notice__copy">
				최신 추첨 결과는 <strong>{freshness.latestRound}회차</strong>이지만, 현재 표시 중인 통계는
				<strong>{freshness.analysisRound}회차</strong> 기준입니다. {freshness.sourceLabel} 데이터를 갱신하는 중입니다.
			</p>
		{:else}
			<p class="freshness-notice__title">
				최신 <strong>{freshness.latestRound}회차</strong> 기준 통계입니다.
				{#if freshness.latestDrawDate}
					({freshness.latestDrawDate})
				{/if}
			</p>
		{/if}

		{#if formattedUpdatedAt}
			<p class="freshness-notice__timestamp">최종 업데이트: {formattedUpdatedAt}</p>
		{/if}
	</div>
</div>

<style>
	.freshness-notice {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: flex-start;
		border-radius: 1.35rem;
		border: 1px solid color-mix(in oklab, oklch(var(--b3)) 70%, white);
		background: color-mix(in oklab, oklch(var(--b1)) 90%, white);
		padding: 0.9rem 1rem;
		color: color-mix(in oklab, oklch(var(--bc)) 75%, white);
	}

	.freshness-notice.stale {
		border-color: color-mix(in oklab, oklch(var(--wa)) 30%, oklch(var(--b3)));
		background: color-mix(in oklab, oklch(var(--wa)) 12%, white);
	}

	.freshness-notice__badge {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		border-radius: 9999px;
		padding: 0.45rem 0.7rem;
		background: color-mix(in oklab, oklch(var(--bc)) 5%, white);
		font-size: 0.76rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: oklch(var(--bc));
	}

	.freshness-notice.stale .freshness-notice__badge {
		background: rgba(250, 204, 21, 0.18);
	}

	.freshness-notice__dot {
		width: 0.45rem;
		height: 0.45rem;
		border-radius: 9999px;
		background: color-mix(in oklab, oklch(var(--su)) 80%, white);
	}

	.freshness-notice.stale .freshness-notice__dot {
		background: color-mix(in oklab, oklch(var(--wa)) 78%, white);
	}

	.freshness-notice__content {
		flex: 1 1 16rem;
	}

	.freshness-notice__title {
		font-size: 0.96rem;
		line-height: 1.6;
		color: oklch(var(--bc));
	}

	.freshness-notice__copy {
		margin-top: 0.25rem;
		font-size: 0.9rem;
		line-height: 1.65;
	}

	.freshness-notice__timestamp {
		margin-top: 0.35rem;
		font-size: 0.78rem;
		opacity: 0.72;
	}
</style>
