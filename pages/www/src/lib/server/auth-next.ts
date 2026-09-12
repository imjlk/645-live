export function normalizeNextPath(input: string | null | undefined): string {
	const value = String(input ?? "").trim();
	if (
		!value ||
		!value.startsWith("/") ||
		value.startsWith("//") ||
		value.includes("\\") ||
		Array.from(value).some(
			(character) =>
				character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
		)
	) {
		return "/my";
	}

	return value;
}
