<script lang="ts">
import { browser } from "$app/environment";
import { page } from "$app/state";
import ActivityInsights from "$lib/activity/ActivityInsights.svelte";
import { absoluteUrl } from "$lib/seo";
import MetaTags from "$lib/seo/PageMeta.svelte";

let { data } = $props();
const title = $derived(
	data.source === "generated"
		? "생성된 로또 번호 분석"
		: "QR 스캔 로또 번호 분석",
);
const requestedRound = $derived(
	browser ? Number(page.url.searchParams.get("round")) : 0,
);
const round = $derived(
	Number.isSafeInteger(requestedRound) && requestedRound > 0
		? requestedRound
		: undefined,
);
const description = $derived(
	`${title}에서 회차별 많이·적게 등장한 번호 Top 10과 전체 45개 분포를 확인하세요. 번호별 순위 변화, 함께 등장한 번호, 홀짝·연속번호 패턴과 생성·스캔 비중을 645.live의 참여 기록으로 비교할 수 있습니다.`,
);
</script>
<MetaTags {title} titleTemplate="%s | 645.live" {description} canonical={absoluteUrl(`/stats/activity/${data.source}`)}/>
<div class="content-page"><header class="page-header"><h1>{title}</h1><p>회차를 고르고, 모인 번호의 분포와 변화를 살펴보세요.</p></header>{#key `${data.source}:${round ?? "current"}`}<ActivityInsights source={data.source} initial={data.activity} {round} sourceLinks/>{/key}</div>
