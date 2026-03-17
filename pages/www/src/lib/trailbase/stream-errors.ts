function getErrorText(error: unknown): string {
	if (error instanceof Error) {
		return error.message.toLowerCase();
	}

	return String(error).toLowerCase();
}

export function isExpectedStreamShutdownError(error: unknown): boolean {
	const message = getErrorText(error);

	return (
		message.includes("abort") ||
		message.includes("aborted") ||
		message.includes("network error") ||
		message.includes("body stream") ||
		message.includes("invalid state") ||
		message.includes("reader")
	);
}

export function isPageHidden(): boolean {
	return (
		typeof document !== "undefined" && document.visibilityState === "hidden"
	);
}

export function shouldSuppressStreamError(
	error: unknown,
	intentionallyStopping: boolean,
): boolean {
	if (intentionallyStopping) {
		return true;
	}

	return isPageHidden() && isExpectedStreamShutdownError(error);
}

export function shouldSuppressDisconnectError(error: unknown): boolean {
	return isExpectedStreamShutdownError(error) || isPageHidden();
}
