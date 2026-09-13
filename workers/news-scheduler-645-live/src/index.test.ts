import { describe, expect, mock, spyOn, test } from "bun:test";
import worker, { dispatchNews } from "./index";

const env = {
	GITHUB_ACTIONS_TOKEN: "test-github-token",
	NEWS_RUN_TOKEN: "test-operator-token",
};

describe("news dispatch", () => {
	test("only dispatches the main news workflow without forcing regeneration", async () => {
		const send = mock(async (_url: string, _init: RequestInit) =>
			Response.json({ workflow_run_id: 123 }),
		);
		expect(await dispatchNews(env, send)).toEqual({
			accepted: true,
			runId: 123,
		});
		const call = send.mock.calls[0];
		if (!call) throw new Error("Expected one GitHub request");
		const [url, init] = call;
		expect(url).toBe(
			"https://api.github.com/repos/imjlk/645-live/actions/workflows/news-content.yml/dispatches",
		);
		expect(init.method).toBe("POST");
		expect(init.redirect).toBe("manual");
		expect(init.signal).toBeInstanceOf(AbortSignal);
		expect(new Headers(init.headers).get("Authorization")).toBe(
			"Bearer test-github-token",
		);
		expect(JSON.parse(String(init.body))).toEqual({
			ref: "main",
			inputs: { lookback_rounds: "10", force: "false", use_ai: "true" },
		});
	});

	test("supports older 204 receipts", async () => {
		expect(
			await dispatchNews(env, async () => new Response(null, { status: 204 })),
		).toEqual({ accepted: true, runId: null });
	});

	test("redirect responses fail without issuing another request", async () => {
		for (const status of [301, 302, 303, 307, 308]) {
			const send = mock(
				async () =>
					new Response(null, {
						status,
						headers: { Location: "https://redirect.example/dispatch" },
					}),
			);
			await expect(dispatchNews(env, send)).rejects.toThrow(`HTTP ${status}`);
			expect(send).toHaveBeenCalledTimes(1);
		}
	});

	test("missing credentials and rejected requests fail without retrying", async () => {
		const send = mock(async () => new Response("denied", { status: 403 }));
		await expect(
			dispatchNews({ GITHUB_ACTIONS_TOKEN: "" }, send),
		).rejects.toThrow("not configured");
		expect(send).not.toHaveBeenCalled();
		await expect(dispatchNews(env, send)).rejects.toThrow("HTTP 403");
		expect(send).toHaveBeenCalledTimes(1);
	});

	test("an ambiguous network error does not trigger a duplicate POST", async () => {
		const send = mock(async () => {
			throw new TypeError("connection lost");
		});
		await expect(dispatchNews(env, send)).rejects.toThrow("connection lost");
		expect(send).toHaveBeenCalledTimes(1);
	});

	test("an accepted run stays accepted even if its receipt is malformed or oversized", async () => {
		for (const body of ["invalid JSON", "x".repeat(16_385)]) {
			const send = mock(async () => new Response(body, { status: 200 }));
			expect(await dispatchNews(env, send)).toEqual({
				accepted: true,
				runId: null,
			});
			expect(send).toHaveBeenCalledTimes(1);
		}
	});

	test("public requests cannot trigger news generation", async () => {
		for (const token of ["", "wrong", "test-operator-tokeX"]) {
			const request = new Request("https://scheduler/run", {
				method: "POST",
				headers: { Authorization: token ? `Bearer ${token}` : "" },
			});
			expect((await worker.fetch(request, env)).status).toBe(401);
		}
		expect(
			(await worker.fetch(new Request("https://scheduler/run"), env)).status,
		).toBe(405);
	});

	test("health reports missing setup without exposing secrets", async () => {
		const response = await worker.fetch(
			new Request("https://scheduler/health"),
			{ ...env, GITHUB_ACTIONS_TOKEN: "" },
		);
		expect(response.status).toBe(503);
		expect(await response.json<{ service: string; ready: boolean }>()).toEqual({
			service: "news-scheduler-645-live",
			ready: false,
		});
	});

	test("authenticated operators can dispatch, but cannot override branch or force regeneration", async () => {
		const send = spyOn(globalThis, "fetch").mockResolvedValue(
			Response.json({ workflow_run_id: 456 }),
		);
		try {
			const request = new Request("https://scheduler/run", {
				method: "POST",
				headers: { Authorization: "Bearer test-operator-token" },
				body: JSON.stringify({ ref: "other-branch", force: "true" }),
			});
			const response = await worker.fetch(request, env);
			expect(response.status).toBe(202);
			expect(
				await response.json<{ accepted: boolean; runId: number }>(),
			).toEqual({ accepted: true, runId: 456 });
			expect(send).toHaveBeenCalledTimes(1);
			const requestBody = send.mock.calls[0]?.[1]?.body;
			expect(JSON.parse(String(requestBody))).toEqual({
				ref: "main",
				inputs: { lookback_rounds: "10", force: "false", use_ai: "true" },
			});
		} finally {
			send.mockRestore();
		}
	});
});
