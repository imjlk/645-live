import { defineConfig } from "trailbase-wasm";
import {
	HttpError,
	HttpHandler,
	type HttpRequest,
	HttpResponse,
	StatusCode,
} from "trailbase-wasm/http";
import { JobHandler } from "trailbase-wasm/job";

import { executeLottoUpdate, processScannedLottoData } from "./lotto-utils";
import { execute, query } from "./trailbase-compat";
import { executeWinningStoreUpdate } from "./winning-store-utils";

type ScheduledJob = {
	name: string;
	schedule: string;
	runner: () => Promise<void>;
};

const ACTIVE_USER_SESSIONS_TABLE = "active_user_sessions";
const ACTIVE_USER_WINDOW_MS = 2 * 60 * 1000;
const CONNECTION_DIAGNOSTICS_MARKER = "active-user-sessions-v2";
let activeUserSessionsTableReady = false;

// TrailBase cron runs in UTC. Comments below document the intended KST wall-clock.
const scheduledJobs: ScheduledJob[] = [
	{
		name: "Lotto Weekly Updater",
		schedule: "0 40 11 * * 7",
		runner: executeLottoUpdate,
	}, // Sat 20:40 KST
	{
		name: "Lotto Weekly Catch-up 1",
		schedule: "0 10 12 * * 7",
		runner: executeLottoUpdate,
	}, // Sat 21:10 KST
	{
		name: "Lotto Weekly Catch-up 2",
		schedule: "0 0 13 * * 7",
		runner: executeLottoUpdate,
	}, // Sat 22:00 KST
	{
		name: "Lotto Weekly Catch-up 3",
		schedule: "0 0 14 * * 7",
		runner: executeLottoUpdate,
	}, // Sat 23:00 KST
	{
		name: "Lotto Daily Reconcile",
		schedule: "0 5 0 * * *",
		runner: executeLottoUpdate,
	}, // Daily 09:05 KST
	{
		name: "Lotto Store Weekly Updater",
		schedule: "0 0 12 * * 7",
		runner: executeWinningStoreUpdate,
	}, // Sat 21:00 KST
	{
		name: "Lotto Store Catch-up 1",
		schedule: "0 20 12 * * 7",
		runner: executeWinningStoreUpdate,
	}, // Sat 21:20 KST
	{
		name: "Lotto Store Catch-up 2",
		schedule: "0 10 13 * * 7",
		runner: executeWinningStoreUpdate,
	}, // Sat 22:10 KST
	{
		name: "Lotto Store Catch-up 3",
		schedule: "0 10 14 * * 7",
		runner: executeWinningStoreUpdate,
	}, // Sat 23:10 KST
	{
		name: "Lotto Store Daily Reconcile",
		schedule: "0 15 0 * * *",
		runner: executeWinningStoreUpdate,
	}, // Daily 09:15 KST
];

function createScheduledJob(job: ScheduledJob): JobHandler {
	return new JobHandler(job.name, job.schedule, async () => {
		const startedAt = new Date().toISOString();
		console.info(
			`[${startedAt}] ⏰ Cron triggered: ${job.name} (${job.schedule})`,
		);

		try {
			await job.runner();
			console.info(
				`[${new Date().toISOString()}] ✅ Cron finished: ${job.name}`,
			);
		} catch (error) {
			console.error(
				`[${new Date().toISOString()}] ❌ Cron failed: ${job.name}`,
				error,
			);
			throw error;
		}
	});
}

function asObject(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}
	return value as Record<string, unknown>;
}

function parseJsonBody(req: HttpRequest): Record<string, unknown> {
	const parsed = req.json();
	const obj = asObject(parsed);
	if (!obj) {
		throw HttpError.from(StatusCode.BAD_REQUEST, "Invalid JSON format");
	}
	return obj;
}

function extractCountFromRows(rows: unknown): number {
	if (!Array.isArray(rows) || rows.length === 0) return 0;

	const row = rows[0] as unknown;

	if (Array.isArray(row)) {
		const value = row[0] as unknown;
		const count = Number(value);
		return Number.isFinite(count) ? count : 0;
	}

	const rowObj = asObject(row);
	if (rowObj) {
		const value = rowObj.count ?? rowObj["COUNT(*)"] ?? rowObj["0"];
		const count = Number(value);
		return Number.isFinite(count) ? count : 0;
	}

	return 0;
}

function jsonWithStatus(
	status: number,
	payload: Record<string, unknown>,
): HttpResponse {
	return HttpResponse.status(status, JSON.stringify(payload)).setHeader(
		"Content-Type",
		"application/json",
	);
}

