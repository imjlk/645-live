import { executeLottoUpdate, processScannedLottoData } from "../lotto-utils.ts";
import { executeWinningStoreUpdate } from "../winning-store-utils.ts";
import { addCronCallback, addRoute, jsonHandler, query, transaction } from "../trailbase.js";

console.log("Adding routes...");

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
		console.log('[Heartbeat] Raw request body:', req.body);
		console.log('[Heartbeat] Request body type:', typeof req.body);
		
		// JSON 문자열인 경우 파싱
		let parsedBody: Record<string, unknown>;
		if (typeof req.body === 'string') {
			try {
				parsedBody = JSON.parse(req.body) as Record<string, unknown>;
			} catch (error) {
				console.log('[Heartbeat] JSON parse error:', error);
				return { error: "Invalid JSON format" };
			}
		} else {
			parsedBody = req.body as Record<string, unknown>;
		}
		
		const { session_id, user_agent, page_path } = parsedBody || {};
		
		console.log('[Heartbeat] Parsed values:', JSON.stringify({ session_id, user_agent, page_path }));
		
		if (!session_id) {
			console.log('[Heartbeat] session_id is missing!');
			return { error: "session_id is required" };
		}
		
		const now = new Date().toISOString();
		
		try {
			console.log('[Heartbeat] Executing database transaction...');
			await transaction(async (tx) => {
				// UPSERT 쿼리를 사용하여 중복 제약 조건 문제 해결
				console.log('[Heartbeat] Inserting/updating connection record...');
				tx.execute(
					`INSERT INTO active_connections (session_id, user_agent, connected_at, last_seen, page_path) 
					 VALUES (?, ?, ?, ?, ?)
					 ON CONFLICT(session_id) DO UPDATE SET 
						 last_seen = excluded.last_seen,
						 page_path = excluded.page_path,
						 user_agent = excluded.user_agent`,
					[session_id, user_agent || "Unknown", now, now, page_path || "/"]
				);
				console.log('[Heartbeat] Connection record updated successfully');
			});
			console.log('[Heartbeat] Transaction completed successfully');
			
			// 현재 활성 연결 수 조회 (2분 이내 업데이트된 연결)
			const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
			console.log('[Heartbeat] Querying active connections since:', twoMinutesAgo);
			const activeConnections = await query(
				"SELECT COUNT(*) as count FROM active_connections WHERE datetime(last_seen) > datetime(?)",
				[twoMinutesAgo]
			);
			console.log('[Heartbeat] Raw query result:', activeConnections);
			
			const activeCount = Array.isArray(activeConnections) && activeConnections.length > 0 
				? ((activeConnections[0] as unknown) as Record<string, unknown>)?.count as number || 0 
				: 0;
			
			const finalCount = Math.max(0, activeCount); // Allow 0 users for debugging
			
			console.log(`[Heartbeat] Active connections count: ${activeCount}, final count: ${finalCount}`);
			
			// active_users_stats 테이블 UPSERT (브로드캐스트 트리거)
			await query(
				`INSERT INTO active_users_stats (id, current_count, peak_count, updated_at) 
				 VALUES (1, ?, ?, ?)
				 ON CONFLICT(id) DO UPDATE SET 
					 current_count = excluded.current_count,
					 peak_count = MAX(active_users_stats.peak_count, excluded.peak_count),
					 updated_at = excluded.updated_at`,
				[finalCount, finalCount, now]
			);
			
			console.log(`[Heartbeat] Updated active_users_stats: current=${finalCount}`);
			
			return { 
				success: true, 
				active_count: finalCount,
				session_id 
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
		if (typeof req.body === 'string') {
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
			await query(
				"DELETE FROM active_connections WHERE session_id = ?",
				[session_id]
			);
			
			// 현재 활성 연결 수 조회
			const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
			const activeConnections = await query(
				"SELECT COUNT(*) as count FROM active_connections WHERE last_seen > ?",
				[twoMinutesAgo]
			);
			
			const activeCount = Array.isArray(activeConnections) && activeConnections.length > 0 
				? ((activeConnections[0] as unknown) as Record<string, unknown>)?.count as number || 0 
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
				[finalCount, now]
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
				[twoMinutesAgo]
			);
			
			// 현재 사용자 통계 조회
			const userStats = await query(
				"SELECT * FROM active_users_stats ORDER BY id DESC LIMIT 1",
				[]
			);
			
			// 전체 연결 기록 (최근 10개)
			const recentConnections = await query(
				"SELECT * FROM active_connections ORDER BY last_seen DESC LIMIT 10",
				[]
			);
			
			return {
				success: true,
				current_time: new Date().toISOString(),
				two_minutes_ago: twoMinutesAgo,
				active_connections: activeConnections,
				user_stats: userStats,
				recent_connections: recentConnections,
				active_count: Array.isArray(activeConnections) ? activeConnections.length : 0
			};
			
		} catch (error) {
			console.error("Error in debug endpoint:", error);
			return { error: "Internal server error", details: error };
		}
	}),
);

console.log("GET /connection/debug route registered");

// 메인 크론 작업 - 매주 토요일 오전 20시 40분
addCronCallback("Lotto Weekly Updater", "0 40 11 * * 7", async () => {
	await executeLottoUpdate();
});

addCronCallback("Lotto Store Weekly Updater", "0 0 12 * * 7", async () => {
	await executeWinningStoreUpdate();
});

console.log("=== All routes and callbacks registered successfully ===");
