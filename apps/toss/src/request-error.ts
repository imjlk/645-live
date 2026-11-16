import { TrailBaseHttpError } from "@trailbase-apps-in-toss-kit/trailbase-client";
import { ConnectionRuntimeError } from "./connection-error";

export class RequestTimeoutError extends Error {
	constructor() {
		super("연결이 오래 걸리고 있어요. 다시 시도해 주세요.");
		this.name = "RequestTimeoutError";
	}
}

/** Fetch failures can be wrapped by the connection diagnostics. Do not retry SDK TypeErrors. */
export function isNetworkRequestError(error: unknown) {
	const cause =
		error instanceof ConnectionRuntimeError && error.step === "C41"
			? error.cause
			: error;
	return (
		cause instanceof TypeError &&
		/^(Failed to fetch|fetch failed|Load failed|Network request failed|NetworkError when attempting to fetch resource\.?)$/i.test(
			cause.message,
		)
	);
}

export function recoverableCheckInError(error: unknown) {
	return (
		isNetworkRequestError(error) ||
		error instanceof RequestTimeoutError ||
		(error instanceof TrailBaseHttpError && error.status >= 500)
	);
}

/** Fixed, identity-free diagnostics; never send an error message or server payload. */
export function requestErrorCode(error: unknown) {
	if (isNetworkRequestError(error)) return "network";
	if (error instanceof RequestTimeoutError) return "timeout";
	if (error instanceof ConnectionRuntimeError)
		return `connection_${error.step.toLowerCase()}`;
	if (error instanceof TrailBaseHttpError) {
		if (error.status === 401) return "auth";
		if (error.status === 403) return "forbidden";
		if (error.status === 429) return "rate_limited";
		if (error.status >= 500) return "server";
		return "request_rejected";
	}
	return "request_failed";
}
