<script lang="ts">
import type { MyScanListItem, MyScanSummary } from "@645/shared";
import { MetaTags } from "svelte-meta-tags";
import { goto } from "$app/navigation";
import { resolve } from "$app/paths";
import { useBrowserSession } from "$lib/auth/session.svelte";
import { createMemberRpcClient } from "$lib/auth/session-rpc";
import { authClient } from "$lib/auth-client";
import { absoluteUrl } from "$lib/seo/index.js";
import { LocalStorageProvider } from "$lib/utils/qr-scan-history-v2";

const auth = useBrowserSession();
const memberId = $derived(auth.session?.user.id ?? null);
let snapshot = $state<{
	userId: string;
	summary: MyScanSummary;
	recentScans: MyScanListItem[];
} | null>(null);
let loadError = $state("");
let reloadVersion = $state(0);
let deleteDialog: HTMLDialogElement;
let deletePassword = $state("");
let deleteError = $state("");
let deleteBusy = $state(false);
let needsReauthentication = $state(false);
let deleteConfirmed = $state(false);
let accountDeleted = $state(false);

$effect(() => {
	const userId = memberId;
	void reloadVersion;
	deleteDialog?.close();
	deletePassword = "";
	deleteConfirmed = false;
	snapshot = null;
	loadError = "";
	if (!userId) return;
	const controller = new AbortController();
	const rpcClient = createMemberRpcClient(userId);
	void Promise.all([
		rpcClient.myScans.summary(undefined, { signal: controller.signal }),
		rpcClient.myScans.list({ limit: 10 }, { signal: controller.signal }),
	])
		.then(([summary, recentScans]) => {
			if (!controller.signal.aborted && auth.session?.user.id === userId) {
				snapshot = { userId, summary, recentScans };
			}
		})
		.catch((error: unknown) => {
			if (controller.signal.aborted || auth.session?.user.id !== userId) return;
			const code =
				error && typeof error === "object" && "code" in error
					? error.code
					: null;
			const status =
				error && typeof error === "object" && "status" in error
					? error.status
					: null;
			if (code === "UNAUTHORIZED" || status === 401 || status === 409) {
				void auth.refresh();
			}
			loadError =
				"저장한 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
		});
	return () => controller.abort();
});

async function deleteAccount(event: SubmitEvent) {
	event.preventDefault();
	const userId = auth.session?.user.id;
	if (!userId || deleteBusy || !deleteConfirmed) return;
	deleteBusy = true;
	deleteError = "";
	needsReauthentication = false;
	try {
		const { data, error } = await authClient.deleteUser({
			password: deletePassword || undefined,
			fetchOptions: { headers: { "x-645-member-id": userId } },
		});
		if (error) {
			if (error.code === "SESSION_EXPIRED" || error.status === 401) {
				needsReauthentication = true;
				deleteError =
					"안전한 탈퇴를 위해 다시 로그인해 주세요. 이메일 가입자는 현재 비밀번호를 입력해 다시 시도할 수도 있습니다.";
			} else if (
				error.code === "INVALID_PASSWORD" ||
				error.code === "CREDENTIAL_ACCOUNT_NOT_FOUND"
			) {
				deleteError =
					"현재 비밀번호를 확인해 주세요. 소셜 계정은 다시 로그인한 뒤 비밀번호를 비워 두고 탈퇴할 수 있습니다.";
				needsReauthentication = true;
			} else {
				deleteError =
					"탈퇴를 완료하지 못했습니다. 잠시 후 다시 시도하거나 문의해 주세요.";
			}
			return;
		}
		if (!data?.success || data.message !== "User deleted") {
			deleteError = "탈퇴 확인이 필요합니다. 안내된 인증 절차를 완료해 주세요.";
			return;
		}
		if (auth.session?.user.id === userId) auth.accountDeleted();
		else void auth.refresh();
		await new LocalStorageProvider().clearAll(userId);
		accountDeleted = true;
		deleteDialog.close();
	} catch {
		deleteError =
			"연결에 문제가 생겼습니다. 탈퇴 상태를 확인하고 다시 시도해 주세요.";
	} finally {
		deleteBusy = false;
		deletePassword = "";
	}
}

