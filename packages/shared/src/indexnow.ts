export const INDEXNOW_MAX_URLS = 10_000;

export type IndexNowManifestKind = "draw" | "news" | "scan" | "stats";

export type IndexNowManifestGroup = {
	id: string;
	kind: IndexNowManifestKind;
	version: string;
	urls: string[];
};

export type IndexNowManifest = {
	schemaVersion: 1;
	generatedAt: string;
	groups: IndexNowManifestGroup[];
};

/**
 * Converts high-frequency scan counts into meaningful crawl milestones.
 *
 * IndexNow recommends notifying user-generated content incrementally instead
 * of on every write. Keep early activity visible, then widen the interval as
 * the count grows so crawl quota is spent on material changes.
 */
export function scanCountMilestone(count: number): number {
	const safeCount = Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
	if (safeCount <= 20) return safeCount;
	if (safeCount <= 100) return Math.floor(safeCount / 5) * 5;
	if (safeCount <= 1_000) return Math.floor(safeCount / 10) * 10;
	return Math.floor(safeCount / 100) * 100;
}
