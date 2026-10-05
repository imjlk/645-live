import { expect, test } from "bun:test";
import { createDrawStatisticsClient } from "./draw-statistics";

const rows = Array.from({ length: 45 }, (_, i) => ({
	number: i + 1,
	draw_count: [1, 2, 3, 4, 5, 6].includes(i + 1) ? 3 : 0,
	bonus_count: i === 6 ? 3 : 0,
	last_draw_round: i < 6 ? 3 : null,
}));
const requests: URL[] = [];
function transport(stale = false) {
	return (async (input: string | URL | Request, init?: RequestInit) => {
		const url = new URL(String(input));
		requests.push(url);
		expect(init?.credentials).toBe("omit");
		expect(url.searchParams.has("filter[round][$lte]")).toBe(false);
		return url.pathname.endsWith("lotto_number_stats")
			? Response.json({
					records: stale ? rows.map((r) => ({ ...r, draw_count: 0 })) : rows,
				})
			: Response.json({ total_count: 3, records: [{ round: 3 }] });
	}) as typeof fetch;
}
test("actual draw totals use lifetime aggregates, distinguish bonus and reuse one snapshot for all numbers", async () => {
	let now = 0;
	requests.length = 0;
	const client = createDrawStatisticsClient(
		"https://draws.invalid",
		transport(),
		() => now,
	);
	expect(await client.read(1)).toMatchObject({
		throughRound: 3,
		totalDraws: 3,
		mainCount: 3,
		bonusCount: 0,
		lastMainRound: 3,
		rank: 1,
	});
	expect(await client.read(7)).toMatchObject({
		mainCount: 0,
		bonusCount: 3,
		lastMainRound: null,
		rank: null,
	});
	expect(requests).toHaveLength(2);
	await client.read(1);
	expect(requests).toHaveLength(2);
	now = 300001;
	await client.read(7);
	expect(requests).toHaveLength(4);
	await client.read(7, undefined, true);
	expect(requests).toHaveLength(6);
});
test("invalid number entries never query and partial aggregates are not shown as current totals", async () => {
	requests.length = 0;
	const client = createDrawStatisticsClient(
		"https://draws.invalid",
		transport(),
	);
	for (const n of [0, 46, 1.5])
		await expect(client.read(n)).rejects.toThrow("번호");
	expect(requests).toHaveLength(0);
	// Make a self-consistent but outdated snapshot with the same latest-round metadata.
	const outdated = rows.map((r) => ({
		...r,
		draw_count: r.draw_count ? 2 : 0,
		bonus_count: r.bonus_count ? 2 : 0,
	}));
	const stale = createDrawStatisticsClient("https://draws.invalid", (async (
		input: string | URL | Request,
	) =>
		String(input).includes("lotto_number_stats")
			? Response.json({ records: outdated })
			: Response.json({
					total_count: 3,
					records: [{ round: 3 }],
				})) as typeof fetch);
	await expect(stale.read(1)).rejects.toThrow("갱신하고 있어요");
});
test("canceled snapshot reads cannot populate shared totals even when the transport ignores abort", async () => {
	const signals: AbortSignal[] = [],
		resolvers: { url: string; resolve: (r: Response) => void }[] = [];
	const client = createDrawStatisticsClient("https://draws.invalid", (async (
		input: string | URL | Request,
		init?: RequestInit,
	) => {
		signals.push(init?.signal as AbortSignal);
		return await new Promise<Response>((resolve) => {
			resolvers.push({ url: String(input), resolve });
		});
	}) as typeof fetch);
	const controller = new AbortController();
	const pending = client.read(1, controller.signal);
	controller.abort();
	for (const r of resolvers)
		r.resolve(
			r.url.includes("lotto_number_stats")
				? Response.json({ records: rows })
				: Response.json({ total_count: 3, records: [{ round: 3 }] }),
		);
	await expect(pending).rejects.toThrow("다시 시도");
	expect(signals).toHaveLength(2);
	expect(signals.every((s) => s.aborted)).toBe(true);
});
