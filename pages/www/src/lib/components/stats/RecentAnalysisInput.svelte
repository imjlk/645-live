<script lang="ts">
import { goto } from "$app/navigation";
import { resolve } from "$app/paths";

type Props = {
	maxRounds: number;
	basePath:
		| "/stats/ac"
		| "/stats/colors"
		| "/stats/high-low"
		| "/stats/odd-even"
		| "/stats/repeat"
		| "/stats/sections"
		| "/stats/unit-digit";
	selectedRounds?: number | null;
	placeholder?: string;
	buttonText?: string;
	returnHref?: Props["basePath"];
	returnLabel?: string;
	presets?: number[];
};
let {
	maxRounds,
	basePath,
	selectedRounds = null,
	placeholder = "100",
	buttonText = "적용",
	returnHref,
	returnLabel = "전체",
	presets = [10, 20, 50, 100],
}: Props = $props();
const inputId = $props.id();
let inputValue = $state("");
let errorMessage = $state("");
const selected = $derived(
	selectedRounds && selectedRounds > 0 ? selectedRounds : null,
);
const availablePresets = $derived(
	presets.filter(
		(round) => Number.isInteger(round) && round > 0 && round <= maxRounds,
	),
);

$effect(() => {
	inputValue = selected ? String(selected) : "";
	errorMessage = "";
});

async function navigateToAnalysis(event: SubmitEvent) {
	event.preventDefault();
	const value = inputValue.trim();
	const rounds = Number(value);
	if (
		!/^\d+$/.test(value) ||
		!Number.isInteger(rounds) ||
		rounds < 1 ||
		rounds > maxRounds
	) {
		errorMessage = `1부터 ${maxRounds}까지의 회차 수를 입력해주세요.`;
		return;
	}
	errorMessage = "";
	try {
		await goto(resolve(`${basePath}/recent/${rounds}`));
	} catch {
		errorMessage = "통계를 열지 못했어요. 다시 시도해주세요.";
	}
}
</script>

<section class="range-control" aria-label="분석 기간 선택">
	<div class="range-heading">
		<h2>분석 기간</h2>
		<span>{selected ? `최근 ${selected}회` : `전체 ${maxRounds}회`} 기준</span>
	</div>
	{#if maxRounds > 0}
		<div class="range-options">
			<a href={resolve((returnHref ?? basePath))} class:active={!selected} aria-current={!selected ? "page" : undefined}>{returnLabel}</a>
			{#each availablePresets as preset (preset)}
				<a href={resolve(`${basePath}/recent/${preset}`)} class:active={selected === preset} aria-current={selected === preset ? "page" : undefined}>최근 {preset}회</a>
			{/each}
			<details>
				<summary>직접 입력</summary>
				<form onsubmit={navigateToAnalysis}>
					<label for={inputId}>최근 회차 수</label>
					<div class="custom-field">
						<input id={inputId} type="text" inputmode="numeric" pattern="[0-9]*" bind:value={inputValue} {placeholder} aria-invalid={!!errorMessage} aria-describedby={errorMessage ? `${inputId}-error` : undefined} />
						<button type="submit">{buttonText}</button>
					</div>
					{#if errorMessage}<p id={`${inputId}-error`} class="error" role="alert">{errorMessage}</p>{/if}
				</form>
			</details>
		</div>
	{:else}
		<p class="empty">아직 분석할 추첨 결과가 없습니다.</p>
	{/if}
</section>

<style>
	.range-control { padding-block: 0.25rem; }
	.range-heading { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.5rem 0.75rem; margin-bottom: 0.6rem; }
	h2 { font-size: 0.875rem; font-weight: 700; }
	.range-heading span, .empty { font-size: 0.8125rem; color: color-mix(in oklab, var(--color-base-content) 70%, transparent); }
	.range-options { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: flex-start; }
	a, summary, button { display: inline-flex; align-items: center; justify-content: center; min-height: 2.75rem; padding: 0.6rem 0.8rem; border: 1px solid var(--color-base-300); border-radius: 0.5rem; background: var(--color-base-100); color: var(--color-base-content); font-size: 0.8125rem; font-weight: 600; cursor: pointer; text-decoration: none; transition: background 140ms ease, border-color 140ms ease; }
	a:hover, summary:hover { background: var(--color-base-200); border-color: var(--color-primary); }
	a.active, button { background: var(--color-primary); border-color: var(--color-primary); color: var(--color-primary-content); }
	details { position: relative; }
	summary { list-style: none; }
	summary::-webkit-details-marker { display: none; }
	form { margin-top: 0.5rem; min-width: 15rem; padding: 0.75rem; border: 1px solid var(--color-base-300); border-radius: 0.6rem; background: var(--color-base-100); }
	label { display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.45rem; }
	.custom-field { display: flex; gap: 0.4rem; }
	input { width: 7rem; min-height: 2.75rem; padding: 0.5rem 0.75rem; border: 1px solid var(--color-base-300); border-radius: 0.5rem; background: var(--color-base-100); color: var(--color-base-content); font-size: 1rem; }
	.error { max-width: 15rem; margin-top: 0.5rem; font-size: 0.8125rem; color: var(--color-error); }
	a:focus-visible, summary:focus-visible, input:focus-visible, button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
	@media (prefers-reduced-motion: reduce) { a, summary, button { transition: none; } }
</style>
