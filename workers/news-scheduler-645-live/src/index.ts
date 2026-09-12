import { timingSafeEqual } from "node:crypto";

const WORKFLOW_URL =
	"https://api.github.com/repos/imjlk/645-live/actions/workflows/news-content.yml/dispatches";
type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

async function readSmallJson(response: Response): Promise<unknown> {
	if (!response.body) return null;
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let size = 0;
	let text = "";
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > 16_384) {
				await reader.cancel();
				throw new Error("GitHub response exceeds size limit");
			}
			text += decoder.decode(value, { stream: true });
		}
		return JSON.parse(text + decoder.decode());
	} finally {
		reader.releaseLock();
	}
}

export async function dispatchNews(
	env: Pick<Env, "GITHUB_ACTIONS_TOKEN">,
	fetcher: Fetcher = fetch,
) {
	if (!env.GITHUB_ACTIONS_TOKEN) {
		throw new Error("GITHUB_ACTIONS_TOKEN is not configured");
	}
	// Do not retry an ambiguous POST: GitHub may already have accepted the run.
	// The backup cron and FORCE=false in the workflow make later runs safe.
	const response = await fetcher(WORKFLOW_URL, {
		method: "POST",
		redirect: "error",
		signal: AbortSignal.timeout(15_000),
		headers: {
			Authorization: `Bearer ${env.GITHUB_ACTIONS_TOKEN}`,
			Accept: "application/vnd.github+json",
			"Content-Type": "application/json",
			"X-GitHub-Api-Version": "2026-03-10",
			"User-Agent": "645-live-news-scheduler",
		},
		body: JSON.stringify({
			ref: "main",
			inputs: { lookback_rounds: "10", force: "false", use_ai: "true" },
		}),
	});
	if (response.status !== 200 && response.status !== 204) {
		await response.body?.cancel();
		throw new Error(`GitHub rejected news dispatch (HTTP ${response.status})`);
	}
	let runId: number | null = null;
	if (response.status === 200) {
		try {
			const result = await readSmallJson(response);
			if (
				result &&
				typeof result === "object" &&
				"workflow_run_id" in result &&
				typeof result.workflow_run_id === "number" &&
				Number.isSafeInteger(result.workflow_run_id) &&
				result.workflow_run_id > 0
			)
				runId = result.workflow_run_id;
		} catch {
			// A malformed receipt does not undo an accepted dispatch.
			console.warn(
				JSON.stringify({ event: "news_dispatch_receipt_unavailable" }),
			);
		}
	}
	console.info(JSON.stringify({ event: "news_dispatched", runId }));
	return { accepted: true, runId };
}

function authorized(request: Request, secret: string) {
	if (!secret) return false;
	const encoder = new TextEncoder();
	const expected = encoder.encode(`Bearer ${secret}`);
	const supplied = encoder.encode(request.headers.get("Authorization") || "");
	return (
		expected.length === supplied.length && timingSafeEqual(expected, supplied)
	);
}

export default {
	async scheduled(_controller, env) {
		await dispatchNews(env);
	},
	async fetch(request: Request, env: Env) {
		const pathname = new URL(request.url).pathname;
		if (pathname === "/health" && request.method === "GET") {
			const ready = Boolean(env.GITHUB_ACTIONS_TOKEN && env.NEWS_RUN_TOKEN);
			return Response.json(
				{ service: "news-scheduler-645-live", ready },
				{
					status: ready ? 200 : 503,
					headers: { "Cache-Control": "no-store" },
				},
			);
		}
		if (pathname !== "/run") return new Response("Not found", { status: 404 });
		if (request.method !== "POST")
			return new Response("Method not allowed", {
				status: 405,
				headers: { Allow: "POST" },
			});
		if (!authorized(request, env.NEWS_RUN_TOKEN))
			return new Response("Unauthorized", { status: 401 });
		try {
			return Response.json(await dispatchNews(env), {
				status: 202,
				headers: { "Cache-Control": "no-store" },
			});
		} catch {
			console.error(JSON.stringify({ event: "news_manual_dispatch_failed" }));
			return Response.json({ error: "News dispatch failed" }, { status: 502 });
		}
	},
} satisfies ExportedHandler<Env>;
