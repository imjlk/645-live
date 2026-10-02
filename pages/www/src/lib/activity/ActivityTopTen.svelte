<script lang="ts">
import { type ActivitySource, rankNumberCounts, sum } from "@645/lotto-core";
import { resolve } from "$app/paths";
import SimpleBall from "$lib/components/SimpleBall.svelte";

let {
	counts,
	round,
	source = "generated",
}: { counts: number[]; round?: number; source?: ActivitySource } = $props();
const top = $derived(
	rankNumberCounts(counts)
		.filter((n) => n.count > 0)
		.slice(0, 10),
);
</script>
{#if sum(counts)>0}<section class="top-ten" aria-label="많이 등장한 번호 Top 10"><div><h3>{round ? `${round}회 Top 10` : "많이 등장한 번호 Top 10"}</h3><a href={`${resolve("/stats/activity/[source]",{source})}${round?`?round=${round}`:""}`}>번호 분석 전체 보기 →</a></div><ol>{#each top as n (n.number)}<li><a href={`${resolve("/stats/activity/[source]",{source})}${round?`?round=${round}`:""}`} aria-label={`${n.number}번 ${n.count}회 등장, 번호 분석`}><span class="rank">{n.rank}위</span><SimpleBall number={n.number} size="sm"/><span>{n.count.toLocaleString()}회</span></a></li>{/each}</ol></section>{/if}
<style>.top-ten{padding:1.5rem 0;border-top:1px solid var(--color-base-300)}.top-ten>div{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:1rem}.top-ten h3{font-size:1.1rem;font-weight:700}.top-ten>div>a{font-size:.8rem;color:var(--color-primary);min-height:44px;display:inline-flex;align-items:center}.top-ten ol{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:.5rem;list-style:none;padding:0;margin:0}.top-ten li a{display:flex;flex-direction:column;align-items:center;gap:.5rem;padding:.5rem 0;min-height:44px;color:inherit;text-decoration:none}.top-ten li span{font-size:.75rem;font-variant-numeric:tabular-nums}.rank{color:var(--text-muted)}a:focus-visible{outline:2px solid var(--color-primary);outline-offset:4px}@media(max-width:700px){.top-ten ol{grid-template-columns:repeat(5,minmax(0,1fr));row-gap:1rem}}</style>
