<script lang="ts">
import { onMount } from "svelte";
import { afterNavigate } from "$app/navigation";
import { resolve } from "$app/paths";
import { useBrowserSession } from "$lib/auth/session.svelte";
import NavigationMenu from "./NavigationMenu.svelte";
import ThemeSelect from "./ThemeSelect.svelte";

const auth = useBrowserSession();
let menuOpen = $state(false);
let ready = $state(false);
onMount(() => {
	ready = true;
});
afterNavigate(() => {
	menuOpen = false;
});
</script>
<header class="site-header">
 <div class="header-inner">
  <a class="wordmark" href={resolve("/")} aria-label="645.live 홈">645<span>.live</span></a>
  <div class="desktop-menu"><NavigationMenu /></div>
  <div class="header-actions">
   <ThemeSelect />
   <a class="account-link" href={resolve(auth.status === "anonymous" ? "/login" : "/my")}>{auth.session ? "내 기록" : auth.status === "anonymous" ? "로그인" : "내 계정"}</a>
   {#if auth.session}<button class="account-link desktop-sign-out" type="button" disabled={auth.signingOut} onclick={() => void auth.signOut()}>로그아웃</button>{/if}
   <button type="button" class="menu-toggle" disabled={!ready} aria-expanded={menuOpen} aria-controls="mobile-menu" aria-label={menuOpen ? "메뉴 닫기" : "전체 메뉴 열기"} onclick={() => { menuOpen = !menuOpen; }}>
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d={menuOpen ? "M6 6l12 12M6 18L18 6" : "M4 6h16M4 12h16M4 18h16"} /></svg>
   </button>
  </div>
 </div>
 <div id="mobile-menu" class="mobile-menu" hidden={!menuOpen}>
  <NavigationMenu compact />
  {#if auth.session}<button class="btn btn-ghost" type="button" disabled={auth.signingOut} onclick={() => void auth.signOut()}>로그아웃</button>{/if}
 </div>
 {#if auth.error && auth.status === "authenticated"}<p class="auth-error" role="alert">{auth.error}</p>{/if}
</header>
<style>
 .site-header { border-bottom: 1px solid var(--color-base-300); background: var(--color-base-100); }
 .header-inner { min-height: 80px; max-width: var(--page-max-width); margin-inline: auto; padding-inline: var(--page-gutter); display: flex; align-items: center; gap: 1.5rem; }
 .wordmark { font-size: 1.8rem; font-weight: 850; letter-spacing: -0.09em; white-space: nowrap; }
 .wordmark span { color: var(--color-primary); }
 .desktop-menu { flex: 1; }
 .header-actions { margin-left: auto; display: flex; align-items: center; gap: 0.75rem; }
 .account-link { font-size: 0.875rem; font-weight: 600; white-space: nowrap; display: inline-flex; align-items: center; min-height: 44px; padding-block: 0.7rem; color: var(--color-primary); }
 .menu-toggle { display: none; align-items: center; justify-content: center; background: transparent; border: 0; padding: 0.5rem; min-height: 44px; min-width: 44px; }
 .mobile-menu { max-width: var(--page-max-width); margin-inline: auto; padding: 0.5rem var(--page-gutter) 1rem; border-top: 1px solid var(--color-base-300); }
 .auth-error { max-width: var(--page-max-width); margin-inline: auto; padding: .5rem var(--page-gutter); font-size: .8rem; color: var(--color-error-content); background: var(--color-error); }
 @media (max-width: 1100px) { .desktop-menu, .desktop-sign-out { display: none; } .menu-toggle { display: flex; } }
 @media (max-width: 767px) { .header-inner { min-height: 68px; gap: 0.5rem; } .wordmark { font-size: 1.65rem; } .header-actions { gap: 0.5rem; } }
</style>
