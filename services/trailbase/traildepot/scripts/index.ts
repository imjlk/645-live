import { executeLottoUpdate, processScannedLottoData } from "../lotto-utils.ts";
// import { executeWinningStoreUpdate } from "../winning-store-utils.ts";
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
		
		console.log('[Heartbeat] Parsed values:', { session_id, user_agent, page_path });
		
		if (!session_id) {
			console.log('[Heartbeat] session_id is missing!');
			return { error: "session_id is required" };
		}
		
		const now = new Date().toISOString();
		
		try {
			await transaction(async (tx) => {
				// UPSERT 쿼리를 사용하여 중복 제약 조건 문제 해결
				tx.execute(
					`INSERT INTO active_connections (session_id, user_agent, connected_at, last_seen, page_path) 
					 VALUES (?, ?, ?, ?, ?)
					 ON CONFLICT(session_id) DO UPDATE SET 
						 last_seen = excluded.last_seen,
						 page_path = excluded.page_path,
						 user_agent = excluded.user_agent`,
					[session_id, user_agent || "Unknown", now, now, page_path || "/"]
				);
			});
			
			// 현재 활성 연결 수 조회 (2분 이내 업데이트된 연결)
			const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
			const activeConnections = await query(
				"SELECT COUNT(*) as count FROM active_connections WHERE last_seen > ?",
				[twoMinutesAgo]
			);
			
			const activeCount = Array.isArray(activeConnections) && activeConnections.length > 0 
				? ((activeConnections[0] as unknown) as Record<string, unknown>)?.count as number || 0 
				: 0;
			
			const finalCount = Math.max(1, activeCount);
			
			// active_users_stats 테이블 업데이트 (브로드캐스트 트리거)
			await query(
				"UPDATE active_users_stats SET current_count = ?, peak_count = MAX(peak_count, ?), updated_at = ? WHERE id = 1",
				[finalCount, finalCount, now]
			);
			
			return { 
				success: true, 
				active_count: finalCount,
				session_id 
			};
			
		} catch (error) {
			console.error("Error in connection heartbeat:", error);
			return { error: "Internal server error" };
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
			
			const finalCount = Math.max(1, activeCount);
			
			// active_users_stats 테이블 업데이트 (브로드캐스트 트리거)
			await query(
				"UPDATE active_users_stats SET current_count = ?, updated_at = ? WHERE id = 1",
				[finalCount, new Date().toISOString()]
			);
			
			return { success: true, active_count: finalCount };
			
		} catch (error) {
			console.error("Error in connection disconnect:", error);
			return { error: "Internal server error" };
		}
	}),
);

console.log("POST /connection/disconnect route registered");

// 메인 크론 작업 - 매주 토요일 오전 20시 40분
addCronCallback("Lotto Weekly Updater", "0 40 11 * * 7", async () => {
	await executeLottoUpdate();
});

// addCronCallback("Lotto Store Weekly Updater", "0 0 12 * * 7", async () => {
// 	await executeWinningStoreUpdate();
// });

console.log("=== All routes and callbacks registered successfully ===");
