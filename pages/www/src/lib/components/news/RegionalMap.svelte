<script lang="ts">
	let {
		title = '지역별 당첨 분포',
		description = '지도 시각화 데이터가 준비되면 이 영역에 표시됩니다.',
		class: customClass = ''
	} = $props();
</script>

<div class={`not-prose card bg-base-200 border border-base-300 ${customClass}`.trim()}>
	<div class="card-body">
		<h3 class="card-title text-base">{title}</h3>
		<p class="text-sm text-base-content/70">{description}</p>
	</div>
</div>
