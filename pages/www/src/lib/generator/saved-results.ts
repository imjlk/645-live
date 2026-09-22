import { compareDraw, type Draw, type Generation } from "@645/lotto-core";
export function summarizeSavedResults(
	selected: Generation[],
	results: Record<number, Draw | null>,
) {
	const ranks = [0, 0, 0, 0, 0];
	let checked = 0;
	for (const g of selected) {
		const draw = results[g.round];
		if (!draw) continue;
		checked++;
		const rank = compareDraw(g.numbers, draw).rank;
		if (rank) ranks[rank - 1]++;
	}
	return { ranks, checked };
}
