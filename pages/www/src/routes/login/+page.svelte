<script lang="ts">
import { onMount } from "svelte";
import { MetaTags } from "svelte-meta-tags";
import { browser } from "$app/environment";
import { goto } from "$app/navigation";
import { resolve } from "$app/paths";
import { page } from "$app/state";
import {
	normalizeAuthNextPath,
	useBrowserSession,
} from "$lib/auth/session.svelte";
import { authClient } from "$lib/auth-client";
import { absoluteUrl } from "$lib/seo/index.js";

type SocialProviderId = "google" | "kakao" | "naver";
const auth = useBrowserSession();
const providerLabels = { google: "Google", kakao: "카카오", naver: "네이버" };
const socialButtonClass = {
	google: "btn-outline",
	kakao: "btn-warning",
	naver: "btn-success",
};
let ready = $state(false);
let mode = $state<"signIn" | "signUp">("signIn");
const nextPath = $derived(
	browser ? normalizeAuthNextPath(page.url.searchParams.get("next")) : "/my",
);
let name = $state("");
let email = $state("");
let password = $state("");
let ageConfirmed = $state(false);
let formError = $state("");
let busy = $state(false);
let providers = $state<SocialProviderId[]>([]);
let providersError = $state(false);
let redirecting = false;

async function loadProviders(signal?: AbortSignal) {
	providersError = false;
	try {
		const response = await fetch("/api/auth/providers.json", { signal });
		if (!response.ok) throw new Error("providers unavailable");
		const data = (await response.json()) as {
			socialProviders?: Array<{ id: string }>;
		};
		if (signal?.aborted) return;
		providers = (data.socialProviders ?? [])
			.map(({ id }) => id)
			.filter((id): id is SocialProviderId =>
				Object.hasOwn(providerLabels, id),
			);
	} catch {
		if (!signal?.aborted) providersError = true;
	}
}

onMount(() => {
	ready = true;
	const controller = new AbortController();
	void loadProviders(controller.signal);
	if (page.url.searchParams.has("error")) {
		formError =
			"소셜 로그인을 완료하지 못했습니다. 처음 방문했다면 회원가입 탭에서 시작해 주세요. 기존 회원은 다시 시도하거나 이메일로 로그인해 주세요.";
	}
	return () => controller.abort();
});

$effect(() => {
	if (auth.session && !busy && !redirecting) {
		redirecting = true;
		void goto(new URL(nextPath, window.location.origin), {
			replaceState: true,
		}).catch(() => {
			redirecting = false;
			formError = "로그인되었습니다. 내 기록에서 계속해 주세요.";
		});
	}
});

function changeMode(nextMode: "signIn" | "signUp") {
	mode = nextMode;
	password = "";
	formError = "";
}

async function submitEmail(event: SubmitEvent) {
	event.preventDefault();
	if (busy) return;
	if (mode === "signUp" && !ageConfirmed) {
		formError =
			"회원가입은 만 14세 이상만 가능합니다. 연령 확인에 체크해 주세요.";
		return;
	}
	busy = true;
	formError = "";
	try {
		const credentials = {
			email: email.trim(),
			password,
			callbackURL: nextPath,
		};
		const result =
			mode === "signUp"
				? await authClient.signUp.email({
						...credentials,
						name: name.trim(),
						fetchOptions: { headers: { "x-645-age-confirmed": "true" } },
					})
				: await authClient.signIn.email({ ...credentials, rememberMe: true });
		if (result.error) {
			formError =
				mode === "signUp"
					? "회원가입하지 못했습니다. 입력한 정보를 확인해 주세요. 이미 가입했다면 로그인해 주세요."
					: "로그인하지 못했습니다. 이메일과 비밀번호를 확인해 주세요.";
			return;
		}
		password = "";
		const session = await auth.signedIn();
		if (!session)
			formError =
				"로그인 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.";
	} catch {
		formError = "연결에 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.";
	} finally {
		busy = false;
	}
}

async function signInSocial(provider: SocialProviderId) {
	if (busy) return;
	if (mode === "signUp" && !ageConfirmed) {
		formError =
			"회원가입은 만 14세 이상만 가능합니다. 연령 확인에 체크해 주세요.";
		return;
	}
	busy = true;
	formError = "";
	try {
		const callbackURL = new URL(nextPath, window.location.origin).toString();
		const { data, error } = await authClient.signIn.social({
			provider,
			callbackURL,
			newUserCallbackURL: callbackURL,
			errorCallbackURL: new URL(
				`/login?next=${encodeURIComponent(nextPath)}`,
				window.location.origin,
			).toString(),
			disableRedirect: true,
			requestSignUp: mode === "signUp",
			fetchOptions:
				mode === "signUp"
					? { headers: { "x-645-age-confirmed": "true" } }
					: undefined,
		});
		if (error || !data?.url) throw new Error("social sign-in failed");
		window.location.assign(data.url);
	} catch {
		formError = `${providerLabels[provider]} 로그인을 시작하지 못했습니다. 다시 시도해 주세요.`;
		busy = false;
	}
}
</script>

<MetaTags
 title="로그인"
 titleTemplate="%s | 645.live"
 description="645.live에 로그인하고 계정에 저장한 로또 QR 스캔 기록과 당첨 확인 상태를 여러 기기에서 이어서 확인하세요. 이메일 또는 지원하는 소셜 계정으로 시작할 수 있습니다."
 canonical={absoluteUrl("/login")}
 robots="noindex,nofollow"
/>

