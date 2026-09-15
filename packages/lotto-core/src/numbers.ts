import type { LottoNumbers } from "./index";

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
