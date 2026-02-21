import type { Writable } from 'svelte/store';

export type TabsContext = {
	value: Writable<string>;
};

export const TABS_CONTEXT_KEY = Symbol('news-tabs');
