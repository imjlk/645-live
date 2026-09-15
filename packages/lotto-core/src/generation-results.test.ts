import { describe, expect, test } from "bun:test";
import {
	createGenerationResultHistory,
	type GenerationResult,
	type GenerationResultsPage,
	parseGenerationResults,
	winningGenerations,
} from "./generation-results";

const result = (
	round: number,
	status: GenerationResult["status"] = "ready",
): GenerationResult => ({
	round,
	status,
	totalGenerations: 16,
	rankCounts: status === "ready" ? [5, 2, 3, 1, 1, 4] : null,
	comparedGenerations: status === "ready" ? 16 : 0,
	closesAt: 1789801200000,
	updatedAt: 1789801300000,
	draw:
		status === "ready"
			? { round, numbers: [1, 2, 3, 4, 5, 6], bonus: 7, drawDate: "2026-09-19" }
			: null,
});
const page = (
	rounds: GenerationResult[],
	nextBeforeRound: number | null = null,
): GenerationResultsPage => ({
	rounds,
	nextBeforeRound,
	currentRound: 1243,
	serverTime: 1789801400000,
});
function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

describe("public generation results", () => {
	test("counts all generation occurrences and distinguishes unknown from zero", () => {
		const ready = parseGenerationResults(page([result(1242)])).rounds[0];
		expect(winningGenerations(ready)).toBe(11);
		for (const status of [
			"open",
			"waiting",
			"processing",
			"unavailable",
		] as const) {
			const unknown = result(1242, status);
			expect(
				winningGenerations(parseGenerationResults(page([unknown])).rounds[0]),
			).toBeNull();
			expect(() =>
				parseGenerationResults(
					page([{ ...unknown, rankCounts: [0, 0, 0, 0, 0, 0] }]),
				),
			).toThrow();
		}
		expect(
			winningGenerations({ ...ready, rankCounts: [16, 0, 0, 0, 0, 0] }),
		).toBe(0);
	});
	test("rejects partial, inconsistent, duplicate and out-of-order result snapshots", () => {
		const ready = result(1242);
		if (!ready.draw) throw new Error("Missing fixture draw");
		for (const invalid of [
			page([{ ...ready, comparedGenerations: 15 }]),
			page([{ ...ready, rankCounts: [5, 2, 3, 1, 1, 3] }]),
			page([{ ...ready, draw: null }]),
			page([{ ...ready, draw: { ...ready.draw, bonus: 6 } }]),
			page([ready, ready]),
			page([result(1241), ready]),
			page([ready], 1241),
		])
			expect(() => parseGenerationResults(invalid)).toThrow();
	});
	test("paginates without changing selection and refreshes the selected older round", async () => {
		const queries: { round?: number; before?: number }[] = [];
		const history = createGenerationResultHistory(async (query) => {
			queries.push(query);
			if (query.before) return page([result(1239), result(1238)]);
			if (query.round)
				return page([
					{
						...result(query.round),
						totalGenerations: 0,
						comparedGenerations: 0,
						rankCounts: [0, 0, 0, 0, 0, 0],
					},
				]);
			return page([result(1243, "open"), result(1242), result(1241)], 1241);
		});
		await history.refresh();
		expect(history.getSnapshot().selectedRound).toBe(1242);
		await history.more();
		expect(history.getSnapshot().selectedRound).toBe(1242);
		history.select(1238);
		await history.refresh();
		expect(history.getSnapshot().selectedRound).toBe(1238);
		expect(
			history.getSnapshot().rounds.find((r) => r.round === 1238)
				?.totalGenerations,
		).toBe(0);
		expect(history.getSnapshot().nextBeforeRound).toBeNull();
		expect(queries).toEqual([{}, { before: 1241 }, {}, { round: 1238 }]);
	});
	test("refresh and unmount discard pending stale pagination even when the transport ignores abort", async () => {
		const old = deferred<GenerationResultsPage>();
		const initial = page([result(1242)], 1242);
		const history = createGenerationResultHistory(
			(query) =>
				query.before
					? old.promise
					: Promise.resolve(page([result(1243, "open"), result(1242)], 1242)),
			initial,
		);
		const pending = history.more();
		await history.refresh();
		old.resolve(page([result(1241)]));
		await pending;
		expect(history.getSnapshot().rounds.map((r) => r.round)).toEqual([
			1243, 1242,
		]);
		const late = deferred<GenerationResultsPage>();
		const stopped = createGenerationResultHistory(() => late.promise);
		const refresh = stopped.refresh();
		stopped.stop();
		late.resolve(initial);
		await refresh;
		expect(stopped.getSnapshot().rounds).toEqual([]);
		expect(stopped.getSnapshot().loading).toBe(false);
	});
	test("rejects a cursor that moves forward without destroying loaded history", async () => {
		const history = createGenerationResultHistory(
			async () => page([result(1242)], 1242),
			page([result(1242)], 1242),
		);
		await history.more();
		expect(history.getSnapshot().error).not.toBeNull();
		expect(history.getSnapshot().rounds).toHaveLength(1);
		expect(history.getSnapshot().loadingMore).toBe(false);
	});
});