<div class="content-page">
 <div class="login-panel">
  <header class="page-header">
   <h1>{mode === "signIn" ? "로그인" : "회원가입"}</h1>
   <p>스캔 기록을 저장하고, 다른 기기에서도 이어서 확인하세요.</p>
  </header>
  <div class="auth-tabs" aria-label="계정 시작 방법">
   <button type="button" class:active={mode === "signIn"} disabled={!ready || busy} aria-pressed={mode === "signIn"} onclick={() => changeMode("signIn")}>로그인</button>
   <button type="button" class:active={mode === "signUp"} disabled={!ready || busy} aria-pressed={mode === "signUp"} onclick={() => changeMode("signUp")}>회원가입</button>
  </div>
  {#if formError}<p class="alert alert-error mb-4 text-sm" role="alert">{formError}</p>{/if}
  {#if mode === "signUp"}
   <div class="signup-notice">
    <p>회원가입과 로그인, 스캔 기록 저장·동기화를 위해 닉네임, 이메일, 비밀번호를 처리합니다. 비밀번호는 복원할 수 없는 형태로 저장하며, 회원 정보와 계정에 저장한 스캔 기록은 탈퇴 시 삭제합니다.</p>
    <p>소셜 가입 시에는 선택한 제공자가 전달하는 계정 식별자, 이름(닉네임), 이메일, 프로필 이미지와 로그인 토큰을 처리합니다. 제공 항목은 해당 제공자의 동의 화면에서 확인할 수 있습니다. <a class="link" href={resolve("/privacy")}>개인정보 처리방침</a></p>
    <label class="age-confirmation"><input type="checkbox" class="checkbox checkbox-sm" bind:checked={ageConfirmed} disabled={!ready || busy} /><span>만 14세 이상입니다. (필수)</span></label>
   </div>
  {/if}
  {#if providers.length > 0}
   <div class="social-options">
    {#each providers as provider (provider)}
     <button type="button" class={`btn w-full ${socialButtonClass[provider]}`} disabled={!ready || busy} onclick={() => void signInSocial(provider)}>{providerLabels[provider]}로 계속하기</button>
    {/each}
   </div>
   <div class="divider my-5 text-xs text-base-content/60">또는 이메일</div>
  {:else if providersError}
   <p class="provider-error">소셜 로그인 목록을 불러오지 못했습니다. <button type="button" class="link" onclick={() => void loadProviders()}>다시 불러오기</button></p>
  {/if}
  <form onsubmit={submitEmail} class="auth-form">
   {#if mode === "signUp"}
    <label for="auth-name">닉네임</label>
    <input id="auth-name" type="text" name="name" bind:value={name} class="input input-bordered w-full" autocomplete="nickname" maxlength="80" required disabled={!ready || busy} />
   {/if}
   <label for="auth-email">이메일</label>
   <input id="auth-email" type="email" name="email" bind:value={email} class="input input-bordered w-full" autocomplete="email" required disabled={!ready || busy} />
   <label for="auth-password">비밀번호</label>
   <input id="auth-password" type="password" name="password" bind:value={password} class="input input-bordered w-full" minlength="8" maxlength="128" autocomplete={mode === "signUp" ? "new-password" : "current-password"} required disabled={!ready || busy} />
   {#if mode === "signUp"}<p class="field-note">비밀번호는 8자 이상으로 입력해 주세요. 닉네임은 실명이 아니어도 됩니다.</p>{/if}
   <button type="submit" class="btn btn-primary w-full" disabled={!ready || busy}>{busy ? "처리 중…" : mode === "signIn" ? "로그인" : "회원가입"}</button>
  </form>
  <p class="policy-note">계정 정보와 스캔 기록의 처리 방법은 <a class="link" href={resolve("/privacy")}>개인정보 처리방침</a>에서 확인할 수 있습니다. <a class="link" href={resolve("/terms-of-service")}>이용약관</a></p>
  {#if auth.session}<a class="btn btn-outline w-full" href={resolve("/my")}>내 기록으로 이동</a>{/if}
  <noscript><p class="provider-error">로그인과 회원가입은 JavaScript가 켜진 브라우저에서 사용할 수 있습니다.</p></noscript>
 </div>
</div>

<style>
 .login-panel { width: 100%; max-width: 420px; margin-inline: auto; padding-block: 1rem 2rem; }
 .page-header { text-align: center; margin-bottom: 1.75rem; }
 .page-header p { margin-top: .75rem; line-height: 1.7; }
 .auth-tabs { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid var(--color-base-300); margin-bottom: 1.5rem; }
 .auth-tabs button { padding: .8rem .5rem; border-bottom: 2px solid transparent; color: var(--text-muted); font-size: .9rem; }
 .auth-tabs button.active { border-color: var(--color-primary); color: var(--color-primary); font-weight: 700; }
 .social-options { display: grid; gap: .6rem; }
 .signup-notice { display: grid; gap: .7rem; margin-bottom: 1.5rem; padding: 1rem; background: var(--color-base-200); font-size: .78rem; line-height: 1.8; }
 .age-confirmation { display: flex; align-items: center; gap: .75rem; font-size: .85rem; font-weight: 650; min-height: 44px; }
 .auth-form { display: grid; gap: .6rem; }
 .auth-form label { font-size: .85rem; font-weight: 650; margin-top: .5rem; }
 .auth-form button[type="submit"] { margin-top: .8rem; }
 .field-note, .policy-note, .provider-error { font-size: .78rem; color: var(--text-muted); line-height: 1.8; }
 .policy-note { margin-top: 1.5rem; }
 .provider-error { margin-bottom: 1rem; }
 .policy-note .link { text-underline-offset: 3px; }
</style>
