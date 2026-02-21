<script lang="ts">
	let {
		type = 'bar',
		title = '데이터 차트',
		description = '차트 데이터가 준비되면 시각화가 여기에 표시됩니다.',
		class: customClass = ''
	} = $props();
</script>

<div class={`not-prose card bg-base-200 border border-base-300 ${customClass}`.trim()}>
	<div class="card-body">
		<h3 class="card-title text-base">{title}</h3>
		<p class="text-sm text-base-content/70">{description}</p>
		<div class="badge badge-outline mt-1">type: {type}</div>
	</div>
</div>
