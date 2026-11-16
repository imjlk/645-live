import { expect, test } from "bun:test";
import { TrailBaseHttpError } from "@trailbase-apps-in-toss-kit/trailbase-client";
import { ConnectionRuntimeError, connectionStep } from "./connection-error";
import {
	RequestTimeoutError,
	recoverableCheckInError,
	requestErrorCode,
} from "./request-error";

test("wrapped browser network failures retain their classification without exposing messages", async () => {
	for (const message of [
		"Failed to fetch",
		"Load failed",
		"Network request failed",
	]) {
		const error = await connectionStep("C41", () => {
			throw new TypeError(message);
		}).catch((error: unknown) => error);
		expect(error).toBeInstanceOf(ConnectionRuntimeError);
		expect(requestErrorCode(error)).toBe("network");
		expect(recoverableCheckInError(error)).toBe(true);
	}
	expect(requestErrorCode(new RequestTimeoutError())).toBe("timeout");
	expect(recoverableCheckInError(new RequestTimeoutError())).toBe(true);
});

test("runtime, identity and policy failures are not retried or included in telemetry", () => {
	const runtime = new ConnectionRuntimeError(
		"C41",
		new TypeError("instance.fetch is not a function: private-token"),
	);
	expect(requestErrorCode(runtime)).toBe("connection_c41");
	expect(recoverableCheckInError(runtime)).toBe(false);
	const identity = new ConnectionRuntimeError(
		"C20",
		new TypeError("Failed to fetch"),
	);
	expect(requestErrorCode(identity)).toBe("connection_c20");
	expect(recoverableCheckInError(identity)).toBe(false);
	for (const [status, code] of [
		[401, "auth"],
		[403, "forbidden"],
		[409, "request_rejected"],
		[429, "rate_limited"],
		[503, "server"],
	] as const) {
		const error = new TrailBaseHttpError("private-user-key", {
			status,
			payload: { error: { code: "private-receipt" } },
		});
		expect(requestErrorCode(error)).toBe(code);
		expect(recoverableCheckInError(error)).toBe(status >= 500);
	}
	expect(requestErrorCode(new Error("private-receipt"))).toBe("request_failed");
});