async function reauthenticate() {
	if (await auth.signOut()) {
		deleteDialog.close();
		await goto(resolve("/login?next=%2Fmy"));
	}
}

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
	<p class="privacy-update">개인정보 처리방침이 2026년 9월 12일 개정되었습니다. <a class="link" href={resolve("/privacy")}>수집 항목과 보관·삭제 방법을 확인하세요.</a></p>
	{#if accountDeleted}<p class="alert alert-success" role="status">탈퇴가 완료되었습니다. 계정과 저장한 기록, 이 브라우저에 남은 해당 계정의 기록을 삭제했습니다.</p>{/if}
	<header class="page-header"><div><h1>내 스캔 기록</h1><p>{auth.session ? `${auth.session.user.name ?? "회원"}님의 저장한 티켓과 당첨 확인 상태입니다.` : "계정에 저장한 티켓과 당첨 확인 상태를 모아 볼 수 있습니다."}</p></div><a href={resolve("/qr-scan")} class="btn btn-primary">새 용지 QR 확인</a></header>

 {#if auth.status === "loading"}
  <p class="account-state" role="status">{auth.signingOut ? "로그아웃 중입니다…" : "로그인 상태를 확인하고 있습니다…"}</p>
 {:else if auth.status === "error"}
  <div class="account-state"><p role="alert">{auth.error}</p><button class="btn btn-outline" type="button" onclick={() => void auth.refresh()}>다시 확인</button></div>
 {:else if !auth.session}
  <div class="empty-state"><h2>로그인하고 스캔 기록을 이어서 확인하세요</h2><p>이 기기에만 저장한 기록은 QR 확인 화면에서 볼 수 있습니다. 계정에 저장하면 다른 기기에서도 확인할 수 있습니다.</p><div class="empty-actions"><a href={resolve("/login?next=%2Fmy")} class="btn btn-primary">로그인 · 회원가입</a><a href={resolve("/qr-scan")} class="btn btn-ghost">이 기기의 기록 보기</a></div></div>
 {:else if loadError}
  <div class="account-state"><p role="alert">{loadError}</p><button class="btn btn-outline" type="button" onclick={() => reloadVersion++}>기록 다시 불러오기</button></div>
 {:else if snapshot && snapshot.userId === auth.session.user.id}
	<dl class="account-summary">
		<div><dt>저장한 티켓</dt><dd>{snapshot.summary.totalTickets.toLocaleString()}<span>장</span></dd></div>
		<div><dt>미발표·확인 필요</dt><dd>{snapshot.summary.pendingResults.toLocaleString()}<span>장</span></dd></div>
		<div><dt>당첨 티켓</dt><dd class="text-success-content">{snapshot.summary.winningTickets.toLocaleString()}<span>장</span></dd></div>
		<div><dt>최근 스캔</dt><dd class="last-scan">{formatDateTime(snapshot.summary.lastScannedAt)}</dd></div>
	</dl>
	<section aria-labelledby="recent-scans-heading">
		<div class="section-heading"><div><h2 id="recent-scans-heading">최근 스캔</h2><p>계정에 저장된 최근 티켓 10개를 보여드려요.</p></div></div>
		{#if snapshot.recentScans.length === 0}
			<div class="empty-state"><h3>아직 저장한 티켓이 없어요</h3><p>로그인 상태에서 용지 QR을 확인하면 스캔한 티켓과 당첨 상태를 여기에서 다시 볼 수 있습니다.</p><div class="empty-actions"><a href={resolve("/qr-scan")} class="btn btn-primary">첫 티켓 스캔하기</a><a href={resolve("/history")} class="btn btn-ghost">지난 당첨 결과</a></div></div>
		{:else}
			<ol class="ticket-list">{#each snapshot.recentScans as item (item.id)}<li>
				<div class="ticket-heading"><div>{#if item.round && item.resultStatus !== "unreleased" && item.resultStatus !== "unknown"}<a href={resolve(`/history?round=${item.round}`)} class="round-link">제{item.round}회</a>{:else}<strong>{item.round ? `제${item.round}회` : "회차 확인 필요"}</strong>{/if}<span class="game-count">{item.gamesCount ?? "-"}게임</span></div><span class={`badge ${getStatusBadgeClass(item)}`}>{getStatusLabel(item)}</span></div>
				<p class="ticket-summary">{item.summary}</p><p class="ticket-date">최근 스캔 · {formatDateTime(item.updatedAt)}</p>
			</li>{/each}</ol>
		{/if}
	</section>
 {:else}
  <p class="account-state" role="status">저장한 기록을 불러오고 있습니다…</p>
 {/if}
 {#if auth.session}
  <section class="account-settings" aria-labelledby="account-settings-heading">
   <h2 id="account-settings-heading">계정 관리</h2>
   <p>탈퇴하면 회원 정보와 계정에 저장한 스캔 기록을 삭제합니다.</p>
   <button type="button" class="btn btn-ghost" onclick={() => { deleteError = ""; needsReauthentication = false; deleteConfirmed = false; deleteDialog.showModal(); }}>회원 탈퇴</button>
  </section>
 {/if}
 <noscript><p class="account-state">로그인과 내 기록 확인은 JavaScript가 켜진 브라우저에서 사용할 수 있습니다.</p></noscript>
</div>

<dialog bind:this={deleteDialog} class="modal" aria-labelledby="delete-account-heading" oncancel={(event) => { if (deleteBusy) event.preventDefault(); }}>
 <div class="modal-box">
  <h2 id="delete-account-heading" class="text-xl font-bold">회원 탈퇴</h2>
  <p class="mt-3 text-sm leading-7">회원 정보와 계정에 저장한 스캔 기록이 삭제되며 복구할 수 없습니다. 이 브라우저에 남은 해당 계정의 기록도 함께 지웁니다. 다른 기기의 로컬 기록은 해당 기기에서 삭제해 주세요.</p>
  <form onsubmit={deleteAccount} class="delete-form">
   <label for="delete-password">현재 비밀번호 (이메일 가입자)</label>
   <input id="delete-password" type="password" class="input input-bordered w-full" bind:value={deletePassword} autocomplete="current-password" disabled={deleteBusy} />
   <p class="text-xs leading-6 text-base-content/70">최근에 로그인했다면 비밀번호 없이 진행할 수 있습니다. 소셜 가입자는 비밀번호를 비워 두세요.</p>
   <label class="delete-confirmation"><input class="checkbox checkbox-sm" type="checkbox" bind:checked={deleteConfirmed} required disabled={deleteBusy} /><span>삭제되는 내용을 확인했으며 탈퇴하겠습니다.</span></label>
   {#if deleteError}<p class="alert alert-error text-sm" role="alert">{deleteError}</p>{/if}
   {#if needsReauthentication}<button type="button" class="btn btn-outline" onclick={() => void reauthenticate()}>다시 로그인하기</button>{/if}
   <div class="modal-action"><button type="button" class="btn" disabled={deleteBusy} onclick={() => deleteDialog.close()}>취소</button><button type="submit" class="btn btn-error" disabled={deleteBusy || !deleteConfirmed}>{deleteBusy ? "삭제 중…" : "탈퇴하고 기록 삭제"}</button></div>
  </form>
 </div>
</dialog>

<style>
.page-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
.account-state { padding-block: 2rem; line-height: 1.8; }
.account-state .btn { margin-top: 1rem; }
.account-settings { border-top: 1px solid var(--color-base-300); padding-top: 1.5rem; margin-top: 2rem; }
.privacy-update { margin-bottom: 1.5rem; font-size: .8rem; line-height: 1.8; color: var(--text-muted); }
.account-settings h2 { font-size: 1rem; font-weight: 700; }
.account-settings p { margin-block: .5rem; color: var(--text-muted); font-size: .85rem; line-height: 1.8; }
.delete-form { display: grid; gap: .75rem; margin-top: 1.5rem; font-size: .85rem; }
.delete-confirmation { display: flex; align-items: center; gap: .75rem; min-height: 44px; line-height: 1.7; }
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