async function ensureActiveUserSessionsTable(): Promise<void> {
	if (activeUserSessionsTableReady) {
		return;
	}

	await execute(
		`CREATE TABLE IF NOT EXISTS ${ACTIVE_USER_SESSIONS_TABLE} (
      session_id TEXT PRIMARY KEY,
      user_agent TEXT,
      connected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      page_path TEXT
    ) STRICT`,
		[],
	);
	await execute(
		`CREATE INDEX IF NOT EXISTS idx_${ACTIVE_USER_SESSIONS_TABLE}_last_seen
     ON ${ACTIVE_USER_SESSIONS_TABLE}(last_seen)`,
		[],
	);
	await execute(
		`CREATE INDEX IF NOT EXISTS idx_${ACTIVE_USER_SESSIONS_TABLE}_connected_at
     ON ${ACTIVE_USER_SESSIONS_TABLE}(connected_at)`,
		[],
	);

	activeUserSessionsTableReady = true;
}

function getActiveUserCutoffIso(): string {
	return new Date(Date.now() - ACTIVE_USER_WINDOW_MS).toISOString();
}

async function pruneInactiveSessions(cutoffIso: string): Promise<void> {
	await execute(
		`DELETE FROM ${ACTIVE_USER_SESSIONS_TABLE} WHERE last_seen <= ?`,
		[cutoffIso],
	);
}

async function countActiveSessions(cutoffIso: string): Promise<number> {
	const activeConnections = await query(
		`SELECT COUNT(*) as count FROM ${ACTIVE_USER_SESSIONS_TABLE} WHERE last_seen > ?`,
		[cutoffIso],
	);

	return extractCountFromRows(activeConnections);
}

async function updateActiveUserStats(
	currentCount: number,
	updatedAt = new Date().toISOString(),
): Promise<void> {
	await execute(
		`INSERT INTO active_users_stats (id, current_count, peak_count, updated_at)
     VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       current_count = excluded.current_count,
       peak_count = MAX(active_users_stats.peak_count, excluded.peak_count),
       updated_at = excluded.updated_at`,
		[currentCount, currentCount, updatedAt],
	);
}

async function scannedHandler(req: HttpRequest): Promise<HttpResponse> {
	try {
		const parsedBody = req.json() ?? {};
		const result = await processScannedLottoData({ body: parsedBody });
		return HttpResponse.json(result);
	} catch (error: unknown) {
		if (error instanceof HttpError) {
			return jsonWithStatus(error.status, {
				success: false,
				error: error.message,
			});
		}

		console.error("Unexpected error in /scanned:", error);
		return jsonWithStatus(StatusCode.INTERNAL_SERVER_ERROR, {
			success: false,
			error: "스캔 데이터 처리 중 오류가 발생했습니다",
		});
	}
}

async function heartbeatHandler(req: HttpRequest): Promise<HttpResponse> {
	let parsedBody: Record<string, unknown>;

	try {
		parsedBody = parseJsonBody(req);
	} catch {
		return HttpResponse.json({ error: "Invalid JSON format" });
	}

	const session_id = parsedBody.session_id;
	const user_agent = parsedBody.user_agent;
	const page_path = parsedBody.page_path;

	if (!session_id || typeof session_id !== "string") {
		return HttpResponse.json({ error: "session_id is required" });
	}

	const now = new Date().toISOString();

	try {
		await ensureActiveUserSessionsTable();
		await execute(
			`INSERT INTO ${ACTIVE_USER_SESSIONS_TABLE} (session_id, user_agent, connected_at, last_seen, page_path)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(session_id) DO UPDATE SET
         user_agent = excluded.user_agent,
         last_seen = excluded.last_seen,
         page_path = excluded.page_path`,
			[
				session_id,
				typeof user_agent === "string" ? user_agent : "Unknown",
				now,
				now,
				typeof page_path === "string" ? page_path : "/",
			],
		);
		const cutoffIso = getActiveUserCutoffIso();
		await pruneInactiveSessions(cutoffIso);
		const activeCount = await countActiveSessions(cutoffIso);
		const finalCount = Math.max(1, activeCount);
		await updateActiveUserStats(finalCount, now);

		return HttpResponse.json({
			success: true,
			active_count: finalCount,
			session_id,
		});
	} catch (error) {
		console.error("Error in connection heartbeat:", error);
		return HttpResponse.json({
			error: "Internal server error",
			details: String(error),
		});
	}
}

