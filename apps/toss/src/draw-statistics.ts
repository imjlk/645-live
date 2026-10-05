import { initClient } from "trailbase";

export type DrawNumberStatistics = {
	number: number;
	throughRound: number;
	totalDraws: number;
	mainCount: number;
	bonusCount: number;
	lastMainRound: number | null;
	rank: number | null;
};
type Snapshot = {
	at: number;
	throughRound: number;
	totalDraws: number;
	numbers: {
		number: number;
		main: number;
		bonus: number;
		last: number | null;
	}[];
};
const integer = (value: unknown) => {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
		throw new Error("추첨 집계를 확인하지 못했어요.");
	return value;
};
/** Lifetime public draw totals, shared across all 45 numbers for five minutes. */
export function createDrawStatisticsClient(
	base: string,
	fetcher: typeof fetch = fetch,
	now = Date.now,
) {
	let cached: Snapshot | null = null;
	async function load(signal?: AbortSignal) {
		const controller = new AbortController();
		const cancel = () => controller.abort();
		signal?.addEventListener("abort", cancel);
		if (signal?.aborted) cancel();
		const timer = setTimeout(cancel, 12000);
		const client = initClient(base, {
			transport: {
				fetch: (path, init) =>
					fetcher(new URL(path, base), {
						...init,
						signal: controller.signal,
						credentials: "omit",
					}),
			},
		});
		try {
			const [meta, rows] = await Promise.all([
				client
					.records<Record<string, unknown>>("lotto_draw_results")
					.list({ order: ["-round"], pagination: { limit: 1 }, count: true }),
				client
					.records<Record<string, unknown>>("lotto_number_stats")
					.list({ order: ["number"], pagination: { limit: 45 } }),
			]);
			const throughRound = meta.records[0] ? integer(meta.records[0].round) : 0;
			const totalDraws = integer(meta.total_count);
			const numbers = rows.records.map((r) => ({
				number: integer(r.number),
				main: integer(r.draw_count),
				bonus: integer(r.bonus_count),
				last:
					r.last_draw_round === null || r.last_draw_round === undefined
						? null
						: integer(r.last_draw_round),
			}));
			if (
				numbers.length !== 45 ||
				new Set(numbers.map((n) => n.number)).size !== 45 ||
				totalDraws > throughRound ||
				numbers.some(
					(n) =>
						n.number < 1 ||
						n.number > 45 ||
						n.main + n.bonus > totalDraws ||
						(n.last !== null && (n.last < 1 || n.last > throughRound)) ||
						(n.main === 0) !== (n.last === null),
				)
			)
				throw new Error("잘못된 추첨 집계");
			if (
				numbers.reduce((s, n) => s + n.main, 0) !== totalDraws * 6 ||
				numbers.reduce((s, n) => s + n.bonus, 0) !== totalDraws
			)
				throw new Error("STALE_DRAW_TOTALS");
			if (controller.signal.aborted) throw new Error("조회 취소");
			const data = { at: now(), throughRound, totalDraws, numbers };
			cached = data;
			return data;
		} catch (error) {
			throw new Error(
				error instanceof Error && error.message === "STALE_DRAW_TOTALS"
					? "추첨 통계를 갱신하고 있어요. 잠시 후 새로 확인해 주세요."
					: "추첨 통계를 불러오지 못했어요. 다시 시도해 주세요.",
			);
		} finally {
			controller.abort();
			clearTimeout(timer);
			signal?.removeEventListener("abort", cancel);
		}
	}
	return {
		async read(
			number: number,
			signal?: AbortSignal,
			fresh = false,
		): Promise<DrawNumberStatistics> {
			if (!Number.isInteger(number) || number < 1 || number > 45)
				throw new Error("1~45 사이의 번호를 확인해 주세요.");
			if (signal?.aborted) throw new Error("조회 취소");
			const snapshot =
				!fresh && cached && now() - cached.at < 300000
					? cached
					: await load(signal);
			const item = snapshot.numbers.find((n) => n.number === number);
			if (!item) throw new Error("번호 집계를 확인하지 못했어요.");
			return {
				number,
				throughRound: snapshot.throughRound,
				totalDraws: snapshot.totalDraws,
				mainCount: item.main,
				bonusCount: item.bonus,
				lastMainRound: item.last,
				rank: item.main
					? snapshot.numbers.filter((n) => n.main > item.main).length + 1
					: null,
			};
		},
	};
}
