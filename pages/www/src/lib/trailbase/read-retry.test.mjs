import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { test } from "node:test";
import { initClient } from "trailbase";
import { retryPublicRead, withBuildReadRetries } from "./read-retry.js";

const quick = { initialDelayMs: 1, maxAttempts: 3 };

test("a backend restart can return 502 and 503 before the complete JSON arrives", async () => {
	let calls = 0;
	const response = await retryPublicRead(async () => {
		calls++;
		return calls < 3
			? new Response("restarting", { status: calls === 1 ? 502 : 503 })
			: Response.json({ records: [{ round: 1241 }] });
	}, quick);
	assert.equal(calls, 3);
	assert.deepEqual(await response.json(), { records: [{ round: 1241 }] });
});

test("connection resets, including an interrupted response body, are retried", async () => {
	let calls = 0;
	const reset = Object.assign(new Error("socket reset"), {
		code: "ECONNRESET",
	});
	const response = await retryPublicRead(async () => {
		calls++;
		if (calls === 1) throw new TypeError("fetch failed", { cause: reset });
		if (calls === 2)
			return new Response(
				new ReadableStream({
					start(controller) {
						controller.error(reset);
					},
				}),
			);
		return Response.json({ complete: true });
	}, quick);
	assert.equal(calls, 3);
	assert.deepEqual(await response.json(), { complete: true });
});

test("persistent gateway failure remains a failure after the retry limit", async () => {
	let calls = 0;
	await assert.rejects(
		retryPublicRead(async () => {
			calls++;
			return new Response("unavailable", { status: 504 });
		}, quick),
		{ status: 504 },
	);
	assert.equal(calls, 3);
});

test("HTTP data/auth errors and programming errors are not retried", async () => {
	for (const status of [400, 401, 403, 404, 500]) {
		let calls = 0;
		const response = await retryPublicRead(async () => {
			calls++;
			return new Response("permanent error", { status });
		}, quick);
		assert.equal(response.status, status);
		assert.equal(calls, 1);
	}
	let calls = 0;
	await assert.rejects(
		retryPublicRead(async () => {
			calls++;
			throw new TypeError("Invalid URL");
		}, quick),
		/Invalid URL/,
	);
	assert.equal(calls, 1);
});

test("malformed JSON is still rejected by the caller", async () => {
	let calls = 0;
	const response = await retryPublicRead(async () => {
		calls++;
		return new Response("{incomplete");
	}, quick);
	await assert.rejects(response.json(), SyntaxError);
	assert.equal(calls, 1);
});

const untilAborted = (signal) =>
	new Promise((_, reject) => {
		signal.throwIfAborted();
		signal.addEventListener("abort", () => reject(signal.reason), {
			once: true,
		});
	});

test("an attempt times out and retries with a fresh signal", async () => {
	let calls = 0;
	const response = await retryPublicRead(
		async (signal) => {
			calls++;
			return calls === 1 ? untilAborted(signal) : Response.json({ ok: true });
		},
		{ ...quick, attemptTimeoutMs: 10 },
	);
	assert.equal(calls, 2);
	assert.equal(response.status, 200);
});

test("the retry budget aborts a hung request and also bounds backoff", async () => {
	await assert.rejects(
		retryPublicRead(untilAborted, {
			...quick,
			budgetMs: 15,
			attemptTimeoutMs: 1_000,
		}),
		{ name: "TimeoutError" },
	);
	let calls = 0;
	await assert.rejects(
		retryPublicRead(
			async () => {
				calls++;
				return new Response(null, { status: 503 });
			},
			{ ...quick, initialDelayMs: 1_000, budgetMs: 15 },
		),
		{ name: "TimeoutError" },
	);
	assert.equal(calls, 1);
});

test("caller cancellation stops the request without retrying", async () => {
	const controller = new AbortController();
	let calls = 0;
	const result = retryPublicRead(
		async (signal) => {
			calls++;
			controller.abort(new Error("build cancelled"));
			return untilAborted(signal);
		},
		{ ...quick, signal: controller.signal },
	);
	await assert.rejects(result, /build cancelled/);
	assert.equal(calls, 1);
});

test("real TrailBase SDK retries public records without retrying writes, auth or SSE", async (t) => {
	const calls = new Map();
	const server = createServer((request, response) => {
		const key = `${request.method} ${request.url}`;
		const count = (calls.get(key) ?? 0) + 1;
		calls.set(key, count);
		if (
			request.url?.startsWith("/api/records/v1/lotto_draw_results?") &&
			count === 2
		) {
			response.writeHead(200, { "Content-Type": "application/json" });
			response.end(JSON.stringify({ records: [{ round: 1241 }] }));
		} else {
			response.writeHead(503);
			response.end("restarting");
		}
	});
	server.listen(0, "127.0.0.1");
	await once(server, "listening");
	t.after(() => new Promise((resolve) => server.close(resolve)));
	const client = withBuildReadRetries(
		initClient(`http://127.0.0.1:${server.address().port}`),
		{
			...quick,
			onRetry: () => {},
		},
	);
	assert.deepEqual(
		(await client.records("lotto_draw_results").list()).records,
		[{ round: 1241 }],
	);
	await assert.rejects(
		client.records("lotto_draw_results").create({ round: 1 }),
		{ status: 503 },
	);
	await assert.rejects(client.records("lotto_draw_results").subscribeAll(), {
		status: 503,
	});
	await assert.rejects(client.fetch("/api/auth/v1/status"), { status: 503 });
	await assert.rejects(client.records("miniapp_profiles").list(), {
		status: 503,
	});
	for (const [key, count] of calls) {
		assert.equal(
			count,
			key.startsWith("GET /api/records/v1/lotto_draw_results?") ? 2 : 1,
			key,
		);
	}
});
