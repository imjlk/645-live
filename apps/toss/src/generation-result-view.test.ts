import { expect, test } from "bun:test";
import {
	createGenerationResultHistory,
	type GenerationResultsPage,
} from "@645/lotto-core";
import { previousGenerationResults } from "./generation-result-view";

test("a new service with only this week's records shows empty history, not an error", async () => {
	const page: GenerationResultsPage = {
		currentRound: 1242,
		serverTime: 1,
		nextBeforeRound: null,
		rounds: [
			{
				round: 1242,
				totalGenerations: 8,
				comparedGenerations: 0,
				status: "open",
				rankCounts: null,
				closesAt: 10,
				draw: null,
				updatedAt: 1,
			},
		],
	};
	const history = createGenerationResultHistory(async () =>
		previousGenerationResults(page),
	);
	await history.refresh();
	expect(history.getSnapshot()).toMatchObject({
		rounds: [],
		selectedRound: null,
		error: null,
		loading: false,
	});
	page.currentRound = 1243;
	page.rounds[0].status = "waiting";
	await history.refresh();
	expect(history.getSnapshot().selectedRound).toBe(1242);
	expect(history.getSnapshot().rounds[0].rankCounts).toBeNull();
});

test("a genuine transport failure remains retryable and does not become empty statistics", async () => {
	let fails = true;
	const history = createGenerationResultHistory(async () => {
		if (fails) throw new Error("connection failed");
		return previousGenerationResults({
			currentRound: 1242,
			serverTime: 1,
			rounds: [],
			nextBeforeRound: null,
		});
	});
	await history.refresh();
	expect(history.getSnapshot().error).toBe("connection failed");
	fails = false;
	await history.refresh();
	expect(history.getSnapshot().error).toBeNull();
});
