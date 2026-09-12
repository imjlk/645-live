<script lang="ts">
import { resolve } from "$app/paths";
import SimpleBall from "$lib/components/SimpleBall.svelte";

interface Props {
	numbers: number[];
	bonus: number;
	round: number;
	heading?: boolean;
	showLinks?: boolean;
}

let {
	numbers,
	bonus,
	round,
	heading = true,
	showLinks = true,
}: Props = $props();
</script>

<section class="news-numbers not-prose" aria-label={`제${round}회 당첨번호`}>
	{#if heading}<h3>제{round}회 당첨번호</h3>{/if}
	<div class="number-line">
		<div class="main-numbers" aria-label="당첨번호">
			{#each numbers as number (number)}
				<SimpleBall {number} size="sm" class="news-ball" />
			{/each}
		</div>
		<span class="plus" aria-hidden="true">+</span>
		<div class="bonus-number">
			<SimpleBall number={bonus} size="sm" class="news-ball" />
			<span>보너스</span>
		</div>
	</div>
	{#if showLinks}
		<a class="bonus-link" href={resolve('/stats/numbers/[number]', { number: String(bonus) })}>
			보너스 {bonus}번의 출현 기록 <span aria-hidden="true">→</span>
		</a>
	{/if}
</section>

<style>
	.news-numbers { margin-block: 20px; }
	h3 { margin: 0 0 16px; font-size: 1rem; font-weight: 700; }
	.number-line, .main-numbers { display: flex; align-items: flex-start; gap: clamp(5px, 1.6vw, 12px); }
	.number-line { align-items: flex-start; }
	.news-numbers :global(.news-ball) {
		width: clamp(32px, 5vw, 44px);
		height: clamp(32px, 5vw, 44px);
		flex-shrink: 0;
		font-size: clamp(0.875rem, 2vw, 1.125rem);
		box-shadow: none;
	}
	.plus { align-self: flex-start; line-height: clamp(32px, 5vw, 44px); color: color-mix(in oklab, var(--color-base-content) 50%, transparent); }
	.bonus-number { display: grid; justify-items: center; gap: 5px; }
	.bonus-number > span { font-size: 0.6875rem; color: color-mix(in oklab, var(--color-base-content) 65%, transparent); }
	.bonus-link { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; font-size: 0.8125rem; color: var(--color-primary); text-decoration: none; }
	.bonus-link:hover { text-decoration: underline; text-underline-offset: 4px; }
</style>
