<script lang="ts">
import type { MyScanListItem, MyScanSummary, PublicSession } from "@645/shared";
import { MetaTags } from "svelte-meta-tags";
import { resolve } from "$app/paths";
import { absoluteUrl } from "$lib/seo/index.js";

let {
	data,
}: {
	data: {
		session: PublicSession;
		summary: MyScanSummary;
		recentScans: MyScanListItem[];
	};
} = $props();

function formatDateTime(value: string | null): string {
	if (!value) {
		return "없음";
	}

	return new Date(value).toLocaleString("ko-KR", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function getStatusLabel(item: MyScanListItem): string {
	if (item.resultStatus === "winner" && item.winningGrade) {
		return `${item.winningGrade} 당첨`;
	}

	if (item.resultStatus === "expired") {
		return "수령 기간 지남";
	}

	if (item.resultStatus === "unreleased") {
		return "미발표";
	}

	if (item.resultStatus === "unknown") {
		return "확인 필요";
	}

	return "당첨 없음";
}

function getStatusBadgeClass(item: MyScanListItem): string {
	if (item.resultStatus === "winner") {
		return "badge-success";
	}

	if (item.resultStatus === "expired") {
		return "badge-error";
	}

	if (item.resultStatus === "unreleased") {
		return "badge-warning";
	}

	if (item.resultStatus === "unknown") {
		return "badge-neutral";
	}

	return "badge-ghost";
}
</script>

<MetaTags
	title="내 645"
	titleTemplate="%s | 645.live"
	description="회원 전용 스캔 티켓 대시보드"
	canonical={absoluteUrl("/my")}
	robots="noindex,nofollow"
/>

<div class="content-page my-page">
	<header class="page-header"><div><h1>내 스캔 기록</h1><p>{data.session.user.name ?? data.session.user.email ?? "회원"}님의 저장한 티켓과 당첨 확인 상태입니다.</p></div><a href={resolve("/qr-scan")} class="btn btn-primary">새 용지 QR 확인</a></header>
	<dl class="account-summary">
		<div><dt>저장한 티켓</dt><dd>{data.summary.totalTickets.toLocaleString()}<span>장</span></dd></div>
		<div><dt>미발표·확인 필요</dt><dd>{data.summary.pendingResults.toLocaleString()}<span>장</span></dd></div>
		<div><dt>당첨 티켓</dt><dd class="text-success-content">{data.summary.winningTickets.toLocaleString()}<span>장</span></dd></div>
		<div><dt>최근 스캔</dt><dd class="last-scan">{formatDateTime(data.summary.lastScannedAt)}</dd></div>
	</dl>
	<section aria-labelledby="recent-scans-heading">
		<div class="section-heading"><div><h2 id="recent-scans-heading">최근 스캔</h2><p>계정에 저장된 최근 티켓 10개를 보여드려요.</p></div></div>
		{#if data.recentScans.length === 0}
			<div class="empty-state"><h3>아직 저장한 티켓이 없어요</h3><p>로그인 상태에서 용지 QR을 확인하면 스캔한 티켓과 당첨 상태를 여기에서 다시 볼 수 있습니다.</p><div class="empty-actions"><a href={resolve("/qr-scan")} class="btn btn-primary">첫 티켓 스캔하기</a><a href={resolve("/history")} class="btn btn-ghost">지난 당첨 결과</a></div></div>
		{:else}
			<ol class="ticket-list">{#each data.recentScans as item (item.id)}<li>
				<div class="ticket-heading"><div>{#if item.round && item.resultStatus !== "unreleased" && item.resultStatus !== "unknown"}<a href={resolve(`/history?round=${item.round}`)} class="round-link">제{item.round}회</a>{:else}<strong>{item.round ? `제${item.round}회` : "회차 확인 필요"}</strong>{/if}<span class="game-count">{item.gamesCount ?? "-"}게임</span></div><span class={`badge ${getStatusBadgeClass(item)}`}>{getStatusLabel(item)}</span></div>
				<p class="ticket-summary">{item.summary}</p><p class="ticket-date">최근 스캔 · {formatDateTime(item.updatedAt)}</p>
			</li>{/each}</ol>
		{/if}
	</section>
</div>

<style>
.page-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
.my-page { max-width: 1040px; margin-inline: auto; }
.account-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem 1rem; border-block: 1px solid var(--color-base-300); padding-block: 1.5rem; margin: 1.5rem 0 2rem; }
dt { font-size: .8rem; color: color-mix(in oklch, var(--color-base-content) 65%, transparent); }
dd { margin: .4rem 0 0; font-size: 2rem; font-weight: 750; font-variant-numeric: tabular-nums; letter-spacing: -.04em; }
dd span { font-size: .85rem; font-weight: 400; margin-left: .25rem; }
dd.last-scan { font-size: 1rem; line-height: 1.7; letter-spacing: 0; }
.ticket-list { list-style: none; padding: 0; margin: 1rem 0 0; }
.ticket-list li { padding: 1.4rem 0; border-bottom: 1px solid var(--color-base-300); }
.ticket-heading { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .75rem; }
.round-link { display: inline-flex; align-items: center; min-height: 44px; font-weight: 700; }
.round-link:hover { color: var(--color-primary); text-decoration: underline; text-underline-offset: 4px; }
.game-count { margin-left: .75rem; font-size: .8rem; color: color-mix(in oklch, var(--color-base-content) 60%, transparent); }
.ticket-summary { margin-top: .4rem; font-size: .9rem; line-height: 1.6; }
.ticket-date { font-size: .75rem; color: color-mix(in oklch, var(--color-base-content) 60%, transparent); margin-top: .5rem; }
.empty-state { padding: 2.5rem 0; }
.empty-state h3 { font-size: 1.2rem; font-weight: 650; }
.empty-state p { margin-top: .75rem; font-size: .9rem; color: color-mix(in oklch, var(--color-base-content) 65%, transparent); line-height: 1.8; max-width: 34rem; }
.empty-actions { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: 1.5rem; }
@media(min-width: 768px) { .account-summary { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 2rem; padding-block: 2rem; } }
</style>
