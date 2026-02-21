<script lang="ts">
	let { children, class: customClass = '' } = $props();
</script>

<div class={`tabs tabs-lifted flex-wrap ${customClass}`.trim()}>
	{@render children?.()}
</div>
