import {
	type Draw,
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
