import type {
	MyScanUpsertInput,
	MyScansUpsertPendingResult,
} from "@645/shared";
import { rpcClient } from "$lib/rpc/client";

type WebMcpToolResult = {
	content: Array<{
		type: "text";
		text: string;
	}>;
	structuredContent?: Record<string, unknown>;
};

type WebMcpToolDefinition = NonNullable<Navigator["modelContext"]> extends {
	provideContext(context: { tools: infer T }): unknown;
}
	? T extends Array<infer Tool>
		? Tool
		: never
	: never;

type SyncWebMcpContextOptions = {
	pathname: string;
	isSignedIn: boolean;
};

const READ_ONLY_PATHS = [
	(pathname: string) => pathname === "/",
	(pathname: string) => pathname === "/docs" || pathname === "/developers",
	(pathname: string) => pathname === "/stats" || pathname.startsWith("/stats/"),
];

const MEMBER_PATHS = [
	(pathname: string) => pathname === "/my",
	(pathname: string) => pathname === "/qr-scan",
];

function supportsWebMcp(): boolean {
	return typeof navigator !== "undefined" && !!navigator.modelContext?.provideContext;
}

function isReadOnlyPath(pathname: string): boolean {
	return READ_ONLY_PATHS.some((matches) => matches(pathname));
}

function isMemberPath(pathname: string): boolean {
	return MEMBER_PATHS.some((matches) => matches(pathname));
}

async function fetchJson<T>(path: string): Promise<T> {
	const response = await fetch(path, {
		headers: {
			accept: "application/json",
		},
		credentials: "include",
	});

	if (!response.ok) {
		let message = `${path} returned ${response.status}.`;

		try {
			const error = (await response.json()) as {
				message?: string;
			};
			if (typeof error.message === "string" && error.message.trim().length > 0) {
				message = error.message;
			}
		} catch {
			// Fall back to the generic message when the response is not JSON.
		}

		throw new Error(message);
	}

	return (await response.json()) as T;
}

function createTextResult(
	text: string,
	structuredContent?: Record<string, unknown>,
): WebMcpToolResult {
	return {
		content: [
			{
				type: "text",
				text,
			},
		],
		...(structuredContent ? { structuredContent } : {}),
	};
}

function createReadOnlyTools(): WebMcpToolDefinition[] {
	return [
		{
			name: "get_recent_draws",
			description:
				"Get recent Korean Lotto 6/45 draw snapshots with official numbers and claim deadline data.",
			inputSchema: {
				type: "object",
				properties: {
					limit: {
						type: "integer",
						minimum: 1,
						maximum: 20,
						description: "Maximum number of recent rounds to return.",
					},
				},
			},
			execute: async (input) => {
				const snapshot = await fetchJson<{
					latestRound: number;
					rounds: Array<Record<string, unknown>>;
				}>("/api/lotto-draws-recent.json");
				const rawLimit = typeof input.limit === "number" ? input.limit : undefined;
				const limit = rawLimit ? Math.max(1, Math.min(20, Math.floor(rawLimit))) : 10;
				const rounds = snapshot.rounds.slice(0, limit);

				return createTextResult(
					`Returning ${rounds.length} recent Korean Lotto 6/45 draw snapshots. Latest round: ${snapshot.latestRound}.`,
					{
						...snapshot,
						rounds,
					},
				);
			},
		},
		{
			name: "get_draw",
			description: "Get a single Korean Lotto 6/45 draw snapshot by round number.",
			inputSchema: {
				type: "object",
				properties: {
					round: {
						type: "integer",
						minimum: 1,
						description: "Korean Lotto 6/45 round number.",
					},
				},
				required: ["round"],
			},
			execute: async (input) => {
				if (typeof input.round !== "number" || !Number.isInteger(input.round)) {
					throw new Error("The round input must be an integer.");
				}

				const draw = await fetchJson<{
					round: number;
					drawDate: string;
					numbers: number[];
					bonusNumber: number;
				}>(`/api/lotto-draws/${input.round}.json`);

				return createTextResult(
					`Round ${draw.round} was drawn on ${draw.drawDate}. Winning numbers: ${draw.numbers.join(", ")}. Bonus: ${draw.bonusNumber}.`,
					draw as unknown as Record<string, unknown>,
				);
			},
		},
		{
			name: "get_stats_overview",
			description: "Get the public TrailBase-backed 645.live statistics overview.",
			inputSchema: {
				type: "object",
				properties: {},
			},
			execute: async () => {
				const overview = await fetchJson<{
					totalRounds: number;
					latestRound: number;
				}>("/api/stats/overview.json");

				return createTextResult(
					`Returning the 645.live statistics overview for ${overview.totalRounds} rounds. Latest round: ${overview.latestRound}.`,
					overview as unknown as Record<string, unknown>,
				);
			},
		},
		{
			name: "get_auth_options",
			description:
				"Get the current Better Auth-backed sign-in options that 645.live exposes publicly.",
			inputSchema: {
				type: "object",
				properties: {},
			},
			execute: async () => {
				const authSummary = await fetchJson<{
					socialProviders: Array<{ label: string }>;
				}>("/api/auth/providers.json");

				return createTextResult(
					`645.live supports public anonymous read APIs, Better Auth session cookies for signed-in member actions, and ${authSummary.socialProviders.length} configured social providers.`,
					authSummary as unknown as Record<string, unknown>,
				);
			},
		},
		{
			name: "get_status",
			description: "Get the machine-readable status document for the public 645.live agent surface.",
			inputSchema: {
				type: "object",
				properties: {},
			},
			execute: async () => {
				const status = await fetchJson<{
					status: string;
				}>("/api/status.json");

				return createTextResult(
					`645.live public surface status is ${status.status}.`,
					status as unknown as Record<string, unknown>,
				);
			},
		},
	];
}

