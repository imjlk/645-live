<script lang="ts">
import StructuredAgentPage from "$lib/components/agent/StructuredAgentPage.svelte";
import { absoluteUrl } from "$lib/seo/index.js";
import MetaTags from "$lib/seo/PageMeta.svelte";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();
</script>

<MetaTags
	title="개발자 문서"
	titleTemplate="%s | 645.live"
	description="645.live 공개 로또 조회 API와 MCP 연동 방법을 확인하세요. 최근 회차 결과와 번호 통계를 조회하는 경로, 응답 형식, 인증이 필요한 회원 스캔 기능, 오류 처리와 관련 문서를 개발자를 위해 정리했습니다."
	canonical={absoluteUrl("/docs")}
	robots="index,follow"
/>

<div class="content-page"><StructuredAgentPage page={data.page} /></div>
