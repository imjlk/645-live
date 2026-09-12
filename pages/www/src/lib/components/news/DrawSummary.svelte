<script lang="ts">
import LottoNumbers from "./LottoNumbers.svelte";

interface Props {
	round: number;
	date: string;
	numbers: number[];
	bonus: number;
	winners: number;
	prize: number;
	totalSales: number;
}

let { round, date, numbers, bonus, winners, prize, totalSales }: Props =
	$props();
const won = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;
</script>

<section class="draw-summary not-prose" aria-label={`제${round}회 결과 요약`}>
	<div class="draw-label">
		<h2>제{round}회 결과</h2>
		<time datetime={date}>{date.replaceAll('-', '.')} 추첨</time>
	</div>
	<LottoNumbers {round} {numbers} {bonus} heading={false} />
	<dl class="prize-summary">
		<div class="main-prize">
			<dt>1등 1게임당 당첨금</dt>
			<dd>{won(prize)}</dd>
		</div>
		<div>
			<dt>1등 당첨</dt>
			<dd>{winners.toLocaleString('ko-KR')}<span>게임</span></dd>
		</div>
	</dl>
	<p class="sales">총 판매액 {won(totalSales)}</p>
</section>

<style>
	.draw-summary { padding: 24px 0; margin-bottom: 28px; border-block: 1px solid var(--color-base-300); }
	.draw-label { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px 16px; }
	h2 { margin: 0; font-size: 1rem; font-weight: 750; }
	time, dt, .sales { font-size: 0.8125rem; color: color-mix(in oklab, var(--color-base-content) 65%, transparent); }
	.prize-summary { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 20px; margin: 0; }
	dd { margin: 6px 0 0; font-size: clamp(1.25rem, 3vw, 1.875rem); font-weight: 750; font-variant-numeric: tabular-nums; letter-spacing: -0.045em; line-height: 1.2; }
	dd span { margin-left: 2px; font-size: 0.875rem; font-weight: 500; }
	.main-prize dd { color: var(--color-primary); }
	.sales { margin: 16px 0 0; font-variant-numeric: tabular-nums; }
	@media (max-width: 374px) {
		.prize-summary { grid-template-columns: 1fr; gap: 12px; }
		.prize-summary > div:last-child { display: flex; align-items: baseline; gap: 12px; }
		.prize-summary > div:last-child dd { font-size: 1rem; margin: 0; }
	}
</style>