function createMemberTools(): WebMcpToolDefinition[] {
	return [
		{
			name: "get_my_scan_summary",
			description:
				"Get the signed-in user's member scan summary using the existing Better Auth session cookie.",
			inputSchema: {
				type: "object",
				properties: {},
			},
			execute: async () => {
				const summary = await rpcClient.myScans.summary();
				return createTextResult(
					`Member scan summary: ${summary.totalTickets} tickets, ${summary.pendingResults} pending, ${summary.winningTickets} winning.`,
					summary as unknown as Record<string, unknown>,
				);
			},
		},
		{
			name: "list_my_scans",
			description:
				"List recent signed-in member scans using the existing Better Auth session cookie.",
			inputSchema: {
				type: "object",
				properties: {
					limit: {
						type: "integer",
						minimum: 1,
						maximum: 100,
						description: "Maximum number of member scan rows to return.",
					},
				},
			},
			execute: async (input) => {
				const rawLimit = typeof input.limit === "number" ? input.limit : undefined;
				const limit = rawLimit ? Math.max(1, Math.min(100, Math.floor(rawLimit))) : 20;
				const scans = await rpcClient.myScans.list({ limit });

				return createTextResult(`Returning ${scans.length} signed-in member scan records.`, {
					items: scans as unknown as Record<string, unknown>[],
				});
			},
		},
		{
			name: "upsert_pending_scans",
			description:
				"Persist pending member scans for the signed-in user through the existing Better Auth and TrailBase workflow.",
			inputSchema: {
				type: "object",
				properties: {
					items: {
						type: "array",
						minItems: 1,
						maxItems: 50,
						items: {
							type: "object",
							properties: {
								ticketHash: { type: "string" },
								qrData: { type: "string" },
								scannedAt: { type: "string" },
								round: { type: ["integer", "null"] },
								gamesCount: { type: ["integer", "null"] },
								resultStatus: {
									type: "string",
									enum: ["winner", "loser", "unreleased", "unknown", "expired"],
								},
								lastCheckedAt: { type: ["string", "null"] },
								winningGrade: { type: ["string", "null"] },
								claimStartAt: { type: ["string", "null"] },
								claimDeadlineAt: { type: ["string", "null"] },
								summary: { type: "string" },
							},
							required: [
								"ticketHash",
								"qrData",
								"scannedAt",
								"resultStatus",
								"summary",
							],
						},
					},
				},
				required: ["items"],
			},
			execute: async (input) => {
				if (!Array.isArray(input.items) || input.items.length === 0) {
					throw new Error("The items input must contain at least one pending scan.");
				}

				const result = (await rpcClient.myScans.upsertPending({
					items: input.items as MyScanUpsertInput[],
				})) as MyScansUpsertPendingResult;

				return createTextResult(
					`Synced ${result.syncedTicketHashes.length} pending member scans.`,
					result as unknown as Record<string, unknown>,
				);
			},
		},
	];
}

function getToolsForPath(options: SyncWebMcpContextOptions): WebMcpToolDefinition[] {
	const tools: WebMcpToolDefinition[] = [];

	if (isReadOnlyPath(options.pathname) || (isMemberPath(options.pathname) && options.isSignedIn)) {
		tools.push(...createReadOnlyTools());
	}

	if (options.isSignedIn && isMemberPath(options.pathname)) {
		tools.push(...createMemberTools());
	}

	return tools;
}

export async function syncWebMcpContext(
	options: SyncWebMcpContextOptions,
): Promise<void> {
	if (!supportsWebMcp()) {
		return;
	}

	await Promise.resolve(
		navigator.modelContext?.provideContext({
			tools: getToolsForPath(options),
		}),
	);
}
