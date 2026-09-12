<script lang="ts">
import { absoluteUrl, DATA_SOURCES_PATH } from "$lib/seo/index.js";
import MetaTags from "$lib/seo/PageMeta.svelte";
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";

const breadcrumbItems = [
	{ label: "홈", href: "/" },
	{ label: "데이터 출처", current: true },
];
</script>

<MetaTags
	title="데이터 출처"
	titleTemplate="%s | 645.live"
	description="645.live 당첨번호·통계·판매점 정보에 사용하는 데이터 출처를 확인하세요. 동행복권 공식 발표와 사이트에 등록된 QR 스캔 집계를 구분하고, 데이터 갱신 시점과 오류 발생 시 확인해야 할 기준을 안내합니다."
	canonical={absoluteUrl(DATA_SOURCES_PATH)}
	robots="index,follow"
/>

<div class="content-page">
	<Breadcrumbs items={breadcrumbItems} />

	<div class="page-header">
		<h1 class="page-title">데이터 출처</h1>
		<p class="text-base-content/70">
			기본 데이터는 공식 발표를 우선 기준으로 삼고, 645.live 내부 스캔 데이터는 별도 분석 레이어로 사용합니다.
		</p>
	</div>

	<div class="grid gap-6 lg:grid-cols-2">
		<section class="card bg-base-100 shadow-sm">
			<div class="card-body editorial-prose prose prose-sm sm:prose max-w-none">
				<h2>공식 발표 데이터</h2>
				<ul>
					<li>로또 회차 결과: 동행복권 공식 발표 기준</li>
					<li>당첨점 정보: 동행복권 공개 당첨점 조회 기준</li>
					<li>회차·판매·당첨금 관련 수치: 공식 API/공개 응답 기준</li>
				</ul>
				<p>
					공식 발표가 늦어지거나 보정될 경우, 사이트 반영 시점과 차이가 생길 수 있습니다.
				</p>
			</div>
		</section>

		<section class="card bg-base-100 shadow-sm">
			<div class="card-body editorial-prose prose prose-sm sm:prose max-w-none">
				<h2>645.live 자체 데이터</h2>
				<ul>
					<li>QR 스캔 결과와 번호 선택 흐름에서 집계되는 스캔 현황</li>
					<li>최근 회차의 번호별 관심도, 패턴 변화, 후속 탐색 흐름</li>
					<li>기사 추천 통계와 일부 인사이트용 내부 집계</li>
				</ul>
				<p>
					이 데이터는 공식 발표를 대체하지 않으며, “사람들이 실제로 많이 확인한 번호와 패턴”을 보여주는 참고 지표입니다.
				</p>
			</div>
		</section>
	</div>
</div>

<style>
.page-header { margin-top: .75rem; }
.card, .card-body { min-width: 0; }
.card-body { padding: clamp(1rem, 2.4vw, 1.75rem); }
.editorial-prose > h2 { margin-top: 1.75rem; margin-bottom: .75rem; font-size: var(--section-title-size); line-height: 1.5; }
.editorial-prose > h2:first-child { margin-top: 0; }
.editorial-prose > p, .editorial-prose > ul { max-width: var(--reading-width); font-size: var(--body-copy-size); line-height: var(--body-copy-line-height); overflow-wrap: anywhere; }
</style>
