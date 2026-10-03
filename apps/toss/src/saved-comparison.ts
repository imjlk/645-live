import type { Generation, SavedCombination } from "@645/lotto-core";
/** Same-round local comparisons exclude the generated record itself, even after saving. */
export function savedComparison(
	generation: Generation,
	saved: readonly SavedCombination[],
) {
	const others = saved.filter(
		(item) =>
			item.round === generation.round && item.generationId !== generation.id,
	);
	const counts = Array<number>(45).fill(0);
	const unique = new Set<string>();
	const rows = others
		.map((item) => {
			for (const number of item.numbers) counts[number - 1]++;
			unique.add([...item.numbers].sort((a, b) => a - b).join(","));
			return {
				item,
				overlap: item.numbers.filter((number) =>
					generation.numbers.includes(number),
				).length,
			};
		})
		.sort(
			(a, b) =>
				b.overlap - a.overlap ||
				b.item.savedAt - a.item.savedAt ||
				b.item.generationId - a.item.generationId,
		);
	return {
		total: others.length,
		unique: unique.size,
		identical: rows.filter((row) => row.overlap === 6).length,
		maxOverlap: rows[0]?.overlap ?? 0,
		closest: rows.slice(0, 3),
		frequent: counts
			.map((count, index) => ({ number: index + 1, count }))
			.filter((row) => row.count > 0)
			.sort((a, b) => b.count - a.count || a.number - b.number)
			.slice(0, 5),
	};
}
