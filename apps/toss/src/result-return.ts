import {
	type Draw,
	type RoundContext,
	resultFingerprint,
	type SavedCombination,
} from "@645/lotto-core";
export type SavedParams = { round?: number; entry?: "notification" | "home" };
export function savedParams(value: Readonly<object | undefined>): SavedParams {
	const input = value as Record<string, unknown> | undefined;
	const raw = input?.round;
	const round =
		typeof raw === "number"
			? raw
			: typeof raw === "string" && /^\d+$/.test(raw)
				? Number(raw)
				: NaN;
	return {
		...(Number.isSafeInteger(round) && round > 0 ? { round } : {}),
		...(input?.entry === "notification" || input?.entry === "home"
			? { entry: input.entry }
			: {}),
	};
}
/** Only published, locally available results can be called new. Corrections reopen them. */
export function unreadSavedRounds(
	items: readonly SavedCombination[],
	results: Readonly<Record<number, Draw>>,
) {
	return [
		...new Set(
			items
				.filter((item) => {
					const draw = results[item.round];
					return draw && item.viewedResult !== resultFingerprint(draw);
				})
				.map((item) => item.round),
		),
	].sort((a, b) => b - a);
}

/** targetRound advances at sales close, 35 minutes before that round's draw. */
export function missingResultWatches(
	saved: readonly SavedCombination[],
	context: RoundContext | null,
	registered: readonly number[],
	results: Readonly<Record<number, Draw>>,
) {
	if (!context) return [];
	const pending = new Set<number>();
	for (const { round } of saved) {
		const offset = context.targetRound - round;
		if (
			offset < 0 ||
			offset > 1 ||
			results[round] ||
			round <= (context.latestDraw?.round ?? 0) ||
			registered.includes(round)
		)
			continue;
		if (context.serverTime < context.drawsAt - offset * 7 * 86_400_000)
			pending.add(round);
	}
	return [...pending].sort((a, b) => a - b);
}
