/** Bundle-local switches. Analytics never authorizes or advances the counter. */
export type GenerationAdSettings = {
	mode: "experiment" | "relaxed";
	collectServerMetrics: boolean;
	returningDailyAd: boolean;
};
export const GENERATION_AD_SETTINGS: GenerationAdSettings = {
	mode: "experiment",
	collectServerMetrics: true,
	returningDailyAd: true,
};
export const GENERATION_AD_INTERVALS = {
	// Both arms share attendance and the first gate; only recurring cadence differs.
	control: {
		firstGenerations: 1,
		firstMaxGenerations: 3,
		minGenerations: 2,
		maxGenerations: 8,
	},
	short: {
		firstGenerations: 1,
		firstMaxGenerations: 3,
		minGenerations: 2,
		maxGenerations: 5,
	},
	relaxed: {
		firstGenerations: 5,
		firstMaxGenerations: 5,
		minGenerations: 5,
		maxGenerations: 30,
	},
};
