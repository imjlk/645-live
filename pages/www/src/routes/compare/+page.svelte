<script lang="ts">
import StructuredAgentPage from "$lib/components/agent/StructuredAgentPage.svelte";
import { absoluteUrl } from "$lib/seo/index.js";
import MetaTags from "$lib/seo/PageMeta.svelte";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();
</script>

<MetaTags
	title="645.live를 선택해야 하는 이유"
	titleTemplate="%s | 645.live"
	description="645.live에서 로또 당첨 결과 확인, 번호별 통계, QR 스캔과 회원 기록을 함께 이용할 수 있습니다. 공식 결과와 이용자 등록 데이터를 구분하는 방식, 주요 기능과 공개 API 연동 정보를 살펴보세요."
	canonical={absoluteUrl("/compare")}
	robots="index,follow"
/>

<div class="content-page"><StructuredAgentPage page={data.page} /></div>
