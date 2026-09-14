export {
	type BatchTimer,
	createLiveBatch,
	LIVE_BATCH_MS,
	LIVE_COUNT_MOTION_MS,
} from "./live-batch";

export const BALL_COLORS = [
	"#D9A300",
	"#3182F6",
	"#F04452",
	"#6B7684",
	"#209966",
] as const;
export type LottoNumbers = [number, number, number, number, number, number];
export type Generation = {
	id: number;
	round: number;
	numbers: LottoNumbers;
	displayName: string;
	createdAt: number;
};
export type Draw = {
	round: number;
	numbers: LottoNumbers;
	bonus: number;
	drawDate: string;
};
export type SavedCombination = {
	version: 1;
	id: string;
	generationId: number;
	round: number;
	numbers: LottoNumbers;
	savedAt: number;
	celebratedResult?: string;
};
export type RoundContext = {
	serverTime: number;
	targetRound: number;
	closesAt: number;
	drawsAt: number;
	latestDraw: Draw | null;
};
export type Feed = {
	round: number;
	generations: Generation[];
	/** Missing on older API deployments; null marks the last page. */
	nextCursor?: string | null;
	totalGenerations: number;
	numberCounts: number[];
	activeUsers: number;
	serverTime: number;
};
export type GenerationOptions = {
	fixed: number[];
	excluded: number[];
	oddCount: number | null;
};
export const EMPTY_OPTIONS: GenerationOptions = {
	fixed: [],
	excluded: [],
	oddCount: null,
};

export function parseNumbers(value: unknown): LottoNumbers | null {
	if (
		!Array.isArray(value) ||
		value.length !== 6 ||
		value.some((n) => !Number.isInteger(n) || n < 1 || n > 45) ||
		new Set(value).size !== 6
	)
		return null;
	return [...value].sort((a, b) => a - b) as LottoNumbers;
}

export function ballColor(number: number): string {
	return BALL_COLORS[Math.min(4, Math.max(0, Math.floor((number - 1) / 10)))];
}

export function compareDraw(numbers: LottoNumbers, draw: Draw) {
	const matches = numbers.filter((n) => draw.numbers.includes(n));
	const bonus = numbers.includes(draw.bonus);
	const rank =
		matches.length === 6
			? 1
			: matches.length === 5
				? bonus
					? 2
					: 3
				: matches.length === 4
					? 4
					: matches.length === 3
						? 5
						: null;
	return { matches, bonus, rank };
}

export function resultFingerprint(draw: Draw): string {
	return `${draw.round}:${[...draw.numbers].sort((a, b) => a - b).join(",")}:${draw.bonus}`;
}

export function describeCombination(
	numbers: LottoNumbers,
	others: LottoNumbers[] = [],
) {
	const sections = Array.from(
		{ length: 5 },
		(_, i) =>
			numbers.filter((n) => Math.min(4, Math.floor((n - 1) / 10)) === i).length,
	);
	return {
		sum: numbers.reduce((a, b) => a + b, 0),
		odd: numbers.filter((n) => n % 2).length,
		sections,
		consecutive: numbers.slice(1).filter((n, i) => n - numbers[i] === 1).length,
		maxOverlap: Math.max(
			0,
			...others.map((other) => other.filter((n) => numbers.includes(n)).length),
		),
	};
}

export function mergeFeed(
	current: Generation[],
	incoming: Generation[],
	limit = 30,
): Generation[] {
	const byId = new Map(current.map((item) => [item.id, item]));
	for (const item of incoming) byId.set(item.id, item);
	return [...byId.values()].sort((a, b) => b.id - a.id).slice(0, limit);
}

export function normalizeSaved(value: unknown): SavedCombination[] {
	if (!Array.isArray(value))
		throw new Error(
			"보관함 형식을 확인하지 못했어요. 기존 데이터를 보호하기 위해 저장을 멈췄어요.",
		);
	return value.map((item) => {
		if (!item || typeof item !== "object")
			throw new Error("보관함 데이터가 손상됐어요.");
		const v = item as Record<string, unknown>;
		const numbers = parseNumbers(v.numbers);
		if (
			v.version !== 1 ||
			typeof v.id !== "string" ||
			!Number.isInteger(v.generationId) ||
			Number(v.generationId) < 1 ||
			!Number.isInteger(v.round) ||
			Number(v.round) < 1 ||
			!numbers ||
			typeof v.savedAt !== "number" ||
			!Number.isFinite(v.savedAt) ||
			(v.celebratedResult !== undefined &&
				typeof v.celebratedResult !== "string")
		)
			throw new Error("보관함을 읽지 못했어요. 기존 데이터는 유지돼요.");
		return {
			version: 1,
			id: v.id,
			generationId: Number(v.generationId),
			round: Number(v.round),
			numbers,
			savedAt: v.savedAt,
			celebratedResult: v.celebratedResult as string | undefined,
		};
	});
}

export type CombinationReport = {
	historical: (Draw & { matches: number })[];
	frequencies: {
		number: number;
		drawCount: number;
		lastRound: number | null;
	}[];
};
