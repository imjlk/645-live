import type { GenerationOptions } from "@645/lotto-core";

/** Explain contradictory choices before opening a server generation request. */
export function generationOptionsError(
	options: GenerationOptions,
): string | null {
	const { fixed, excluded, oddCount } = options;
	if (
		fixed.length > 6 ||
		excluded.length > 39 ||
		new Set([...fixed, ...excluded]).size !== fixed.length + excluded.length ||
		[...fixed, ...excluded].some(
			(n) => !Number.isInteger(n) || n < 1 || n > 45,
		) ||
		(oddCount !== null &&
			(!Number.isInteger(oddCount) || oddCount < 0 || oddCount > 6))
	)
		return "고정·제외 번호와 홀수 개수를 다시 확인해 주세요.";
	if (oddCount === null) return null;
	const fixedOdd = fixed.filter((n) => n % 2 === 1).length;
	const available = Array.from({ length: 45 }, (_, i) => i + 1).filter(
		(n) => !fixed.includes(n) && !excluded.includes(n),
	);
	const remaining = 6 - fixed.length;
	const availableOdd = available.filter((n) => n % 2 === 1).length;
	const minimum =
		fixedOdd + Math.max(0, remaining - (available.length - availableOdd));
	const maximum = fixedOdd + Math.min(remaining, availableOdd);
	if (oddCount >= minimum && oddCount <= maximum) return null;
	return minimum === maximum
		? `선택한 번호 조건에서는 홀수가 ${minimum}개여야 해요.`
		: `선택한 번호 조건에서는 홀수를 ${minimum}~${maximum}개로 골라 주세요.`;
}
