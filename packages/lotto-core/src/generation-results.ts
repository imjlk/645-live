import type { Draw } from "./index";
import { parseNumbers } from "./numbers";

export type GenerationResultStatus =
	| "open"
	| "waiting"
	| "processing"
	| "ready"
	| "unavailable";
export type GenerationResult = {
	round: number;
	totalGenerations: number;
	status: GenerationResultStatus;
	/** Non-winning, then ranks 1 through 5. Null means unknown, never zero wins. */
	rankCounts: [number, number, number, number, number, number] | null;
	comparedGenerations: number;
	closesAt: number;
	draw: Draw | null;
	updatedAt: number;
};
export type GenerationResultsPage = {
	rounds: GenerationResult[];
	nextBeforeRound: number | null;
	currentRound: number;
	serverTime: number;
};
export const GENERATION_RANKS = [
	{ rank: 1, label: "1등", condition: "6개 일치" },
	{ rank: 2, label: "2등", condition: "5개 + 보너스 일치" },
	{ rank: 3, label: "3등", condition: "5개 일치" },
	{ rank: 4, label: "4등", condition: "4개 일치" },
	{ rank: 5, label: "5등", condition: "3개 일치" },
] as const;
export const GENERATION_RESULTS_SCOPE =
	"공개 생성 조합을 추첨 번호와 비교한 통계예요. 실제 구매나 당첨금 수령 내역은 아니에요.";
export const GENERATION_RESULTS_COUNTING =
	"마감 때 공개된 조합을 기준으로, 같은 번호도 생성된 건수만큼 집계해요.";
export function generationResultDate(result: GenerationResult) {
	const date =
		result.draw?.drawDate ??
		new Date(result.closesAt + 9 * 3_600_000).toISOString().slice(0, 10);
	const [year, month, day] = date.split("-");
	return `${year}.${Number(month)}.${Number(day)}`;
}
export function generationResultStatus(result: GenerationResult) {
	switch (result.status) {
		case "open":
			return {
				label: "생성 집계 중",
				description:
					"이번 회차의 번호가 모이고 있어요. 추첨 후 일치 결과를 확인할 수 있어요.",
			};
		case "waiting":
			return {
				label: "추첨 결과 대기",
				description:
					"생성 기록을 보관했어요. 추첨 결과가 확인되면 자동으로 비교해요.",
			};
		case "processing":
			return {
				label: "결과 비교 중",
				description:
					"추첨 번호와 조합을 비교하고 있어요. 집계가 끝나면 결과가 표시돼요.",
			};
		case "unavailable":
			return {
				label: "비교 통계 없음",
				description: "이 회차는 비교할 수 있는 생성 기록이 남아 있지 않아요.",
			};
		case "ready":
			return {
				label: "비교 완료",
				description: "마감 때 모인 공개 조합의 번호 일치 결과예요.",
			};
	}
}
export function winningGenerations(result: GenerationResult): number | null {
	return result.rankCounts?.slice(1).reduce((sum, n) => sum + n, 0) ?? null;
}

