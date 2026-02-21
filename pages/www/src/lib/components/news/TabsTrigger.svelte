<script lang="ts">
	import { getContext } from 'svelte';
	import { TABS_CONTEXT_KEY, type TabsContext } from './tabs-context';

	let { value = '', children } = $props();
	const tabs = getContext<TabsContext | undefined>(TABS_CONTEXT_KEY);

	if (!tabs) {
		throw new Error('TabsTrigger must be used inside Tabs');
	}

	const activeValue = tabs.value;
	const isActive = $derived($activeValue === value);
</script>

<button
	type="button"
	class={`tab ${isActive ? 'tab-active' : ''}`.trim()}
	onclick={() => activeValue.set(value)}
>
	{@render children?.()}
</button>
