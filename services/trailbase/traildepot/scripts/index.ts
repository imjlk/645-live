import { executeLottoUpdate, processScannedLottoData } from "../lotto-utils.ts";
import {
	addCronCallback,
	addRoute,
	execute,
	jsonHandler,
	query,
} from "../trailbase.js";
import { executeWinningStoreUpdate } from "../winning-store-utils.ts";

console.log("Adding routes...");

const ACTIVE_USER_SESSIONS_TABLE = "active_user_sessions";
const ACTIVE_USER_WINDOW_MS = 2 * 60 * 1000;
const CONNECTION_DIAGNOSTICS_MARKER = "active-user-sessions-v2";
let activeUserSessionsTableReady = false;

const scheduledJobs = [
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

function registerScheduledJob(
	name: string,
	schedule: string,
	runner: () => Promise<void>,
) {
	addCronCallback(name, schedule, async () => {
		const startedAt = new Date().toISOString();
		console.log(`[${startedAt}] ⏰ Cron triggered: ${name} (${schedule})`);

		try {
			await runner();
			console.log(`[${new Date().toISOString()}] ✅ Cron finished: ${name}`);
		} catch (error) {
			console.error(
				`[${new Date().toISOString()}] ❌ Cron failed: ${name}`,
				error,
			);
			throw error;
		}
	});
}

async function ensureActiveUserSessionsTable() {
	if (activeUserSessionsTableReady) {
		return true;
	}

	const rows = await query(
		`SELECT COUNT(*) as count
		 FROM sqlite_master
		 WHERE type = 'table' AND name = ?`,
		[ACTIVE_USER_SESSIONS_TABLE],
	);
	const exists = extractCountFromRows(rows) > 0;
	if (exists) {
		activeUserSessionsTableReady = true;
	}

	return exists;
}

async function ensureActiveUserSessionsOrFail() {
	const available = await ensureActiveUserSessionsTable();
	if (!available) {
		console.error(
			`Missing required table for active user tracking: ${ACTIVE_USER_SESSIONS_TABLE}`,
		);
		return {
			success: false,
			error: `${ACTIVE_USER_SESSIONS_TABLE} table is unavailable`,
			marker: CONNECTION_DIAGNOSTICS_MARKER,
		};
	}

	return null;
}

async function listConnectionObjects() {
	return query(
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
}

function getActiveUserCutoffIso() {
	return new Date(Date.now() - ACTIVE_USER_WINDOW_MS).toISOString();
}

function extractCountFromRows(rows: unknown): number {
	if (!Array.isArray(rows) || rows.length === 0) return 0;

	const row = rows[0] as unknown;
	if (Array.isArray(row)) {
		const count = Number(row[0]);
		return Number.isFinite(count) ? count : 0;
	}

	if (row && typeof row === "object") {
		const rowObj = row as Record<string, unknown>;
		const value = rowObj.count ?? rowObj["COUNT(*)"] ?? rowObj["0"];
		const count = Number(value);
		return Number.isFinite(count) ? count : 0;
	}

	return 0;
}

async function pruneInactiveSessions(cutoffIso: string) {
	await execute(
		`DELETE FROM ${ACTIVE_USER_SESSIONS_TABLE} WHERE last_seen <= ?`,
		[cutoffIso],
	);
}

async function countActiveSessions(cutoffIso: string) {
	const rows = await query(
		`SELECT COUNT(*) as count FROM ${ACTIVE_USER_SESSIONS_TABLE} WHERE last_seen > ?`,
		[cutoffIso],
	);
	return extractCountFromRows(rows);
}

async function updateActiveUserStats(currentCount: number, updatedAt: string) {
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

addRoute(
	"POST",
	"/scanned",
	jsonHandler(async (req) => {
		return await processScannedLottoData({ body: req.body });
	}),
);

console.log("POST /scanned route registered");

// 접속자 연결 등록/업데이트 라우트
addRoute(
	"POST",
	"/connection/heartbeat",
	jsonHandler(async (req) => {
		console.log("[Heartbeat] Raw request body:", req.body);
		console.log("[Heartbeat] Request body type:", typeof req.body);

		// JSON 문자열인 경우 파싱
		let parsedBody: Record<string, unknown>;
		if (typeof req.body === "string") {
			try {
				parsedBody = JSON.parse(req.body) as Record<string, unknown>;
			} catch (_error) {
				console.log("[Heartbeat] JSON parse error");
				return { error: "Invalid JSON format" };
			}
		} else {
			parsedBody = req.body as Record<string, unknown>;
		}

		const { session_id, user_agent, page_path } = parsedBody || {};

		console.log(
			"[Heartbeat] Parsed values:",
			JSON.stringify({ session_id, user_agent, page_path }),
		);

		if (!session_id) {
			console.log("[Heartbeat] session_id is missing!");
			return { error: "session_id is required" };
		}

		const now = new Date().toISOString();

		try {
			const unavailable = await ensureActiveUserSessionsOrFail();
			if (unavailable) {
				return unavailable;
			}
			await execute(
				`INSERT INTO ${ACTIVE_USER_SESSIONS_TABLE} (session_id, user_agent, connected_at, last_seen, page_path) 
				 VALUES (?, ?, ?, ?, ?)
				 ON CONFLICT(session_id) DO UPDATE SET
					 user_agent = excluded.user_agent,
					 last_seen = excluded.last_seen,
					 page_path = excluded.page_path`,
				[session_id, user_agent || "Unknown", now, now, page_path || "/"],
			);

			const cutoffIso = getActiveUserCutoffIso();
			await pruneInactiveSessions(cutoffIso);
			const activeCount = await countActiveSessions(cutoffIso);
			const finalCount = Math.max(1, activeCount);

			console.log(
				`[Heartbeat] Active connections count: ${activeCount}, final count: ${finalCount}`,
			);

			await updateActiveUserStats(finalCount, now);

			console.log(
				`[Heartbeat] Updated active_users_stats: current=${finalCount}`,
			);

			return {
				success: true,
				active_count: finalCount, // 이제 최소 1이 됨
				session_id,
			};
		} catch (error) {
			console.error("Error in connection heartbeat:", error);
			console.error("Error details:", JSON.stringify(error, null, 2));
			console.error("Session ID:", session_id);
			console.error("User Agent:", user_agent);
			console.error("Page Path:", page_path);
			return { error: "Internal server error", details: String(error) };
		}
	}),
);

console.log("POST /connection/heartbeat route registered");

// 접속자 연결 해제 라우트
addRoute(
	"POST",
	"/connection/disconnect",
	jsonHandler(async (req) => {
		// JSON 문자열인 경우 파싱
		let parsedBody: Record<string, unknown>;
		if (typeof req.body === "string") {
			try {
				parsedBody = JSON.parse(req.body) as Record<string, unknown>;
			} catch (_error) {
				return { error: "Invalid JSON format" };
			}
		} else {
			parsedBody = req.body as Record<string, unknown>;
		}

		const { session_id } = parsedBody || {};

		if (!session_id) {
			return { error: "session_id is required" };
		}

		try {
			const unavailable = await ensureActiveUserSessionsOrFail();
			if (unavailable) {
				return unavailable;
			}
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

			return { success: true, active_count: finalCount };
		} catch (error) {
			console.error("Error in connection disconnect:", error);
			return { error: "Internal server error" };
		}
	}),
);

console.log("POST /connection/disconnect route registered");

// 디버깅용 연결 상태 조회 라우트
addRoute(
	"GET",
	"/connection/debug",
	jsonHandler(async () => {
		try {
			const unavailable = await ensureActiveUserSessionsOrFail();
			if (unavailable) {
				return unavailable;
			}
			const twoMinutesAgo = getActiveUserCutoffIso();
			const activeConnections = await query(
				`SELECT * FROM ${ACTIVE_USER_SESSIONS_TABLE} WHERE last_seen > ? ORDER BY last_seen DESC`,
				[twoMinutesAgo],
			);

			// 현재 사용자 통계 조회
			const userStats = await query(
				"SELECT * FROM active_users_stats ORDER BY id DESC LIMIT 1",
				[],
			);

			// 전체 연결 기록 (최근 10개)
			const recentConnections = await query(
				`SELECT * FROM ${ACTIVE_USER_SESSIONS_TABLE} ORDER BY last_seen DESC LIMIT 10`,
				[],
			);

			return {
				success: true,
				current_time: new Date().toISOString(),
				two_minutes_ago: twoMinutesAgo,
				active_connections: activeConnections,
				user_stats: userStats,
				recent_connections: recentConnections,
				active_count: Array.isArray(activeConnections)
					? activeConnections.length
					: 0,
			};
		} catch (error) {
			console.error("Error in debug endpoint:", error);
			return { error: "Internal server error", details: error };
		}
	}),
);

console.log("GET /connection/debug route registered");

addRoute(
	"GET",
	"/connection/diagnostics",
	jsonHandler(async () => {
		try {
			const available = await ensureActiveUserSessionsTable();
			const cutoffIso = getActiveUserCutoffIso();
			const activeCount = available ? await countActiveSessions(cutoffIso) : 0;
			const tableChecks = await listConnectionObjects();
			const activeUserStats = await query(
				"SELECT * FROM active_users_stats ORDER BY id DESC LIMIT 1",
				[],
			);
			const recentSessions = available
				? await query(
						`SELECT * FROM ${ACTIVE_USER_SESSIONS_TABLE}
				 ORDER BY last_seen DESC
				 LIMIT 5`,
						[],
					)
				: [];

			return {
				success: available,
				marker: CONNECTION_DIAGNOSTICS_MARKER,
				handler: "legacy-script",
				session_strategy: ACTIVE_USER_SESSIONS_TABLE,
				active_user_window_ms: ACTIVE_USER_WINDOW_MS,
				active_user_sessions_table_ready: activeUserSessionsTableReady,
				current_time: new Date().toISOString(),
				cutoff_time: cutoffIso,
				active_count: activeCount,
				table_checks: tableChecks,
				active_user_stats: activeUserStats,
				recent_sessions: recentSessions,
				error: available
					? null
					: `${ACTIVE_USER_SESSIONS_TABLE} table is unavailable`,
			};
		} catch (error) {
			console.error("Error in diagnostics endpoint:", error);
			return {
				success: false,
				marker: CONNECTION_DIAGNOSTICS_MARKER,
				handler: "legacy-script",
				error: "Internal server error",
				details: String(error),
			};
		}
	}),
);

console.log("GET /connection/diagnostics route registered");

for (const job of scheduledJobs) {
	registerScheduledJob(job.name, job.schedule, job.runner);
}

console.log("=== All routes and callbacks registered successfully ===");
