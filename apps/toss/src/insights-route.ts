export type InsightsParams = { round?: number; number?: number };
export type ResultsParams = Pick<InsightsParams, "round">;
export type NumberStatisticsParams = {
	round?: number;
	number: number;
	source?: "draw" | "generated";
};

export function numberStatisticsParams(
	params: Readonly<object | undefined>,
): NumberStatisticsParams {
	const parsed = insightsParams(params);
	if (parsed.number === undefined)
		throw new Error("1~45 사이의 번호를 선택해 주세요.");
	const source = (params as NumberStatisticsParams | undefined)?.source;
	return {
		...parsed,
		number: parsed.number,
		...(source === "draw" || source === "generated" ? { source } : {}),
	};
}

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