function object(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === "object" && !Array.isArray(value);
}
function integer(value: unknown): value is number {
	return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
export function parseGenerationResults(value: unknown): GenerationResultsPage {
	const invalid = () =>
		new Error("결과 통계를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.");
	if (
		!object(value) ||
		!integer(value.currentRound) ||
		value.currentRound < 1 ||
		!integer(value.serverTime) ||
		!Array.isArray(value.rounds) ||
		value.rounds.length > 100 ||
		!(
			value.nextBeforeRound === null ||
			(integer(value.nextBeforeRound) && value.nextBeforeRound > 0)
		)
	)
		throw invalid();
	let previous = Infinity;
	for (const row of value.rounds) {
		if (
			!object(row) ||
			!integer(row.round) ||
			row.round < 1 ||
			row.round > value.currentRound ||
			row.round >= previous ||
			!integer(row.totalGenerations) ||
			!integer(row.comparedGenerations) ||
			row.comparedGenerations > row.totalGenerations ||
			!integer(row.closesAt) ||
			!integer(row.updatedAt) ||
			!["open", "waiting", "processing", "ready", "unavailable"].includes(
				String(row.status),
			)
		)
			throw invalid();
		previous = row.round;
		if (row.draw !== null) {
			if (
				!object(row.draw) ||
				row.draw.round !== row.round ||
				!parseNumbers(row.draw.numbers) ||
				!integer(row.draw.bonus) ||
				row.draw.bonus < 1 ||
				row.draw.bonus > 45 ||
				(row.draw.numbers as number[]).includes(row.draw.bonus) ||
				typeof row.draw.drawDate !== "string" ||
				!/^\d{4}-\d{2}-\d{2}$/.test(row.draw.drawDate)
			)
				throw invalid();
		}
		if (row.status === "ready") {
			if (
				!row.draw ||
				!Array.isArray(row.rankCounts) ||
				row.rankCounts.length !== 6 ||
				!row.rankCounts.every(integer) ||
				row.rankCounts.reduce((a: number, b: number) => a + b, 0) !==
					row.totalGenerations ||
				row.comparedGenerations !== row.totalGenerations
			)
				throw invalid();
		} else if (row.rankCounts !== null) throw invalid();
	}
	if (
		value.nextBeforeRound !== null &&
		(!value.rounds.length || value.nextBeforeRound !== previous)
	)
		throw invalid();
	return value as unknown as GenerationResultsPage;
}
export async function fetchGenerationResults(
	base: string,
	query: { round?: number; before?: number } = {},
	signal?: AbortSignal,
) {
	const key =
		query.round !== undefined
			? "round"
			: query.before !== undefined
				? "before"
				: null;
	const number = key ? query[key] : undefined;
	if (number !== undefined && (!integer(number) || number < 1))
		throw new Error("조회할 회차를 확인해 주세요.");
	const controller = new AbortController();
	const abort = () => controller.abort();
	if (signal?.aborted) abort();
	signal?.addEventListener("abort", abort, { once: true });
	const timer = setTimeout(abort, 15000);
	try {
		const response = await fetch(
			`${base.replace(/\/$/, "")}/api/app/v1/lotto/generation-results${key ? `?${key}=${number}` : ""}`,
			{ signal: controller.signal, credentials: "omit" },
		);
		if (!response.ok) throw new Error("Request failed");
		return parseGenerationResults(await response.json());
	} catch {
		throw new Error(
			"결과 통계를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.",
		);
	} finally {
		clearTimeout(timer);
		signal?.removeEventListener("abort", abort);
	}
}

export type GenerationResultHistory = {
	rounds: GenerationResult[];
	selectedRound: number | null;
	nextBeforeRound: number | null;
	loading: boolean;
	loadingMore: boolean;
	error: string | null;
};
type Loader = (
	query: { round?: number; before?: number },
	signal: AbortSignal,
) => Promise<GenerationResultsPage>;
export function createGenerationResultHistory(
	load: Loader,
	initial: GenerationResultsPage | null = null,
) {
	let state: GenerationResultHistory = {
		rounds: initial?.rounds ?? [],
		selectedRound:
			initial?.rounds.find((r) => r.status !== "open")?.round ??
			initial?.rounds[0]?.round ??
			null,
		nextBeforeRound: initial?.nextBeforeRound ?? null,
		loading: false,
		loadingMore: false,
		error: null,
	};
	const listeners = new Set<() => void>();
	let hasHistory = initial !== null;
	let epoch = 0;
	const controllers = new Set<AbortController>();
	function update(patch: Partial<GenerationResultHistory>) {
		state = { ...state, ...patch };
		for (const listener of listeners) listener();
	}
	function merge(rows: GenerationResult[]) {
		const all = new Map(state.rounds.map((r) => [r.round, r]));
		for (const row of rows) all.set(row.round, row);
		return [...all.values()].sort((a, b) => b.round - a.round);
	}
	async function request(more = false) {
		if (
			more &&
			(state.loading || state.loadingMore || state.nextBeforeRound === null)
		)
			return;
		if (!more) {
			epoch++;
			for (const controller of controllers) controller.abort();
			controllers.clear();
		}
		const current = epoch;
		const controller = new AbortController();
		controllers.add(controller);
		const cursor = state.nextBeforeRound;
		update(
			more
				? { loadingMore: true, error: null }
				: { loading: true, loadingMore: false, error: null },
		);
		try {
			const page = await load(
				more ? { before: cursor ?? undefined } : {},
				controller.signal,
			);
			if (current !== epoch || controller.signal.aborted) return;
			if (
				more &&
				(page.rounds.some((r) => r.round >= (cursor ?? Infinity)) ||
					(page.nextBeforeRound !== null &&
						page.nextBeforeRound >= (cursor ?? Infinity)))
			)
				throw new Error("이전 회차를 다시 불러와 주세요.");
			const rounds = merge(page.rounds);
			const selectedRound =
				state.selectedRound ??
				rounds.find((r) => r.status !== "open")?.round ??
				rounds[0]?.round ??
				null;
			const nextBeforeRound =
				!more && hasHistory && page.nextBeforeRound !== null
					? state.nextBeforeRound === null
						? null
						: Math.min(page.nextBeforeRound, state.nextBeforeRound)
					: page.nextBeforeRound;
			hasHistory = true;
			update({ rounds, selectedRound, nextBeforeRound });
			if (
				!more &&
				selectedRound !== null &&
				!page.rounds.some((r) => r.round === selectedRound)
			) {
				const selected = await load(
					{ round: selectedRound },
					controller.signal,
				);
				if (current === epoch && !controller.signal.aborted)
					update({ rounds: merge(selected.rounds) });
			}
		} catch (error) {
			if (current === epoch && !controller.signal.aborted)
				update({
					error:
						error instanceof Error
							? error.message
							: "통계를 다시 불러와 주세요.",
				});
		} finally {
			controllers.delete(controller);
			if (current === epoch)
				update(more ? { loadingMore: false } : { loading: false });
		}
	}
	return {
		getSnapshot: () => state,
		subscribe(listener: () => void) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		select(round: number) {
			if (state.rounds.some((r) => r.round === round))
				update({ selectedRound: round });
		},
		refresh: () => request(),
		more: () => request(true),
		stop() {
			epoch++;
			for (const controller of controllers) controller.abort();
			controllers.clear();
			update({ loading: false, loadingMore: false });
		},
	};
}
