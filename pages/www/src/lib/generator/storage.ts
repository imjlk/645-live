import { type Generation, parseNumbers } from "@645/lotto-core";
import type { Batch } from "./api";
export const CURRENT_KEY = "645:generator:current:v1";
export const SAVED_KEY = "645:generator:saved:v1";
export const PENDING_KEY = "645:generator:pending:v1";
export function parseGenerations(raw: string | null): Generation[] {
	if (!raw) return [];
	const value: unknown = JSON.parse(raw);
	if (!Array.isArray(value))
		throw new Error(
			"저장된 번호를 읽지 못했어요. 기존 데이터를 보호하기 위해 저장을 멈췄어요.",
		);
	return value.map((item) => {
		const numbers = parseNumbers(item?.numbers);
		if (
			!numbers ||
			!Number.isSafeInteger(item.id) ||
			item.id < 1 ||
			!Number.isSafeInteger(item.round) ||
			item.round < 1 ||
			typeof item.displayName !== "string" ||
			!Number.isFinite(item.createdAt)
		)
			throw new Error("저장된 번호가 손상됐어요. 기존 데이터는 유지됩니다.");
		return {
			id: item.id,
			round: item.round,
			displayName: item.displayName,
			createdAt: item.createdAt,
			numbers,
		};
	});
}
export function parseBatch(raw: string | null): Batch | null {
	if (!raw) return null;
	const value = JSON.parse(raw);
	if (
		typeof value?.requestId !== "string" ||
		!/^[A-Za-z0-9-]{16,80}$/.test(value?.requestId) ||
		!Number.isSafeInteger(value.round) ||
		value.round < 1 ||
		!Array.isArray(value.games) ||
		value.games.length < 1 ||
		value.games.length > 100 ||
		value.games.some((g: unknown) => !parseNumbers(g))
	)
		throw new Error(
			"이전 생성 요청을 읽지 못했어요. 기존 데이터는 유지됩니다.",
		);
	return value;
}
