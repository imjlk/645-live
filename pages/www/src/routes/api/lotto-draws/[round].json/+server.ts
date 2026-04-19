import { createJsonErrorResponse } from "$lib/agent/http";
import { getPublicDrawRound } from "$lib/server/agent-api";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params }) => {
	const round = Number.parseInt(params.round, 10);
	if (!Number.isFinite(round) || round <= 0) {
		return createJsonErrorResponse(
			400,
			"INVALID_ROUND",
			"Round must be a positive integer.",
			"Use a Korean Lotto 6/45 round number like 1220.",
		);
	}

	const record = await getPublicDrawRound(round);
	if (!record) {
		return createJsonErrorResponse(
			404,
			"ROUND_NOT_FOUND",
			`Could not find round ${round}.`,
			"Fetch /api/lotto-draws-recent.json to discover the available range.",
		);
	}

	return Response.json(record, {
		headers: {
			"cache-control": "public, max-age=300, s-maxage=900, stale-while-revalidate=1800",
		},
	});
};
