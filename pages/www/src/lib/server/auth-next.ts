export function normalizeNextPath(input: string | null | undefined): string {
	const value = String(input ?? "").trim();
	if (!value || !value.startsWith("/") || value.startsWith("//")) {
		return "/my";
	}

	return value;
}
