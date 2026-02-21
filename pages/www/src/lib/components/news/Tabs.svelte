<script lang="ts">
	import { setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import { TABS_CONTEXT_KEY, type TabsContext } from './tabs-context';

	let { defaultValue = '', children, class: customClass = '' } = $props();
	const value = writable(defaultValue);
	const context: TabsContext = { value };
	setContext(TABS_CONTEXT_KEY, context);
</script>

<div class={`not-prose my-6 ${customClass}`.trim()}>
	{@render children?.()}
</div>
