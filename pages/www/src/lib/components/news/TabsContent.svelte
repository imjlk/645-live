<script lang="ts">
	import { getContext } from 'svelte';
	import { TABS_CONTEXT_KEY, type TabsContext } from './tabs-context';

	let { value = '', children, class: customClass = '' } = $props();
	const tabs = getContext<TabsContext | undefined>(TABS_CONTEXT_KEY);

	if (!tabs) {
		throw new Error('TabsContent must be used inside Tabs');
	}

	const activeValue = tabs.value;
</script>

{#if $activeValue === value}
	<div class={`rounded-box border border-base-300 bg-base-100 p-4 mt-3 ${customClass}`.trim()}>
		{@render children?.()}
	</div>
{/if}
