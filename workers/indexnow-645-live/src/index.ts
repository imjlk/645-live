import type { RelaySettlement } from "./coordinator";

export { IndexNowCoordinator } from "./coordinator";

const COORDINATOR_ID = "indexnow-global";

function coordinator(env: Env) {
	const id = env.INDEXNOW_COORDINATOR.idFromName(COORDINATOR_ID);
	return env.INDEXNOW_COORDINATOR.get(id);
}

async function fixedTimeEqual(left: string, right: string): Promise<boolean> {
	const encoder = new TextEncoder();
	const [leftHash, rightHash] = await Promise.all([
		crypto.subtle.digest("SHA-256", encoder.encode(left)),
		crypto.subtle.digest("SHA-256", encoder.encode(right)),
	]);
	const leftBytes = new Uint8Array(leftHash);
	const rightBytes = new Uint8Array(rightHash);
	let difference = 0;
	for (let index = 0; index < leftBytes.length; index += 1) {
		difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
	}
	return difference === 0;
}

async function isAuthorized(request: Request, env: Env): Promise<boolean> {
	if (!env.INDEXNOW_RUN_TOKEN) return false;
	const authorization = request.headers.get("authorization") ?? "";
	const prefix = "Bearer ";
	const provided = authorization.startsWith(prefix)
		? authorization.slice(prefix.length)
		: "";
	return fixedTimeEqual(provided, env.INDEXNOW_RUN_TOKEN);
}

async function parseRelaySettlement(
	request: Request,
): Promise<RelaySettlement> {
	const contentLength = Number(request.headers.get("content-length") ?? 0);
	if (contentLength > 2_048) throw new Error("INDEXNOW_RELAY_BODY_TOO_LARGE");
	const value: unknown = await request.json();
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error("INDEXNOW_RELAY_BODY_INVALID");
	}
	const record = value as Record<string, unknown>;
	return {
		claimId: typeof record.claimId === "string" ? record.claimId : "",
		retryAfter:
			typeof record.retryAfter === "string" ? record.retryAfter : undefined,
		status: typeof record.status === "number" ? record.status : 0,
	};
}

export default {
	async fetch(request, env): Promise<Response> {
		const url = new URL(request.url);
		if (request.method === "GET" && url.pathname === "/health") {
			return Response.json(await coordinator(env).status(), {
				headers: { "cache-control": "no-store" },
			});
		}
		if (request.method === "POST" && url.pathname === "/run") {
			if (!(await isAuthorized(request, env))) {
				return new Response("Not Found", { status: 404 });
			}
			try {
				return Response.json(await coordinator(env).run("manual"), {
					headers: { "cache-control": "no-store" },
				});
			} catch (error) {
				console.error({
					error: error instanceof Error ? error.message : "INDEXNOW_RUN_FAILED",
					event: "indexnow.manual_run_failed",
				});
				return Response.json({ error: "IndexNow run failed" }, { status: 502 });
			}
		}
		if (request.method === "POST" && url.pathname === "/relay/claim") {
			if (!(await isAuthorized(request, env))) {
				return new Response("Not Found", { status: 404 });
			}
			try {
				return Response.json(await coordinator(env).claimRelay(), {
					headers: { "cache-control": "no-store" },
				});
			} catch (error) {
				console.error({
					error:
						error instanceof Error
							? error.message
							: "INDEXNOW_RELAY_CLAIM_FAILED",
					event: "indexnow.relay_claim_failed",
				});
				return Response.json(
					{ error: "IndexNow relay claim failed" },
					{ status: 502 },
				);
			}
		}
		if (request.method === "POST" && url.pathname === "/relay/settle") {
			if (!(await isAuthorized(request, env))) {
				return new Response("Not Found", { status: 404 });
			}
			try {
				const settlement = await parseRelaySettlement(request);
				return Response.json(await coordinator(env).settleRelay(settlement), {
					headers: { "cache-control": "no-store" },
				});
			} catch (error) {
				const code =
					error instanceof Error
						? error.message
						: "INDEXNOW_RELAY_SETTLE_FAILED";
				console.error({ error: code, event: "indexnow.relay_settle_failed" });
				return Response.json(
					{ error: "IndexNow relay settlement failed" },
					{
						status:
							code.includes("INVALID") || code.includes("LARGE") ? 400 : 502,
					},
				);
			}
		}
		return Response.json(
			{
				service: "indexnow-645-live",
				statusUrl: "/health",
			},
			{
				headers: { "x-robots-tag": "noindex, nofollow" },
				status: url.pathname === "/" ? 200 : 404,
			},
		);
	},

	async scheduled(controller, env): Promise<void> {
		try {
			const result = await coordinator(env).run("scheduled");
			console.log({
				cron: controller.cron,
				event: "indexnow.scheduled_run",
				outcome: result.outcome,
				pendingUrlCount: result.pendingUrlCount,
				scheduledTime: controller.scheduledTime,
				submittedUrlCount: result.submittedUrlCount,
			});
		} catch (error) {
			console.error({
				cron: controller.cron,
				error: error instanceof Error ? error.message : "INDEXNOW_RUN_FAILED",
				event: "indexnow.scheduled_run_failed",
				scheduledTime: controller.scheduledTime,
			});
			throw error;
		}
	},
} satisfies ExportedHandler<Env>;
