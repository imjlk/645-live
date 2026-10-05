export type InsightsParams = { round?: number; number?: number };
export type ResultsParams = Pick<InsightsParams, "round">;

export function resultsParams(
	params: Readonly<object | undefined>,
): ResultsParams {
	const { round } = insightsParams(params);
	return round === undefined ? {} : { round };
}

/** Granite parses deep-link values before validating; ignore malformed optional filters. */
export function insightsParams(
	params: Readonly<object | undefined>,
): InsightsParams {
	const input = params as InsightsParams | undefined;
	return {
		...(Number.isSafeInteger(input?.round) && (input?.round ?? 0) > 0
			? { round: input?.round }
			: {}),
		...(Number.isInteger(input?.number) &&
		(input?.number ?? 0) >= 1 &&
		(input?.number ?? 0) <= 45
			? { number: input?.number }
			: {}),
	};
}
