<script lang="ts">
import {
	compareDraw,
	type Draw,
	type Generation,
	parseNumbers,
	resultFingerprint,
} from "@645/lotto-core";
import { onMount, untrack } from "svelte";
import { resolve } from "$app/paths";
import SimpleBall from "$lib/components/SimpleBall.svelte";
import { GenerationApiError, readJson } from "$lib/generator/api";
import { useGenerator } from "$lib/generator/model.svelte";
import { absoluteUrl } from "$lib/seo";
import MetaTags from "$lib/seo/PageMeta.svelte";
import { getTrailbaseBrowserBaseUrl } from "$lib/trailbase/browser-base";

const generator = useGenerator();
let limit = $state(50);
const visible = $derived(generator.saved.slice(0, limit));
let results = $state<Record<number, Draw | null>>({});
let resultError = $state("");
let celebration = $state("");
let mounted = false;
const pending = new Set<number>();
let timer: ReturnType<typeof setTimeout>;
function celebrate(items: Generation[]) {
	try {
		const key = "645:generator:celebrated:v1";
		const seen = JSON.parse(localStorage.getItem(key) || "[]") as unknown;
		if (!Array.isArray(seen) || seen.some((v) => typeof v !== "string")) return;
		const marks = new Set<string>(seen);
		let first = "";
		for (const g of items) {
			const draw = results[g.round];
			if (!draw) continue;
			const result = compareDraw(g.numbers, draw);
			const id = `${g.id}:${resultFingerprint(draw)}`;
			if (result.rank && !marks.has(id)) {
				marks.add(id);
				first ||= `${g.round}회 보관한 조합이 ${result.rank}등 번호와 일치해요!`;
			}
		}
		if (first) {
			localStorage.setItem(key, JSON.stringify([...marks].slice(-5000)));
			celebration = first;
			clearTimeout(timer);
			timer = setTimeout(() => {
				celebration = "";
			}, 6500);
		}
	} catch {
		/* Result checking remains usable when optional celebration storage is full. */
	}
}
async function loadResults(items: Generation[], force = false) {
	if (!mounted) return;
	resultError = "";
	const rounds = [...new Set(items.map((g) => g.round))];
	for (let offset = 0; offset < rounds.length; offset += 4) {
		await Promise.all(
			rounds.slice(offset, offset + 4).map(async (round) => {
				if (pending.has(round) || (!force && results[round] !== undefined))
					return;
				pending.add(round);
				try {
					const r = await readJson<Record<string, unknown>>(
						`${getTrailbaseBrowserBaseUrl()}/api/records/v1/lotto_draw_results/${round}`,
					);
					const numbers = parseNumbers(
						Array.from({ length: 6 }, (_, i) =>
							Number(r[`draw_number_${i + 1}`]),
						),
					);
					const bonus = Number(r.bonus_number);
					if (mounted)
						results[round] =
							numbers &&
							Number.isInteger(bonus) &&
							bonus >= 1 &&
							bonus <= 45 &&
							!numbers.includes(bonus) &&
							typeof r.draw_date === "string"
								? { round, numbers, bonus, drawDate: r.draw_date }
								: null;
				} catch (e) {
					if (!mounted) return;
					if (e instanceof GenerationApiError && e.status === 404)
						results[round] = null;
					else
						resultError =
							"일부 추첨 결과를 불러오지 못했어요. 다시 확인해 주세요.";
				} finally {
					pending.delete(round);
				}
			}),
		);
		if (!mounted) return;
	}
	celebrate(items);
}
onMount(() => {
	mounted = true;
	void loadResults(visible);
	const refresh = () => {
		if (document.visibilityState === "visible") void loadResults(visible, true);
	};
	document.addEventListener("visibilitychange", refresh);
	return () => {
		mounted = false;
		clearTimeout(timer);
		document.removeEventListener("visibilitychange", refresh);
	};
});
$effect(() => {
	const items = visible;
	untrack(() => {
		void loadResults(items);
	});
});
function backup() {
	const url = URL.createObjectURL(
		new Blob([JSON.stringify(generator.saved, null, 2)], {
			type: "application/json",
		}),
	);
	const link = document.createElement("a");
	link.href = url;
	link.download = `645-live-보관함-${new Date().toISOString().slice(0, 10)}.json`;
	link.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function deleteShared() {
	if (
		confirm(
			"이 브라우저에서 서버에 공유한 모든 조합과 연결 정보를 삭제할까요? 기기에 보관한 번호는 유지됩니다.",
		)
	)
		await generator.withdraw();
}
</script>
<MetaTags title="로또 번호 보관함" titleTemplate="%s | 645.live" description="645.live 번호 생성기에서 마음에 드는 조합을 이 기기에 보관하고 추첨 결과를 확인하세요. 회차별 번호 일치 여부를 살펴보고 보관한 조합을 파일로 백업할 수 있습니다. 보관함은 회원가입 없이 이용하며 브라우저의 저장 공간에 보관됩니다." canonical={absoluteUrl("/generator/saved")} robots="noindex,follow" />
<div class="content-page saved-page">
	<header class="page-header"><h1>내 번호 보관함</h1><p>마음에 든 조합을 모아두고, 추첨 후 결과를 확인하세요.</p></header>
	<div class="saved-toolbar"><strong>{generator.saved.length.toLocaleString()}게임</strong><div><button class="btn btn-ghost btn-sm" disabled={!generator.saved.length} onclick={() => loadResults(visible, true)}>결과 다시 확인</button><button class="btn btn-ghost btn-sm" disabled={!generator.saved.length} onclick={backup}>파일로 백업</button></div></div>
	<p class="storage-note">이 브라우저에만 보관돼요. 사이트 데이터를 지우기 전에 백업해 주세요. 번호 보관은 실제 복권 구매가 아닙니다.</p>
	{#if generator.error || resultError}<p role="alert" class="alert alert-error">{generator.error || resultError}</p>{/if}
	{#if celebration}<div class="celebration" role="status"><strong>{celebration}</strong><p>실제 구매한 복권이 있다면 용지의 번호도 확인해 주세요.</p><div class="confetti" aria-hidden="true">{#each Array.from({length:24}, (_, i) => i) as i (i)}<i style:--x={`${(i * 41) % 100}%`} style:--delay={`${i % 5 * .1}s`} style:--angle={`${i * 39}deg`} style:background={`var(--lotto-${["yellow","blue","red","grey","green"][i % 5]})`}></i>{/each}</div></div>{/if}
	{#if visible.length}<ol class="saved-list">
		{#each visible as g (g.id)}{@const draw = results[g.round]}{@const result = draw ? compareDraw(g.numbers, draw) : null}
			<li><div class="saved-top"><a href={resolve(`/history?round=${g.round}`)}>{g.round}회</a><button class="btn btn-ghost btn-sm" aria-label={`${g.numbers.join(", ")} 보관함에서 삭제`} onclick={() => generator.toggleSave(g)}>삭제</button></div><div class="saved-numbers">{#each g.numbers as number (number)}<SimpleBall {number} isWinning={result?.matches.includes(number)} isBonus={Boolean(draw && number === draw.bonus && result?.matches.length === 5)} />{/each}</div><p class:matched={Boolean(result?.rank)}>{result ? result.rank ? `${result.rank}등 번호 일치 · ${result.matches.length}개 일치${result.rank === 2 ? " + 보너스" : ""}` : `${result.matches.length}개 일치` : draw === null ? "추첨 결과 등록을 기다리고 있어요." : "결과 확인 중…"}</p></li>
		{/each}</ol>
		{#if generator.saved.length > limit}<div class="more"><button class="btn btn-ghost" onclick={() => { limit += 50; }}>보관한 번호 더 보기</button></div>{/if}
	{:else}<div class="saved-empty"><p>{generator.ready ? "아직 보관한 번호가 없어요." : "기기의 보관함을 확인하고 있어요."}</p><a class="btn btn-primary" href={resolve("/generator")}>번호 만들러 가기</a></div>{/if}
	<p class="source-note">당첨 번호·조합 정보 출처: 645.live · 당첨금은 실제 구매한 유효한 복권에 한해 지급됩니다.</p>
	<details class="manage"><summary>공유 기록과 기기 보관함 관리</summary><p>보관함에서 삭제해도 공개 생성 기록은 유지됩니다. 아래에서 이 브라우저가 서버에 공유한 모든 기록을 삭제할 수 있습니다.</p><button class="btn btn-outline btn-sm" disabled={!generator.ready || generator.busy} onclick={deleteShared}>{generator.busy ? "처리 중…" : "공유 기록 모두 삭제"}</button><a href={resolve("/privacy#web-generator")}>개인정보 처리 안내</a></details>
	<p role="status" class="source-note">{generator.notice}</p>
</div>
<style>
.saved-toolbar,.saved-top{display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap;}.saved-toolbar strong{font-size:1.2rem;font-variant-numeric:tabular-nums;}.saved-toolbar>div{display:flex;gap:.25rem;}.storage-note,.source-note{font-size:.8rem;line-height:1.7;color:var(--text-muted);margin-block:1rem;}.saved-list{display:grid;grid-template-columns:minmax(0,1fr);gap:0 3rem;list-style:none;padding:0;}.saved-list li{padding:1rem 0 1.5rem;border-bottom:1px solid var(--color-base-300);min-width:0;}.saved-top>a{font-size:.85rem;font-weight:650;color:var(--color-primary);padding:.75rem 0;}.saved-numbers{display:flex;gap:clamp(.35rem,1.5vw,.75rem);padding:.5rem 0;}.saved-list li>p{font-size:.85rem;margin-top:.75rem;color:var(--text-muted);}.saved-list li>p.matched{color:var(--color-primary);font-weight:650;}.saved-empty{text-align:center;padding:4rem 0;}.saved-empty p{margin-bottom:1.5rem;color:var(--text-muted);}.more{text-align:center;margin-block:1.5rem;}.manage{margin-top:2rem;padding-top:1rem;border-top:1px solid var(--color-base-300);}.manage summary{min-height:44px;cursor:pointer;font-size:.9rem;font-weight:600;}.manage p{max-width:var(--reading-width);font-size:.85rem;line-height:1.7;color:var(--text-muted);margin-block:1rem;}.manage>a{display:inline-block;color:var(--color-primary);font-size:.8rem;padding:1rem;}.celebration{position:relative;overflow:hidden;padding:1.5rem 0;margin-block:1rem;color:var(--color-primary);}.celebration p{font-size:.85rem;margin-top:.5rem;}.confetti{position:absolute;inset:0;pointer-events:none;}.confetti i{position:absolute;left:var(--x);top:-1rem;width:.4rem;height:.7rem;animation:confetti 2s var(--delay) ease-in both;}@keyframes confetti{to{transform:translateY(160px) rotate(var(--angle));opacity:0;}}@media(min-width:900px){.saved-list{grid-template-columns:repeat(2,minmax(0,1fr));}}@media(max-width:390px){.saved-numbers :global(.simple-ball){width:2.5rem;height:2.5rem;}}@media(prefers-reduced-motion:reduce){.confetti{display:none;}}
</style>
