<script lang="ts">
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";

// Breadcrumbs 데이터
const breadcrumbItems = [
	{ label: "홈", href: "/" },
	{ label: "내 645", current: true },
];
</script>

<div class="p-6 space-y-6">
	<!-- Breadcrumbs -->
	<Breadcrumbs items={breadcrumbItems} />

	<!-- 페이지 헤더 -->
	<div class="text-center space-y-2">
		<h1 class="text-3xl font-bold text-primary">내 645</h1>
		<p class="text-base-content/70">
			개인화된 로또 분석 도구와 통계를 확인하세요.
		</p>
	</div>

	<!-- 개발 중 안내 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body text-center">
			<h2 class="card-title justify-center">🚧 개발 중</h2>
			<p class="text-base-content/60">
				이 페이지는 현재 개발 중입니다. 곧 개인화된 로또 분석 기능을 제공할 예정입니다.
			</p>
			<div class="card-actions justify-center mt-4">
				<a href="/stats" class="btn btn-primary">통계 페이지로 이동</a>
				<a href="/" class="btn btn-outline">홈으로 이동</a>
			</div>
		</div>
	</div>
</div>