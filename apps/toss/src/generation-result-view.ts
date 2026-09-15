import type { GenerationResultsPage } from "@645/lotto-core";

/** The live tab already shows the open round; this sheet only browses closed rounds. */
export function previousGenerationResults(
	page: GenerationResultsPage,
): GenerationResultsPage {
	return {
		...page,
		rounds: page.rounds.filter((row) => row.round < page.currentRound),
	};
}