async function disconnectHandler(req: HttpRequest): Promise<HttpResponse> {
	let parsedBody: Record<string, unknown>;

	try {
		parsedBody = parseJsonBody(req);
	} catch {
		return HttpResponse.json({ error: "Invalid JSON format" });
	}

	const session_id = parsedBody.session_id;

	if (!session_id || typeof session_id !== "string") {
		return HttpResponse.json({ error: "session_id is required" });
	}

	try {
		await ensureActiveUserSessionsTable();
		await execute(
			`DELETE FROM ${ACTIVE_USER_SESSIONS_TABLE} WHERE session_id = ?`,
			[session_id],
		);
		const cutoffIso = getActiveUserCutoffIso();
		await pruneInactiveSessions(cutoffIso);
		const activeCount = await countActiveSessions(cutoffIso);
		const finalCount = Math.max(0, activeCount);

		const now = new Date().toISOString();
		await updateActiveUserStats(finalCount, now);

		return HttpResponse.json({ success: true, active_count: finalCount });
	} catch (error) {
		console.error("Error in connection disconnect:", error);
		return HttpResponse.json({ error: "Internal server error" });
	}
}

async function debugHandler(): Promise<HttpResponse> {
	try {
		await ensureActiveUserSessionsTable();
		const twoMinutesAgo = getActiveUserCutoffIso();
		const activeConnections = await query(
			`SELECT * FROM ${ACTIVE_USER_SESSIONS_TABLE} WHERE last_seen > ? ORDER BY last_seen DESC`,
			[twoMinutesAgo],
		);

		const userStats = await query(
			"SELECT * FROM active_users_stats ORDER BY id DESC LIMIT 1",
			[],
		);

		const recentConnections = await query(
			`SELECT * FROM ${ACTIVE_USER_SESSIONS_TABLE} ORDER BY last_seen DESC LIMIT 10`,
			[],
		);

		return HttpResponse.json({
			success: true,
			current_time: new Date().toISOString(),
			two_minutes_ago: twoMinutesAgo,
			active_connections: activeConnections,
			user_stats: userStats,
			recent_connections: recentConnections,
			active_count: Array.isArray(activeConnections)
				? activeConnections.length
				: 0,
		});
	} catch (error) {
		console.error("Error in debug endpoint:", error);
		return HttpResponse.json({
			error: "Internal server error",
			details: String(error),
		});
	}
}

async function cleanupInactiveConnections(): Promise<void> {
	try {
		await ensureActiveUserSessionsTable();
		const cutoffIso = getActiveUserCutoffIso();
		await pruneInactiveSessions(cutoffIso);
		const activeCount = Math.max(0, await countActiveSessions(cutoffIso));
		const now = new Date().toISOString();
		await updateActiveUserStats(activeCount, now);
	} catch (error) {
		console.error("Error in connection cleanup job:", error);
	}
}

async function diagnosticsHandler(): Promise<HttpResponse> {
	try {
		await ensureActiveUserSessionsTable();

		const cutoffIso = getActiveUserCutoffIso();
		const activeCount = await countActiveSessions(cutoffIso);
		const tableChecks = await query(
			`SELECT name, type
       FROM sqlite_master
       WHERE name IN (?, ?, ?, ?)
       ORDER BY type, name`,
			[
				ACTIVE_USER_SESSIONS_TABLE,
				"active_connections",
				"active_users_stats",
				"trg_cleanup_inactive_connections",
			],
		);
		const activeUserStats = await query(
			"SELECT * FROM active_users_stats ORDER BY id DESC LIMIT 1",
			[],
		);
		const recentSessions = await query(
			`SELECT * FROM ${ACTIVE_USER_SESSIONS_TABLE}
       ORDER BY last_seen DESC
       LIMIT 5`,
			[],
		);

		return HttpResponse.json({
			success: true,
			marker: CONNECTION_DIAGNOSTICS_MARKER,
			handler: "wasm-guest",
			session_strategy: ACTIVE_USER_SESSIONS_TABLE,
			active_user_window_ms: ACTIVE_USER_WINDOW_MS,
			active_user_sessions_table_ready: activeUserSessionsTableReady,
			current_time: new Date().toISOString(),
			cutoff_time: cutoffIso,
			active_count: activeCount,
			table_checks: tableChecks,
			active_user_stats: activeUserStats,
			recent_sessions: recentSessions,
		});
	} catch (error) {
		console.error("Error in diagnostics endpoint:", error);
		return HttpResponse.json({
			success: false,
			marker: CONNECTION_DIAGNOSTICS_MARKER,
			handler: "wasm-guest",
			error: "Internal server error",
			details: String(error),
		});
	}
}

export default defineConfig({
	httpHandlers: [
		HttpHandler.post("/scanned", scannedHandler),
		HttpHandler.post("/connection/heartbeat", heartbeatHandler),
		HttpHandler.post("/connection/disconnect", disconnectHandler),
		HttpHandler.get("/connection/debug", debugHandler),
		HttpHandler.get("/connection/diagnostics", diagnosticsHandler),
	],
	jobHandlers: [
		...scheduledJobs.map((job) => createScheduledJob(job)),
		JobHandler.minutely("Connection Cleanup", async () => {
			await cleanupInactiveConnections();
		}),
	],
});
