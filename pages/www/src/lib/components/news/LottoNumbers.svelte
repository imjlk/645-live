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
	<div class="number-line" class:linked={showLinks}>
		<div class="main-numbers" aria-label="당첨번호">
			{#each numbers as number (number)}
				{#if showLinks}
					<a class="number-link" href={resolve('/stats/numbers/[number]', { number: String(number) })} aria-label={`당첨번호 ${number}번 출현 통계 보기`}>
						<SimpleBall {number} size="sm" class="news-ball" />
					</a>
				{:else}
					<SimpleBall {number} size="sm" class="news-ball" />
				{/if}
			{/each}
		</div>
		<span class="plus" aria-hidden="true">+</span>
		<div class="bonus-number">
			{#if showLinks}
				<a class="number-link" href={resolve('/stats/numbers/[number]', { number: String(bonus) })} aria-label={`보너스 번호 ${bonus}번 출현 통계 보기`}>
					<SimpleBall number={bonus} size="sm" class="news-ball" />
				</a>
			{:else}
				<SimpleBall number={bonus} size="sm" class="news-ball" />
			{/if}
			<span>보너스</span>
		</div>
	</div>
	{#if showLinks}
		<p class="link-hint">번호를 누르면 출현 통계를 볼 수 있어요.</p>
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
	.linked .plus { line-height: 44px; }
	.bonus-number { display: grid; justify-items: center; gap: 5px; }
	.bonus-number > span { font-size: 0.6875rem; color: color-mix(in oklab, var(--color-base-content) 65%, transparent); }
	.number-link { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; border-radius: 999px; text-decoration: none; }
	.number-link:hover :global(.news-ball) { outline: 2px solid var(--color-primary); outline-offset: 2px; }
	.number-link:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 3px; }
	.link-hint { margin: 12px 0 0; font-size: 0.8125rem; color: color-mix(in oklab, var(--color-base-content) 65%, transparent); }
</style>
