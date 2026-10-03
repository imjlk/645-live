import type { Feed, Generation } from "@645/lotto-core";

export type GenerationInsight = { key: string; text: string; number?: number };

/** Prefer community counts; local patterns remain useful before a matching feed arrives. */
export function preferredGenerationInsight(
	facts: GenerationInsight[],
	generationId: number,
): GenerationInsight {
	const preferred = generationId % 2 === 0 ? "frequency" : "top";
	return (
		facts.find((fact) => fact.key === preferred) ??
		facts.find((fact) => fact.key === "frequency" || fact.key === "top") ??
		facts[generationId % facts.length]
	);
}

/** Reuse the subscribed round counts. This preview never fetches or invents counts. */
export function generationInsights(
	generation: Generation,
	feed: Feed | null,
): GenerationInsight[] {
	const numbers = generation.numbers;
	const facts: GenerationInsight[] = [];
	if (feed?.round === generation.round && feed.totalGenerations > 0) {
		const number = numbers[generation.id % numbers.length];
		const count = feed.numberCounts[number - 1];
		if (count > 0)
			facts.push({
				key: "frequency",
				number,
				text: `${number}번은 이번 회차에 ${count.toLocaleString()}회 생성됐어요.`,
			});
		const top = feed.numberCounts
			.map((count, index) => ({ count, number: index + 1 }))
			.filter((item) => item.count > 0)
			.sort((a, b) => b.count - a.count || a.number - b.number)
			.slice(0, 10);
		// A small initial sample is a collected ranking, not a completed Top 10.
		if (top.length === 10) {
			const matches = numbers.filter((number) =>
				top.some((item) => item.number === number),
			);
			facts.push({
				key: "top",
				text: `이 조합에는 생성 Top 10 번호가 ${matches.length}개 있어요.`,
			});
		}
	}
	const odd = numbers.filter((number) => number % 2).length;
	facts.push({
		key: "odd",
		text: `이번 조합은 홀수 ${odd}개, 짝수 ${numbers.length - odd}개예요.`,
	});
	facts.push({
		key: "sum",
		text: `이 조합의 번호 합계는 ${numbers.reduce((total, number) => total + number, 0)}예요.`,
	});
	const sorted = [...numbers].sort((a, b) => a - b);
	const consecutive = sorted
		.slice(1)
		.filter((number, index) => number === sorted[index] + 1).length;
	facts.push({
		key: "consecutive",
		text: consecutive
			? `이번 조합에는 연속된 번호가 ${consecutive}쌍 있어요.`
			: "이번 조합에는 서로 붙어 있는 번호가 없어요.",
	});
	return facts;
}
