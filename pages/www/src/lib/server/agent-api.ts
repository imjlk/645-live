import { DISCOVERY_PATHS } from "$lib/agent/content";
import { getConfiguredSocialProviders } from "$lib/server/auth-social";
import {
	findRoundInSnapshot,
	getDrawSnapshotRound,
	getRecentDrawSnapshot,
} from "$lib/server/recent-draw-snapshot";
import {
	getPublicStatsOverview,
	getStatsHubData,
	type StatsHubData,
} from "$lib/server/stats-hub";
import { SITE_NAME, SITE_ORIGIN, absoluteUrl } from "$lib/seo/index.js";
import type { RequestEvent } from "@sveltejs/kit";

type EventLike = Pick<RequestEvent, "platform" | "locals">;

export type PublicAuthSummary = {
	emailPassword: {
		enabled: true;
	};
	socialProviders: Array<{
		id: string;
		label: string;
	}>;
	sessionMode: "cookie";
	oauthDiscovery: "planned";
};

export async function getPublicDrawSnapshot() {
	return getRecentDrawSnapshot();
}

export async function getPublicDrawRound(round: number) {
	return getDrawSnapshotRound(round);
}

export async function getStatsHubSnapshot(): Promise<StatsHubData> {
	return getStatsHubData();
}

export async function getStatsOverviewSnapshot() {
	return getPublicStatsOverview(await getStatsHubSnapshot());
}

export function getPublicAuthSummary(event: EventLike): PublicAuthSummary {
	return {
		emailPassword: {
			enabled: true,
		},
		socialProviders: getConfiguredSocialProviders({ platform: event.platform }).map(
			(provider) => ({
				id: provider.id,
				label: provider.label,
			}),
		),
		sessionMode: "cookie",
		oauthDiscovery: "planned",
	};
}

export function getPublicStatusDocument(event: EventLike) {
	const dbReady = !!event.locals.db;
	const dbBootstrapError = event.locals.dbBootstrapError ?? null;
	const authProviders = getPublicAuthSummary(event);

	return {
		service: SITE_NAME,
		status: dbReady ? "ok" : "degraded",
		timestamp: new Date().toISOString(),
		publicSurfaces: {
			home: absoluteUrl(DISCOVERY_PATHS.home),
			docs: absoluteUrl(DISCOVERY_PATHS.docs),
			openapi: absoluteUrl(DISCOVERY_PATHS.openApi),
			apiCatalog: absoluteUrl(DISCOVERY_PATHS.apiCatalog),
			mcp: absoluteUrl(DISCOVERY_PATHS.mcp),
		},
		auth: authProviders,
		dependencies: {
			database: dbReady ? "ready" : "unavailable",
			trailbasePublicBase:
				(event.platform?.env?.PUBLIC_TRAILBASE_URL as string | undefined) ??
				"https://trail.645.live",
		},
		issues: dbBootstrapError
			? [
					{
						code: "DB_BOOTSTRAP_ERROR",
						message: dbBootstrapError,
					},
				]
			: [],
	};
}

