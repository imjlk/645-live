<script lang="ts">
interface Props {
	number: number;
	isWinning?: boolean;
	isBonus?: boolean;
	size?: "sm" | "md" | "lg";
	class?: string;
}
let {
	number,
	isWinning = false,
	isBonus = false,
	size = "md",
	class: className = "",
	...rest
}: Props = $props();
const color = $derived(
	number <= 10
		? "yellow"
		: number <= 20
			? "blue"
			: number <= 30
				? "red"
				: number <= 40
					? "grey"
					: "green",
);
</script>
<div class="simple-ball {size} {className}" class:winning={isWinning} class:bonus={isBonus} style:background={`var(--lotto-${color})`} style:color={`var(--lotto-${color}-content)`} {...rest}>{number}</div>
<style>
 .simple-ball{display:inline-flex;flex-shrink:0;align-items:center;justify-content:center;border-radius:50%;font-weight:750;font-variant-numeric:tabular-nums;}
 .sm{width:2rem;height:2rem;font-size:.8125rem;}.md{width:3rem;height:3rem;font-size:1rem;}.lg{width:4rem;height:4rem;font-size:1.4rem;}
 .winning{outline:2px solid var(--color-primary);outline-offset:2px;}.bonus{outline:2px solid var(--color-secondary);outline-offset:2px;}
</style>
