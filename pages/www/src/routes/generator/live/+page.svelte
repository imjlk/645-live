<script lang="ts">
import LivePanel from "$lib/generator/LivePanel.svelte";
import { useGenerator } from "$lib/generator/model.svelte";
import { absoluteUrl } from "$lib/seo";
import MetaTags from "$lib/seo/PageMeta.svelte";

const generator = useGenerator();
</script>
<MetaTags title="실시간 로또 번호 생성 현황" titleTemplate="%s | 645.live" description="645.live와 토스 번호 생성기에서 만들어지는 조합을 실시간으로 확인하세요. 이번 회차의 총 생성 횟수, 1~45번 번호별 생성 통계와 최근 조합을 살펴보고 마음에 드는 번호를 기기 보관함에 저장할 수 있습니다. QR 스캔 통계와는 별도로 집계됩니다." canonical={absoluteUrl("/generator/live")} />
<div class="content-page"><header class="page-header"><h1>함께 만드는 번호</h1><p>새 조합이 만들어질 때마다 번호별 횟수가 올라갑니다.</p></header>
<LivePanel live={generator.live} save={generator.toggleSave} isSaved={g => generator.saved.some(s => s.id === g.id)} />
{#if generator.error}<p role="alert" class="mt-4 text-error">{generator.error}</p>{/if}
<p class="sr-only" role="status">{generator.notice}</p></div>
