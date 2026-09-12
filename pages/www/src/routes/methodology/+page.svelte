<script lang="ts">
import StructuredAgentPage from "$lib/components/agent/StructuredAgentPage.svelte";
import { absoluteUrl } from "$lib/seo/index.js";
import MetaTags from "$lib/seo/PageMeta.svelte";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();
</script>

<MetaTags
	title="운영 기준"
	titleTemplate="%s | 645.live"
	description="645.live가 로또 당첨 결과와 스캔 집계를 정리하는 기준을 확인하세요. 공식 추첨 데이터를 우선하는 원칙, 번호별 출현 빈도의 계산과 해석, 이용자 등록 데이터의 범위와 통계를 비교할 때의 주의점을 안내합니다."
	canonical={absoluteUrl("/methodology")}
	robots="index,follow"
/>

<div class="content-page"><StructuredAgentPage page={data.page} /></div>
