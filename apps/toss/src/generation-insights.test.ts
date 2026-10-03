import { expect, test } from "bun:test";
import type { Feed, Generation } from "@645/lotto-core";
import {
	generationInsights,
	preferredGenerationInsight,
} from "./generation-insights";
import { insightsParams } from "./insights-route";

const generation: Generation = {
	id: 6,
	round: 1244,
	numbers: [7, 10, 25, 29, 30, 43],
	displayName: "",
	createdAt: 1,
};
const feed: Feed = {
	round: 1244,
	generations: [],
	totalGenerations: 1000,
	numberCounts: Array.from({ length: 45 }, (_, index) =>
		index === 6 ? 300 : 20 + index,
	),
	activeUsers: 1,
	serverTime: 1,
};
test("combination previews reuse round counts and calculate exact local patterns", () => {
	const facts = generationInsights(generation, feed);
	expect(facts.find((f) => f.key === "frequency")).toEqual({
		key: "frequency",
		number: 7,
		text: "7번은 이번 회차에 300회 생성됐어요.",
	});
	expect(facts.find((f) => f.key === "top")?.text).toContain("2개");
	expect(facts.find((f) => f.key === "odd")?.text).toContain(
		"홀수 4개, 짝수 2개",
	);
	expect(facts.find((f) => f.key === "sum")?.text).toContain("144");
	expect(facts.find((f) => f.key === "consecutive")?.text).toContain("1쌍");
	expect(generation.numbers).toEqual([7, 10, 25, 29, 30, 43]);
});
test("old rounds, missing counts and small samples never imply fabricated frequency or a complete Top 10", () => {
	for (const snapshot of [
		null,
		{ ...feed, round: 1243 },
		{ ...feed, totalGenerations: 0 },
	])
		expect(generationInsights(generation, snapshot).map((f) => f.key)).toEqual([
			"odd",
			"sum",
			"consecutive",
		]);
	const sparse = {
		...feed,
		numberCounts: Array.from({ length: 45 }, (_, index) =>
			index === 6 ? 1 : 0,
		),
	};
	expect(
		generationInsights(generation, sparse).some((f) => f.key === "top"),
	).toBe(false);
	expect(
		generationInsights(generation, { ...feed, numberCounts: [] }).some(
			(f) => f.key === "frequency",
		),
	).toBe(false);
});
test("a subscribed update changes the count without changing the highlighted number", () => {
	const next = { ...feed, numberCounts: [...feed.numberCounts] };
	next.numberCounts[6]++;
	expect(generationInsights(generation, next)[0]).toEqual({
		key: "frequency",
		number: 7,
		text: "7번은 이번 회차에 301회 생성됐어요.",
	});
});
test("inline hints prefer community statistics and fall back to exact local patterns", () => {
	const facts = generationInsights(generation, feed);
	expect(preferredGenerationInsight(facts, 6).key).toBe("frequency");
	expect(preferredGenerationInsight(facts, 7).key).toBe("top");
	for (const snapshot of [null, { ...feed, round: 1243 }]) {
		const local = generationInsights(generation, snapshot);
		expect(preferredGenerationInsight(local, 6).key).toBe("odd");
	}
});
test("optional native route filters reject malformed deep links", () => {
	expect(insightsParams({ round: 1243, number: 45 })).toEqual({
		round: 1243,
		number: 45,
	});
	for (const round of [-1, 0, 1.5, "1243", Infinity])
		expect(insightsParams({ round })).toEqual({});
	for (const number of [-1, 0, 46, 1.5, "7"])
		expect(insightsParams({ round: 1244, number })).toEqual({ round: 1244 });
	expect(insightsParams(undefined)).toEqual({});
});
