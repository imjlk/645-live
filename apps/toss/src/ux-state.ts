import {
	compareDraw,
	type Draw,
	EMPTY_OPTIONS,
	type Generation,
	type GenerationOptions,
	type SavedCombination,
} from "@645/lotto-core";
import { generationOptionsError } from "./generation-options";

export type Preferences = { options: GenerationOptions; liveColumns: 5 | 9 };
export const DEFAULT_PREFERENCES: Preferences = {
	options: EMPTY_OPTIONS,
	liveColumns: 5,
};
export function normalizePreferences(value: unknown): Preferences | null {
	const p = value as Preferences | null;
	if (
		!p ||
		!p.options ||
		!Array.isArray(p.options.fixed) ||
		!Array.isArray(p.options.excluded) ||
		generationOptionsError(p.options)
	)
		return null;
	return { options: p.options, liveColumns: p.liveColumns === 9 ? 9 : 5 };
}
export function rememberGeneration(
	items: Generation[],
	next: Generation,
): Generation[] {
	return [next, ...items.filter((item) => item.id !== next.id)].slice(0, 10);
}
export type SavedFilter = "all" | "waiting" | "ready";
export function savedRounds(
	items: SavedCombination[],
	results: Record<number, Draw>,
	filter: SavedFilter,
) {
	const rounds = [...new Set(items.map((item) => item.round))].sort(
		(a, b) => b - a,
	);
	return rounds.filter(
		(round) =>
			filter === "all" ||
			(filter === "ready" ? !!results[round] : !results[round]),
	);
}
export function savedSummary(items: SavedCombination[], draw: Draw) {
	const rankCounts = [0, 0, 0, 0, 0, 0];
	for (const item of items)
		if (item.round === draw.round)
			rankCounts[compareDraw(item.numbers, draw).rank ?? 0]++;
	return { total: rankCounts.reduce((a, b) => a + b, 0), rankCounts };
}
export function actionArea(name: string) {
	if (
		name.includes("promotion") ||
		name.includes("attendance") ||
		name === "checkIn"
	)
		return "attendance";
	if (name === "notifications" || name === "save" || name.startsWith("remove"))
		return "saved";
	if (name === "report" || name === "unlock-report") return "report";
	if (name === "withdraw") return "settings";
	return "make";
}

/** Merge only edited preferences after a successful storage read. */
export function createPreferencesStore(
	storage: {
		getItem(key: string): Promise<string | null> | string | null;
		setItem(key: string, value: string): Promise<void> | void;
	},
	key: string,
) {
	let queue: Promise<unknown> = Promise.resolve();
	async function read(): Promise<Preferences> {
		const raw = await storage.getItem(key);
		if (!raw) return DEFAULT_PREFERENCES;
		const value = normalizePreferences(JSON.parse(raw));
		if (!value) throw new Error("Cannot read saved preferences");
		return value;
	}
	return {
		read,
		write(patch: Partial<Preferences>) {
			const operation = queue
				.catch(() => {})
				.then(async () => {
					const next = { ...(await read()), ...patch };
					await storage.setItem(key, JSON.stringify(next));
				});
			queue = operation;
			return operation;
		},
	};
}
