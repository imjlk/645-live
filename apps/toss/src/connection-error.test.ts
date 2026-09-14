import { expect, test } from "bun:test";
import { TrailBaseHttpError } from "@trailbase-apps-in-toss-kit/trailbase-client";
import {
	ConnectionRuntimeError,
	connectionStep,
	connectionSync,
} from "./connection-error";

test("runtime diagnostics expose the failing step and positions without SDK payloads", async () => {
	const cause = new TypeError("undefined is not a function: secret-token");
	cause.stack =
		"TypeError: secret-token\n  at fetch (https://private.test/bundle.js:1:245)\nrestore@bundle.js:2:678\nprivate-user-key";
	const error = await connectionStep("C30", () =>
		connectionStep("C10", () => {
			throw cause;
		}),
	).catch((error: unknown) => error);
	expect(error).toBeInstanceOf(ConnectionRuntimeError);
	if (!(error instanceof ConnectionRuntimeError))
		throw new Error("Wrong error");
	expect(error.step).toBe("C10");
	expect(error.message).toContain("기기에 저장된 연결 정보");
	expect(error.message).toContain("1:245, 2:678");
	expect(error.message).not.toMatch(
		/secret-token|private\.test|private-user-key/,
	);
	expect(error.cause).toBe(cause);
});

test("auth failures retain their type and status so expired sessions can recover", async () => {
	const error = new TrailBaseHttpError("undefined is not a function", {
		status: 401,
	});
	await expect(connectionStep("C41", () => Promise.reject(error))).rejects.toBe(
		error,
	);
});

test("identity bridge wrapping keeps the original runtime failure step", async () => {
	const cause = new ConnectionRuntimeError("C20", new TypeError("SDK failure"));
	const error = new Error("Apps in Toss anonymous key request failed.", {
		cause,
	});
	await expect(connectionStep("C30", () => Promise.reject(error))).rejects.toBe(
		cause,
	);
});

test("a missing synchronous SDK method is attributed to client initialization", () => {
	expect(() =>
		connectionSync("C40", () => {
			throw new ReferenceError("SDK function is not defined");
		}),
	).toThrow("연결 코드 C40");
});
