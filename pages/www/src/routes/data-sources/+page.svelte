<script lang="ts">
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";
import { DATA_SOURCES_PATH, absoluteUrl } from "$lib/seo/index.js";
import MetaTags from "$lib/seo/PageMeta.svelte";

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

<div class="content-page space-y-6">
	<Breadcrumbs items={breadcrumbItems} />

	<div class="page-header space-y-2">
		<h1 class="text-3xl font-bold text-primary">데이터 출처</h1>
		<p class="text-base-content/70">
			기본 데이터는 공식 발표를 우선 기준으로 삼고, 645.live 내부 스캔 데이터는 별도 분석 레이어로 사용합니다.
		</p>
	</div>

	<div class="grid gap-6 lg:grid-cols-2">
		<section class="card bg-base-100 shadow-sm">
			<div class="card-body prose prose-sm sm:prose max-w-none">
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
			<div class="card-body prose prose-sm sm:prose max-w-none">
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
