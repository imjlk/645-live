import { DISCOVERY_PATHS, getMcpServerCard } from "$lib/agent/content";
import { createJsonErrorResponse } from "$lib/agent/http";
import {
	getPublicAuthSummary,
	getPublicDrawRound,
	getPublicDrawSnapshot,
	getPublicStatusDocument,
	getStatsOverviewSnapshot,
} from "$lib/server/agent-api";
import { createMyScansService } from "$lib/server/my-scans";
import { toPublicSession, toPublicUser } from "$lib/server/session";
import { SITE_NAME, absoluteUrl } from "$lib/seo/index.js";
import {
	RESOURCE_MIME_TYPE,
	registerAppResource,
	registerAppTool,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { RequestEvent } from "@sveltejs/kit";
import { z } from "zod";

type PublicAuthState = {
	session: ReturnType<typeof toPublicSession>;
	user: ReturnType<typeof toPublicUser>;
	userId: string | null;
};

type McpEvent = Pick<RequestEvent, "request" | "locals" | "platform">;

const DRAW_DETAILS_RESOURCE = "ui://645live/draw-details.html";
const STATS_OVERVIEW_RESOURCE = "ui://645live/stats-overview.html";
const MEMBER_SCANS_RESOURCE = "ui://645live/member-scans.html";

function renderMcpAppHtml(title: string, subtitle: string, bullets: string[]) {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>${title}</title>
  <style>
    :root {
      color-scheme: light dark;
      font-family: ui-sans-serif, system-ui, sans-serif;
      --surface: rgba(255,255,255,0.88);
      --surface-dark: rgba(17,24,39,0.92);
      --line: rgba(15,23,42,0.12);
      --line-dark: rgba(255,255,255,0.12);
      --accent: #2563eb;
      --text: #0f172a;
      --text-dark: #f8fafc;
    }
    body {
      margin: 0;
      padding: 18px;
      background: linear-gradient(135deg, rgba(37,99,235,0.12), rgba(15,23,42,0.03));
      color: var(--text);
    }
    @media (prefers-color-scheme: dark) {
      body {
        background: linear-gradient(135deg, rgba(37,99,235,0.16), rgba(2,6,23,0.96));
        color: var(--text-dark);
      }
    }
    .shell {
      border-radius: 18px;
      border: 1px solid var(--line);
      background: var(--surface);
      padding: 20px;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
    }
    @media (prefers-color-scheme: dark) {
      .shell {
        border-color: var(--line-dark);
        background: var(--surface-dark);
        box-shadow: none;
      }
    }
    h1 {
      margin: 0;
      font-size: 1.35rem;
      line-height: 1.2;
    }
    p {
      margin: 0.65rem 0 0;
      opacity: 0.86;
      line-height: 1.55;
    }
    ul {
      margin: 1rem 0 0;
      padding-left: 1.1rem;
      line-height: 1.6;
    }
    .eyebrow {
      display: inline-flex;
      margin-bottom: 0.75rem;
      font-size: 0.76rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--accent);
      font-weight: 700;
    }
  </style>
</head>
<body>
  <main class="shell">
    <span class="eyebrow">${SITE_NAME} MCP App</span>
    <h1>${title}</h1>
    <p>${subtitle}</p>
    <ul>${bullets.map((item) => `<li>${item}</li>`).join("")}</ul>
  </main>
</body>
</html>`;
}

async function getPublicAuthState(event: McpEvent): Promise<PublicAuthState> {
	if (!event.locals.auth) {
		return {
			session: null,
			user: null,
			userId: null,
		};
	}

	const sessionValue = await event.locals.auth.api.getSession({
		headers: event.request.headers,
	});
	const session = toPublicSession(sessionValue);

	return {
		session,
		user: toPublicUser(session),
		userId: session?.user.id ?? null,
	};
}

function requireUserId(state: PublicAuthState): string {
	if (!state.userId) {
		throw new Error("A signed-in Better Auth session is required for this MCP tool.");
	}

	return state.userId;
}

function createServer(event: McpEvent, authState: PublicAuthState) {
	const server = new McpServer(
		{
			name: `${SITE_NAME} MCP`,
			version: "1.0.0",
			websiteUrl: absoluteUrl(DISCOVERY_PATHS.docs),
		},
		{
			capabilities: {
				logging: {},
			},
		},
	);

	registerAppResource(
		server,
		"Stats Overview UI",
		STATS_OVERVIEW_RESOURCE,
		{
			description: "Lightweight UI shell for 645.live statistics overview responses.",
			_meta: {
				ui: {
					prefersBorder: true,
				},
			},
		},
		async () => ({
			contents: [
				{
					uri: STATS_OVERVIEW_RESOURCE,
					mimeType: RESOURCE_MIME_TYPE,
					text: renderMcpAppHtml(
						"645.live statistics overview",
						"Use this view when an MCP host wants to render the public stats summary alongside the model output.",
						[
							"TrailBase-backed public statistics overview",
							"Recent round, top numbers, pair highlights, and freshness",
							"Consistent with /stats and /api/stats/overview.json",
						],
					),
				},
			],
		}),
	);

	registerAppResource(
		server,
		"Draw Details UI",
		DRAW_DETAILS_RESOURCE,
		{
			description: "Lightweight UI shell for a single Lotto 6/45 draw snapshot.",
			_meta: {
				ui: {
					prefersBorder: true,
				},
			},
		},
		async () => ({
			contents: [
				{
					uri: DRAW_DETAILS_RESOURCE,
					mimeType: RESOURCE_MIME_TYPE,
					text: renderMcpAppHtml(
						"Single draw details",
						"Use this view when an MCP host wants to display a single Korean Lotto 6/45 round response.",
						[
							"Winning numbers and bonus number",
							"First-prize winner counts and payout window",
							"Consistent with /api/lotto-draws/{round}.json",
						],
					),
				},
			],
		}),
	);

	registerAppResource(
		server,
		"Member Scans UI",
		MEMBER_SCANS_RESOURCE,
		{
			description: "Lightweight UI shell for signed-in member scan responses.",
			_meta: {
				ui: {
					prefersBorder: true,
				},
			},
		},
		async () => ({
			contents: [
				{
					uri: MEMBER_SCANS_RESOURCE,
					mimeType: RESOURCE_MIME_TYPE,
					text: renderMcpAppHtml(
						"Signed-in member scans",
						"Use this view when an MCP host wants to render member scan summary or list results for the current signed-in user.",
						[
							"Requires the existing Better Auth session cookie",
							"Reads or writes the TrailBase-backed member scan workflow",
							"Equivalent to the current /my and QR/member sync surfaces",
						],
					),
				},
			],
		}),
	);

	registerAppTool(
		server,
		"get_recent_draws",
		{
			title: "Get recent draws",
			description: "Get recent Korean Lotto 6/45 draw snapshots with claim deadline data.",
			inputSchema: {
				limit: z.number().int().min(1).max(20).optional().describe("Maximum number of recent rounds to return."),
			},
			annotations: {
				readOnlyHint: true,
			},
			_meta: {
				ui: {
					resourceUri: DRAW_DETAILS_RESOURCE,
				},
			},
		},
		async ({ limit }) => {
			const snapshot = await getPublicDrawSnapshot();
			const rounds = snapshot.rounds.slice(0, limit ?? 10);
			return {
				content: [
					{
						type: "text",
						text: `Returning ${rounds.length} recent Korean Lotto 6/45 draw snapshots. Latest round: ${snapshot.latestRound}.`,
					},
				],
				structuredContent: {
					...snapshot,
					rounds,
				},
			};
		},
	);

	registerAppTool(
		server,
		"get_draw",
		{
			title: "Get draw by round",
			description: "Get a single Korean Lotto 6/45 draw snapshot by round number.",
			inputSchema: {
				round: z.number().int().min(1).describe("Korean Lotto 6/45 round number."),
			},
			annotations: {
				readOnlyHint: true,
			},
			_meta: {
				ui: {
					resourceUri: DRAW_DETAILS_RESOURCE,
				},
			},
		},
		async ({ round }) => {
			const draw = await getPublicDrawRound(round);
			if (!draw) {
				throw new Error(`Round ${round} was not found on 645.live.`);
			}

			return {
				content: [
					{
						type: "text",
						text: `Round ${draw.round} was drawn on ${draw.drawDate}. Winning numbers: ${draw.numbers.join(", ")}. Bonus: ${draw.bonusNumber}.`,
					},
				],
				structuredContent: draw,
			};
		},
	);

	registerAppTool(
		server,
		"get_stats_overview",
		{
			title: "Get stats overview",
			description: "Get the public TrailBase-backed 645.live statistics overview.",
			annotations: {
				readOnlyHint: true,
			},
			_meta: {
				ui: {
					resourceUri: STATS_OVERVIEW_RESOURCE,
				},
			},
		},
		async () => {
			const overview = await getStatsOverviewSnapshot();
			return {
				content: [
					{
						type: "text",
						text: `Returning the 645.live statistics overview for ${overview.totalRounds} rounds. Latest round: ${overview.latestRound}.`,
					},
				],
				structuredContent: overview,
			};
		},
	);

	registerAppTool(
		server,
		"get_auth_options",
		{
			title: "Get auth options",
			description: "Get the current Better Auth-backed sign-in options that 645.live exposes publicly.",
			annotations: {
				readOnlyHint: true,
			},
			_meta: {},
		},
		async () => {
			const authSummary = getPublicAuthSummary(event);
			return {
				content: [
					{
						type: "text",
						text: `645.live supports public anonymous read APIs, Better Auth session cookies for signed-in member actions, and ${authSummary.socialProviders.length} configured social providers.`,
					},
				],
				structuredContent: authSummary,
			};
		},
	);

	registerAppTool(
		server,
		"get_status",
		{
			title: "Get public status",
			description: "Get the machine-readable status document for the public 645.live agent surface.",
			annotations: {
				readOnlyHint: true,
			},
			_meta: {},
		},
		async () => {
			const status = getPublicStatusDocument(event);
			return {
				content: [
					{
						type: "text",
						text: `645.live public surface status is ${status.status}.`,
					},
				],
				structuredContent: status,
			};
		},
	);

	registerAppTool(
		server,
		"get_my_scan_summary",
		{
			title: "Get my scan summary",
			description: "Get the signed-in user's member scan summary using the existing Better Auth session cookie.",
			annotations: {
				readOnlyHint: true,
			},
			_meta: {
				ui: {
					resourceUri: MEMBER_SCANS_RESOURCE,
				},
			},
		},
		async () => {
			const userId = requireUserId(authState);
			if (!event.locals.db) {
				throw new Error("The database is not available, so member scan data cannot be read.");
			}

			const service = createMyScansService(event.locals.db);
			const summary = await service.getSummary(userId);
			return {
				content: [
					{
						type: "text",
						text: `Member scan summary: ${summary.totalTickets} tickets, ${summary.pendingResults} pending, ${summary.winningTickets} winning.`,
					},
				],
				structuredContent: summary,
			};
		},
	);

	registerAppTool(
		server,
		"list_my_scans",
		{
			title: "List my scans",
			description: "List recent signed-in member scans using the existing Better Auth session cookie.",
			inputSchema: {
				limit: z.number().int().min(1).max(100).optional().describe("Maximum number of member scan rows to return."),
			},
			annotations: {
				readOnlyHint: true,
			},
			_meta: {
				ui: {
					resourceUri: MEMBER_SCANS_RESOURCE,
				},
			},
		},
		async ({ limit }) => {
			const userId = requireUserId(authState);
			if (!event.locals.db) {
				throw new Error("The database is not available, so member scan data cannot be read.");
			}

			const service = createMyScansService(event.locals.db);
			const scans = await service.list(userId, { limit });
			return {
				content: [
					{
						type: "text",
						text: `Returning ${scans.length} signed-in member scan records.`,
					},
				],
				structuredContent: {
					items: scans,
				},
			};
		},
	);

	registerAppTool(
		server,
		"upsert_pending_scans",
		{
			title: "Sync pending scans",
			description: "Persist pending member scans for the signed-in user through the existing Better Auth + TrailBase workflow.",
			inputSchema: {
				items: z
					.array(
						z.object({
							ticketHash: z.string(),
							qrData: z.string(),
							scannedAt: z.string(),
							round: z.number().int().nullable().optional(),
							gamesCount: z.number().int().nullable().optional(),
							resultStatus: z.enum([
								"winner",
								"loser",
								"unreleased",
								"unknown",
								"expired",
							]),
							lastCheckedAt: z.string().nullable().optional(),
							winningGrade: z.string().nullable().optional(),
							claimStartAt: z.string().nullable().optional(),
							claimDeadlineAt: z.string().nullable().optional(),
							summary: z.string(),
						}),
					)
					.min(1)
					.max(50)
					.describe("Pending member scans to persist for the signed-in user."),
			},
			annotations: {
				readOnlyHint: false,
			},
			_meta: {
				ui: {
					resourceUri: MEMBER_SCANS_RESOURCE,
				},
			},
		},
		async ({ items }) => {
			const userId = requireUserId(authState);
			if (!event.locals.db) {
				throw new Error("The database is not available, so member scan data cannot be written.");
			}

			const service = createMyScansService(event.locals.db);
			const result = await service.upsertPending(userId, items);
			return {
				content: [
					{
						type: "text",
						text: `Synced ${result.syncedTicketHashes.length} pending member scans.`,
					},
				],
				structuredContent: result,
			};
		},
	);

	return server;
}

function appendMcpCorsHeaders(response: Response): Response {
	const headers = new Headers(response.headers);
	headers.set("access-control-allow-origin", "*");
	headers.set(
		"access-control-allow-headers",
		"Content-Type, Last-Event-ID, mcp-protocol-version, mcp-session-id",
	);
	headers.set("access-control-allow-methods", "GET, POST, DELETE, OPTIONS");
	headers.set("access-control-expose-headers", "mcp-session-id, mcp-protocol-version");

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

export async function handleMcpRequest(event: McpEvent) {
	if (event.request.method === "OPTIONS") {
		return appendMcpCorsHeaders(new Response(null, { status: 204 }));
	}

	const authState = await getPublicAuthState(event);
	const transport = new WebStandardStreamableHTTPServerTransport({
		enableJsonResponse: true,
	});
	const server = createServer(event, authState);
	await server.connect(transport);

	const response = await transport.handleRequest(event.request);
	return appendMcpCorsHeaders(response);
}

export function createMcpNotFoundResponse(pathname: string) {
	return createJsonErrorResponse(
		404,
		"MCP_ENDPOINT_NOT_FOUND",
		`No MCP endpoint exists at ${pathname}.`,
		`Use ${DISCOVERY_PATHS.mcp} or ${DISCOVERY_PATHS.mcpServerCard} for MCP discovery.`,
	);
}

export { getMcpServerCard };
