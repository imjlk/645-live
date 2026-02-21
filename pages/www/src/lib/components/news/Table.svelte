<script lang="ts">
	let { children, class: customClass = '' } = $props();
</script>

<div class={`overflow-x-auto ${customClass}`.trim()}>
	<table class="table table-zebra w-full">
		{@render children?.()}
	</table>
</div>
