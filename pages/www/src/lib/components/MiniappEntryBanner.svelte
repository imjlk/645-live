<script lang="ts">
import {
	MINIAPP_NAME,
	MINIAPP_SHARE_URL,
	observeMiniappEntry,
	recordMiniappEntry,
} from "$lib/utils/miniapp-entry";

let { placement }: { placement: "home" | "generator" } = $props();
function record(action: string) {
	recordMiniappEntry("miniapp_entry_clicked", placement, action);
}
</script>

<aside {@attach (element) => observeMiniappEntry(element, placement)} class="miniapp-banner" aria-label="645 번호 생성기 토스 미니앱 안내">
	<div class="miniapp-main">
		<img
			src="https://static.toss.im/appsintoss/17003/79197a95-3997-48e5-9206-aae1c17705ee.png"
			alt=""
			width="48"
			height="48"
			loading="lazy"
			referrerpolicy="no-referrer"
		/>
		<div class="miniapp-copy">
			<p class="miniapp-label">{MINIAPP_NAME} · 토스 미니앱</p>
			<h2>번호 만들기, 토스에서도 간편하게</h2>
			<p class="miniapp-description">번호 보관·추첨 통계·출석을 한곳에서 이용하세요.</p>
		</div>
	</div>
	<div class="miniapp-actions">
		<a
			href={MINIAPP_SHARE_URL}
			class="miniapp-launch"
			data-sveltekit-reload
			rel="external"
			onclick={() => record("launch")}
		>토스에서 열기 <span aria-hidden="true">↗</span></a>
		<details
			class="miniapp-help"
			ontoggle={(event) => {
				if (event.currentTarget.open) record("guide");
			}}
		>
			<summary>
				<span class="desktop-label">휴대폰으로 이용하기</span>
				<span class="mobile-label">연결이 안 되나요?</span>
			</summary>
			<p>휴대폰의 토스 앱에서 <strong>‘{MINIAPP_NAME}’</strong>를 검색하세요. 토스 앱이 없다면 설치 후 이용할 수 있어요.</p>
		</details>
	</div>
</aside>

<style>
.miniapp-banner { display: grid; grid-template-columns: minmax(0,1fr) auto; align-items: center; gap: 1rem 1.5rem; margin-block: 1.5rem; padding: 1.25rem; border-left: 3px solid var(--color-primary); border-radius: .25rem .75rem .75rem .25rem; background: var(--color-base-200); }
.miniapp-main { display: flex; align-items: center; gap: .875rem; min-width: 0; }
img { flex: 0 0 48px; border-radius: .75rem; }
.miniapp-copy { min-width: 0; }
.miniapp-label { font-size: .6875rem; color: var(--text-muted); margin-bottom: .35rem; }
h2 { font-size: 1.0625rem; line-height: 1.5; font-weight: 700; letter-spacing: -.035em; text-wrap: balance; }
.miniapp-description { margin-top: .375rem; color: var(--text-muted); font-size: .8125rem; line-height: 1.65; }
.miniapp-actions { display: flex; flex-direction: column; align-items: flex-end; gap: .5rem; max-width: 15rem; }
.miniapp-launch { display: inline-flex; align-items: center; justify-content: center; gap: .75rem; min-height: 44px; padding: .625rem 1rem; background: var(--color-primary); color: var(--color-primary-content); border-radius: .5rem; font-size: .8125rem; font-weight: 650; white-space: nowrap; transition: filter .15s ease; }
.miniapp-launch:hover { filter: brightness(.94); }
.miniapp-help { font-size: .75rem; line-height: 1.75; }
.miniapp-help summary { display: flex; align-items: center; min-height: 44px; cursor: pointer; color: var(--color-primary); font-weight: 600; list-style: none; }
.miniapp-help summary::-webkit-details-marker { display: none; }
.miniapp-help summary::after { content: "+"; margin-left: .5rem; }
.miniapp-help[open] summary::after { content: "−"; }
.miniapp-help p { color: var(--text-muted); }
.miniapp-help strong { color: var(--color-base-content); font-weight: 600; }
.desktop-label { display: none; }
@media (hover: hover) and (pointer: fine) {
 .desktop-label { display: inline; }
 .mobile-label { display: none; }
}
@media (max-width: 650px) {
 .miniapp-banner { grid-template-columns: 1fr; padding: 1rem; gap: .75rem; }
 .miniapp-actions { align-items: stretch; max-width: none; }
 .miniapp-launch { width: 100%; }
 .miniapp-help summary { justify-content: center; }
}
@media (prefers-reduced-motion: reduce) { .miniapp-launch { transition: none; } }
</style>