export function getPublicOpenApiDocument() {
	return {
		openapi: "3.1.0",
		info: {
			title: `${SITE_NAME} Public API`,
			version: "1.0.0",
			description:
				"Public read API for Korean Lotto 6/45 draw snapshots, statistics overviews, auth provider visibility, and status checks. Public read endpoints are anonymous. Signed-in member scan workflows use the existing Better Auth session cookie flow and are exposed through RPC and MCP, not through a separate OAuth surface in Phase 1.",
		},
		servers: [{ url: SITE_ORIGIN }],
		paths: {
			[DISCOVERY_PATHS.recentDraws]: {
				get: {
					operationId: "getRecentDraws",
					summary: "Get recent Korean Lotto 6/45 draw snapshots",
					responses: {
						"200": {
							description: "Recent draw snapshots",
							content: {
								"application/json": {
									schema: {
										$ref: "#/components/schemas/RecentDrawSnapshot",
									},
								},
							},
						},
					},
				},
			},
			"/api/lotto-draws/{round}.json": {
				get: {
					operationId: "getDrawByRound",
					summary: "Get a single Korean Lotto 6/45 draw snapshot by round",
					parameters: [
						{
							name: "round",
							in: "path",
							required: true,
							schema: { type: "integer", minimum: 1 },
						},
					],
					responses: {
						"200": {
							description: "Single draw snapshot",
							content: {
								"application/json": {
									schema: {
										$ref: "#/components/schemas/RecentDrawSnapshotRound",
									},
								},
							},
						},
						"404": {
							description: "Round not found",
							content: {
								"application/json": {
									schema: {
										$ref: "#/components/schemas/ErrorResponse",
									},
								},
							},
						},
					},
				},
			},
			[DISCOVERY_PATHS.statsOverview]: {
				get: {
					operationId: "getStatsOverview",
					summary: "Get the public TrailBase-backed statistics overview",
					responses: {
						"200": {
							description: "Statistics overview",
							content: {
								"application/json": {
									schema: {
										$ref: "#/components/schemas/StatsOverview",
									},
								},
							},
						},
					},
				},
			},
			[DISCOVERY_PATHS.authProviders]: {
				get: {
					operationId: "getAuthProviders",
					summary: "Get public authentication provider visibility",
					responses: {
						"200": {
							description: "Current sign-in provider summary",
							content: {
								"application/json": {
									schema: {
										$ref: "#/components/schemas/AuthSummary",
									},
								},
							},
						},
					},
				},
			},
			[DISCOVERY_PATHS.apiStatus]: {
				get: {
					operationId: "getPublicStatus",
					summary: "Get machine-readable public surface status",
					responses: {
						"200": {
							description: "Current status document",
							content: {
								"application/json": {
									schema: {
										$ref: "#/components/schemas/StatusDocument",
									},
								},
							},
						},
					},
				},
			},
		},
		components: {
			schemas: {
				RecentDrawSnapshot: {
					type: "object",
					required: ["generatedAt", "latestRound", "rounds"],
					properties: {
						generatedAt: { type: "string", format: "date-time" },
						latestRound: { type: "integer" },
						rounds: {
							type: "array",
							items: {
								$ref: "#/components/schemas/RecentDrawSnapshotRound",
							},
						},
					},
				},
				RecentDrawSnapshotRound: {
					type: "object",
					required: [
						"round",
						"drawDate",
						"numbers",
						"bonusNumber",
						"firstPrizeAmount",
						"firstPrizeWinnerCount",
						"claimStartDate",
						"claimDeadlineDate",
					],
					properties: {
						round: { type: "integer" },
						drawDate: { type: "string", format: "date" },
						numbers: {
							type: "array",
							minItems: 6,
							maxItems: 6,
							items: { type: "integer" },
						},
						bonusNumber: { type: "integer" },
						firstPrizeAmount: { type: "integer" },
						firstPrizeWinnerCount: { type: "integer" },
						claimStartDate: { type: "string", format: "date" },
						claimDeadlineDate: { type: "string", format: "date" },
					},
				},
				StatsOverview: {
					type: "object",
					properties: {
						latestRound: { type: "integer" },
						latestDrawDate: { type: "string" },
						totalRounds: { type: "integer" },
						topNumbers: {
							type: "array",
							items: { type: "object", additionalProperties: true },
						},
						lowestNumbers: {
							type: "array",
							items: { type: "object", additionalProperties: true },
						},
						topPairs: {
							type: "array",
							items: { type: "object", additionalProperties: true },
						},
						bonusSummary: {
							type: ["object", "null"],
							additionalProperties: true,
						},
						freshness: {
							type: "object",
							additionalProperties: true,
						},
						summaries: {
							type: "object",
							properties: {
								recent10: { type: "string" },
								recent50: { type: "string" },
								recent100: { type: "string" },
								overall: { type: "string" },
							},
						},
					},
				},
				AuthSummary: {
					type: "object",
					properties: {
						emailPassword: {
							type: "object",
							properties: {
								enabled: { type: "boolean" },
							},
						},
						socialProviders: {
							type: "array",
							items: {
								type: "object",
								properties: {
									id: { type: "string" },
									label: { type: "string" },
								},
							},
						},
						sessionMode: { type: "string", enum: ["cookie"] },
						oauthDiscovery: { type: "string", enum: ["planned"] },
					},
				},
				StatusDocument: {
					type: "object",
					properties: {
						service: { type: "string" },
						status: { type: "string" },
						timestamp: { type: "string", format: "date-time" },
						publicSurfaces: {
							type: "object",
							additionalProperties: { type: "string" },
						},
						auth: { $ref: "#/components/schemas/AuthSummary" },
						dependencies: {
							type: "object",
							additionalProperties: { type: "string" },
						},
						issues: {
							type: "array",
							items: {
								type: "object",
								properties: {
									code: { type: "string" },
									message: { type: "string" },
								},
							},
						},
					},
				},
				ErrorResponse: {
					type: "object",
					required: ["error", "code", "message"],
					properties: {
						error: { type: "string" },
						code: { type: "string" },
						message: { type: "string" },
						hint: { type: "string" },
					},
				},
			},
		},
	};
}

export async function getRoundIfPresent(round: number) {
	const snapshot = await getRecentDrawSnapshot();
	return findRoundInSnapshot(snapshot, round);
}
