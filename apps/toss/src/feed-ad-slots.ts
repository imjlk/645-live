import type { Generation } from "@645/lotto-core";

export type FeedRow =
	| { key: string; kind: "generation"; generation: Generation }
	| { key: string; kind: "ad"; groupId: string; slot: number };

// Poll-maker pattern: shuffle the group pool once, then assign it by slot index.
export function shuffleAdGroups(groups: string[], random = Math.random) {
	const pool = [...new Set(groups.map((id) => id.trim()).filter(Boolean))];
	for (let i = pool.length - 1; i > 0; i--) {
		const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
		[pool[i], pool[j]] = [pool[j], pool[i]];
	}
	return pool;
}

/** Position keys stay stable when pages append; only one slot every 20 entries. */
export function withFeedAds(items: Generation[], groups: string[]): FeedRow[] {
	const rows: FeedRow[] = [];
	for (const [index, generation] of items.entries()) {
		rows.push({
			kind: "generation",
			key: `generation-${generation.id}`,
			generation,
		});
		if (groups.length && index >= 7 && (index - 7) % 20 === 0) {
			const slot = Math.floor((index - 7) / 20);
			rows.push({
				kind: "ad",
				key: `ad-${slot}`,
				groupId: groups[slot % groups.length],
				slot,
			});
		}
	}
	return rows;
}
