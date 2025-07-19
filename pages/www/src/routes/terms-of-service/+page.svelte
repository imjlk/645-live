<script lang="ts">
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";

// Breadcrumbs 데이터
const breadcrumbItems = [
	{ label: "홈", href: "/" },
	{ label: "서비스 이용약관", current: true },
];
</script>

<div class="p-6 space-y-6">
	<!-- Breadcrumbs -->
	<Breadcrumbs items={breadcrumbItems} />

	<!-- 페이지 헤더 -->
	<div class="text-center space-y-2">
		<h1 class="text-3xl font-bold text-primary">서비스 이용약관</h1>
		<p class="text-base-content/70">
			645.live 서비스의 이용약관입니다.
		</p>
	</div>

	<!-- 개발 중 안내 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">🚧 개발 중</h2>
			<p class="text-base-content/60">
				서비스 이용약관은 현재 작성 중입니다. 곧 상세한 내용을 제공할 예정입니다.
			</p>
			<div class="card-actions justify-center mt-4">
				<a href="/" class="btn btn-primary">홈으로 이동</a>
			</div>
		</div>
	</div>
</div>