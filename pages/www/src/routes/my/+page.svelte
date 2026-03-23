<script lang="ts">
import { resolve } from "$app/paths";
import type {
	MyScanListItem,
	MyScanSummary,
	PublicSession,
} from "@645/shared";
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";
import { absoluteUrl } from "$lib/seo/index.js";
import { MetaTags } from "svelte-meta-tags";

let {
	data,
}: {
	data: {
		session: PublicSession;
		summary: MyScanSummary;
		recentScans: MyScanListItem[];
	};
} = $props();

const breadcrumbItems = [
	{ label: "홈", href: "/" },
	{ label: "내 645", current: true },
];

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

<div class="p-6 space-y-6">
	<Breadcrumbs items={breadcrumbItems} />

	<section class="space-y-2">
		<h1 class="text-3xl font-bold text-primary">내 645</h1>
		<p class="text-base-content/70">
			{data.session.user.name ?? data.session.user.email ?? "회원"}님의 최근 로또 스캔 티켓과 확인 상태를 모아봤어요.
		</p>
	</section>

	<section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<div class="card bg-base-100 shadow-sm">
			<div class="card-body">
				<p class="text-sm text-base-content/60">총 저장 티켓</p>
				<p class="text-3xl font-bold">{data.summary.totalTickets}</p>
			</div>
		</div>
		<div class="card bg-base-100 shadow-sm">
			<div class="card-body">
				<p class="text-sm text-base-content/60">미발표 / 확인 필요</p>
				<p class="text-3xl font-bold">{data.summary.pendingResults}</p>
			</div>
		</div>
		<div class="card bg-base-100 shadow-sm">
			<div class="card-body">
				<p class="text-sm text-base-content/60">당첨 티켓 수</p>
				<p class="text-3xl font-bold text-success">
					{data.summary.winningTickets}
				</p>
			</div>
		</div>
		<div class="card bg-base-100 shadow-sm">
			<div class="card-body">
				<p class="text-sm text-base-content/60">최근 스캔 시각</p>
				<p class="text-lg font-semibold">
					{formatDateTime(data.summary.lastScannedAt)}
				</p>
			</div>
		</div>
	</section>

	<section class="card bg-base-100 shadow-sm">
		<div class="card-body space-y-4">
			<div class="flex items-center justify-between gap-3">
				<div>
					<h2 class="card-title">최근 스캔</h2>
					<p class="text-sm text-base-content/60">
						회원 데이터에 저장된 최근 티켓 10개를 보여줍니다.
					</p>
				</div>
				<a href={resolve("/qr-scan")} class="btn btn-primary btn-sm">
					QR 스캔하러 가기
				</a>
			</div>

			{#if data.recentScans.length === 0}
				<div class="rounded-2xl border border-dashed border-base-300 bg-base-200/40 px-6 py-10 text-center space-y-3">
					<p class="text-lg font-semibold">아직 저장된 회원 스캔 티켓이 없습니다</p>
					<p class="text-sm text-base-content/60">
						로그인 상태에서 QR을 스캔하면 여기에서 최근 티켓과 당첨 상태를 확인할 수 있습니다.
					</p>
					<div class="flex justify-center gap-2">
						<a href={resolve("/qr-scan")} class="btn btn-primary">
							첫 티켓 스캔하기
						</a>
						<a href={resolve("/history")} class="btn btn-outline">
							지난 회차 보기
						</a>
					</div>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="table table-zebra">
						<thead>
							<tr>
								<th>회차</th>
								<th>게임 수</th>
								<th>상태</th>
								<th>최근 스캔</th>
								<th>요약</th>
							</tr>
						</thead>
						<tbody>
							{#each data.recentScans as item (item.id)}
								<tr>
									<td>{item.round ?? "-"}</td>
									<td>{item.gamesCount ?? "-"}</td>
									<td>
										<span class={`badge ${getStatusBadgeClass(item)}`}>
											{getStatusLabel(item)}
										</span>
									</td>
									<td>{formatDateTime(item.updatedAt)}</td>
									<td class="min-w-72 whitespace-normal">{item.summary}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</section>
</div>
