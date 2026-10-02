import { describe, expect, test } from "bun:test";
import {
	type ActivityData,
	type ActivitySnapshot,
	activityComparison,
	activityNumbers,
	combinationActivity,
	createActivityController,
	fetchActivityInsights,
	numberActivity,
	parseActivitySnapshot,
	rankNumberCounts,
} from "./activity";

const counts = (...values: number[]) =>
	Array.from({ length: 45 }, (_, i) => values[i] ?? 0);
function fixture(round = 1242): ActivitySnapshot {
	const source = (kind: "generated" | "scanned"): ActivityData => ({
		source: kind,
		records: kind === "generated" ? 100 : 2,
		numberCounts: kind === "generated" ? counts(12, 12, 6) : counts(1, 1, 8),
		previousCounts: counts(1, 2, 12),
		rounds: [
			{
				round: round - 1,
				records: 1,
				numberCounts: counts(1, 2, 12),
				available: true,
			},
		],
		patterns: {
			combinations: 0,
			oddCounts: Array(7).fill(0),
			sumCounts: Array(14).fill(0),
			withConsecutive: 0,
			since: null,
		},
		pairs: [],
		hours: [],
	});
	return {
		round,
		currentRound: 1242,
		period: "round",
		updatedAt: 1,
		sources: { generated: source("generated"), scanned: source("scanned") },
		draw: null,
		knownRounds: [1242, 1241],
	};
}
const deferred = <T>() => {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((r) => {
		resolve = r;
	});
	return { promise, resolve };
};

describe("recorded number insights", () => {
	test("competition ranks keep ties and zero counts out of Top 10", () => {
		expect(
			rankNumberCounts(counts(12, 12, 6))
				.slice(0, 4)
				.map((n) => [n.number, n.rank]),
		).toEqual([
			[1, 1],
			[2, 1],
			[3, 3],
			[4, null],
		]);
		const data = fixture().sources.generated;
		expect(activityNumbers(data)[2].rankChange).toBe(-2);
		expect(activityNumbers(data, "least")[0]).toMatchObject({
			number: 4,
			count: 0,
			rank: null,
		});
		expect(combinationActivity(data, [1, 2, 3, 4, 5, 6]).topMatches).toEqual([
			1, 2, 3,
		]);
	});
	test("comparisons normalize number occurrences, never games versus QR tickets", () => {
		const snapshot = fixture();
		const comparison = activityComparison(snapshot);
		expect(comparison[0]).toMatchObject({
			number: 3,
			generatedShare: 0.2,
			scannedShare: 0.8,
		});
		expect(comparison[0].gap).toBeCloseTo(-0.6);
		expect(activityNumbers(snapshot.sources.generated)[0].share).toBe(0.4);
		expect(
			numberActivity(snapshot.sources.generated, 1).trend[0].share,
		).toBeCloseTo(1 / 15);
	});
	test("legacy marginals do not imply complete pair or pattern coverage", () => {
		const value = fixture();
		expect(
			parseActivitySnapshot(value).sources.scanned.patterns.combinations,
		).toBe(0);
		for (const mutate of [
			(v: ActivitySnapshot) => {
				v.sources.scanned.numberCounts[0] = -1;
			},
			(v: ActivitySnapshot) => {
				v.sources.generated.patterns.combinations = 1;
			},
			(v: ActivitySnapshot) => {
				v.sources.scanned.pairs = [{ a: 1, b: 1, count: 1 }];
			},
			(v: ActivitySnapshot) => {
				v.sources.scanned.hours = [
					{ hour: 0, combinations: 1, numberCounts: counts(1) },
				];
			},
			(v: ActivitySnapshot) => {
				v.draw = {
					round: v.round - 1,
					numbers: [1, 2, 3, 4, 5, 6],
					bonus: 7,
					drawDate: "2026-09-19",
				};
			},
			(v: ActivitySnapshot) => {
				v.knownRounds = [0];
			},
		]) {
			const next = structuredClone(value);
			mutate(next);
			expect(() => parseActivitySnapshot(next)).toThrow();
		}
	});
	test("controller preserves static content, deduplicates refresh and ignores stale responses", async () => {
		const first = deferred<ActivitySnapshot>(),
			second = deferred<ActivitySnapshot>();
		const calls: { round?: number; signal: AbortSignal }[] = [];
		const controller = createActivityController((q, signal) => {
			calls.push({ ...q, signal });
			return calls.length === 1 ? first.promise : second.promise;
		}, fixture());
		const initial = controller.select({ period: "round" });
		expect(controller.getSnapshot().data?.round).toBe(1242);
		void controller.refresh();
		await Promise.resolve();
		expect(calls).toHaveLength(1);
		const newer = controller.select({ round: 1241, period: "round" });
		expect(controller.getSnapshot().data).toBeNull();
		expect(calls[0].signal.aborted).toBe(true);
		second.resolve(fixture(1241));
		await newer;
		first.resolve(fixture());
		await initial;
		expect(controller.getSnapshot().data?.round).toBe(1241);
		controller.stop();
	});
	test("stop prevents publication, resume retries synchronous failures and releases listeners", async () => {
		const pending = deferred<ActivitySnapshot>();
		let fail = true,
			notified = 0;
		const controller = createActivityController(() => {
			if (fail) throw Error("offline");
			return pending.promise;
		});
		const unsubscribe = controller.subscribe(() => notified++);
		await controller.refresh();
		expect(controller.getSnapshot().error).toBe("offline");
		fail = false;
		const request = controller.refresh();
		await Promise.resolve();
		controller.stop();
		pending.resolve(fixture());
		await request;
		expect(controller.getSnapshot().data).toBeNull();
		unsubscribe();
		const last = notified;
		await controller.refresh();
		expect(controller.getSnapshot().data?.round).toBe(1242);
		expect(notified).toBe(last);
	});
	test("fetch forwards cancellation and rejects an unavailable endpoint instead of zeroes", async () => {
		const abort = new AbortController();
		abort.abort();
		let observed = false;
		const fetcher = (async (_url: unknown, options: RequestInit) => {
			observed = options.signal?.aborted === true;
			return new Response("{}", { status: 404 });
		}) as typeof fetch;
		await expect(
			fetchActivityInsights(
				"https://fixture.invalid",
				{},
				abort.signal,
				fetcher,
			),
		).rejects.toThrow("준비");
		expect(observed).toBe(true);
	});
});
