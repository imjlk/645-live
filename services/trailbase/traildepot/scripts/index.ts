import { executeLottoUpdate, processScannedLottoData } from "../lotto-utils.ts";
import {
	addCronCallback,
	addRoute,
	jsonHandler,
	query,
	transaction,
} from "../trailbase.js";
import { executeWinningStoreUpdate } from "../winning-store-utils.ts";

console.log("Adding routes...");

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
			} catch (error) {
				console.log("[Heartbeat] JSON parse error:", error);
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
			// 트리거 강제 삭제 (문제 해결)
			try {
				await query(
					"DROP TRIGGER IF EXISTS trg_cleanup_inactive_connections",
					[],
				);
				console.log("[Heartbeat] Trigger forcefully removed");
			} catch (triggerError) {
				console.log("[Heartbeat] Trigger removal failed:", triggerError);
			}

			console.log("[Heartbeat] Executing database transaction...");
			await transaction(async (tx) => {
				// UPSERT 쿼리를 사용하여 중복 제약 조건 문제 해결
				console.log("[Heartbeat] Inserting/updating connection record...");
				console.log(
					"[Heartbeat] INSERT params:",
					JSON.stringify([
						session_id,
						user_agent || "Unknown",
						now,
						now,
						page_path || "/",
					]),
				);
				// 기존 세션 삭제 후 새로 INSERT (UPSERT 대신)
				tx.execute("DELETE FROM active_connections WHERE session_id = ?", [
					session_id,
				]);
				tx.execute(
					`INSERT INTO active_connections (session_id, user_agent, connected_at, last_seen, page_path) 
					 VALUES (?, ?, ?, ?, ?)`,
					[session_id, user_agent || "Unknown", now, now, page_path || "/"],
				);
				console.log("[Heartbeat] Connection record updated successfully");
			});
			console.log("[Heartbeat] Transaction completed successfully");

			// INSERT 직후 확인: 방금 삽입한 레코드가 실제로 있는지 체크
			const verifyInsert = await query(
				"SELECT * FROM active_connections WHERE session_id = ?",
				[session_id],
			);
			console.log(
				"[Heartbeat] Verify insert result:",
				JSON.stringify(verifyInsert),
			);

			// 전체 테이블 내용도 확인
			const allConnections = await query(
				"SELECT COUNT(*) as total FROM active_connections",
				[],
			);
			console.log(
				"[Heartbeat] Total connections in table:",
				JSON.stringify(allConnections),
			);

			// 실제 저장된 모든 레코드 확인
			const allRecords = await query("SELECT * FROM active_connections", []);
			console.log(
				"[Heartbeat] All records in table:",
				JSON.stringify(allRecords),
			);

			// 현재 활성 연결 수 조회 (2분 이내 업데이트된 연결)
			const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
			console.log(
				"[Heartbeat] Querying active connections since:",
				twoMinutesAgo,
			);

			// SQLite에서 ISO 문자열 직접 비교 (datetime 함수 없이)
			const activeConnections = await query(
				"SELECT COUNT(*) as count FROM active_connections WHERE last_seen > ?",
				[twoMinutesAgo],
			);
			console.log("[Heartbeat] Raw query result:", activeConnections);

			const activeCount =
				Array.isArray(activeConnections) && activeConnections.length > 0
					? ((activeConnections[0] as unknown as Record<string, unknown>)
							?.count as number) || 0
					: 0;

			// 단순화: 하트비트를 보낸다는 것 자체가 활성 사용자가 있다는 의미
			const finalCount = Math.max(1, activeCount); // 최소 1명의 활성 사용자

			console.log(
				`[Heartbeat] Active connections count: ${activeCount}, final count: ${finalCount}`,
			);

			// active_users_stats 테이블 UPSERT (브로드캐스트 트리거)
			await query(
				`INSERT INTO active_users_stats (id, current_count, peak_count, updated_at) 
				 VALUES (1, ?, ?, ?)
				 ON CONFLICT(id) DO UPDATE SET 
					 current_count = excluded.current_count,
					 peak_count = MAX(active_users_stats.peak_count, excluded.peak_count),
					 updated_at = excluded.updated_at`,
				[finalCount, finalCount, now],
			);

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
			} catch (error) {
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
			// active_connections 테이블에서 세션 제거
			await query("DELETE FROM active_connections WHERE session_id = ?", [
				session_id,
			]);

			// 현재 활성 연결 수 조회
			const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
			const activeConnections = await query(
				"SELECT COUNT(*) as count FROM active_connections WHERE last_seen > ?",
				[twoMinutesAgo],
			);

			const activeCount =
				Array.isArray(activeConnections) && activeConnections.length > 0
					? ((activeConnections[0] as unknown as Record<string, unknown>)
							?.count as number) || 0
					: 0;

			const finalCount = Math.max(0, activeCount); // Allow 0 users for debugging

			// active_users_stats 테이블 UPSERT (브로드캐스트 트리거)
			const now = new Date().toISOString();
			await query(
				`INSERT INTO active_users_stats (id, current_count, peak_count, updated_at) 
				 VALUES (1, ?, 1, ?)
				 ON CONFLICT(id) DO UPDATE SET 
					 current_count = excluded.current_count,
					 updated_at = excluded.updated_at`,
				[finalCount, now],
			);

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
			// 현재 활성 연결 수 조회 (2분 이내)
			const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
			const activeConnections = await query(
				"SELECT * FROM active_connections WHERE last_seen > ? ORDER BY last_seen DESC",
				[twoMinutesAgo],
			);

			// 현재 사용자 통계 조회
			const userStats = await query(
				"SELECT * FROM active_users_stats ORDER BY id DESC LIMIT 1",
				[],
			);

			// 전체 연결 기록 (최근 10개)
			const recentConnections = await query(
				"SELECT * FROM active_connections ORDER BY last_seen DESC LIMIT 10",
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

for (const job of scheduledJobs) {
	registerScheduledJob(job.name, job.schedule, job.runner);
}

console.log("=== All routes and callbacks registered successfully ===");
