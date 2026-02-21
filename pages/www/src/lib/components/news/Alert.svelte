<script lang="ts">
	const typeClasses = {
		info: 'alert-info',
		success: 'alert-success',
		warning: 'alert-warning',
		error: 'alert-error'
	};

	let { type = 'info', children, class: customClass = '' } = $props();
	const className = $derived(`alert ${typeClasses[type] ?? typeClasses.info} ${customClass}`.trim());
</script>

<div class={className} role="note">
	{@render children?.()}
</div>
