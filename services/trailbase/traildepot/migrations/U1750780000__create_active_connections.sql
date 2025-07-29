-- 실시간 활성 연결 추적 테이블
CREATE TABLE active_connections (
    session_id TEXT PRIMARY KEY, -- 고유 세션 ID
    user_agent TEXT, -- 브라우저 정보
    ip_address TEXT, -- IP 주소 (선택사항)
    connected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 연결 시각
    last_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 마지막 업데이트 시각
    page_path TEXT -- 현재 페이지 경로 (선택사항)
) STRICT;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_active_connections_last_seen ON active_connections(last_seen);
CREATE INDEX IF NOT EXISTS idx_active_connections_connected_at ON active_connections(connected_at);

-- 오래된 연결 자동 정리를 위한 트리거
-- 5분 이상 업데이트되지 않은 연결은 비활성으로 간주
CREATE TRIGGER IF NOT EXISTS trg_cleanup_inactive_connections
AFTER INSERT ON active_connections
FOR EACH ROW
BEGIN
    -- 5분 이상 된 연결 제거
    DELETE FROM active_connections 
    WHERE datetime(last_seen) < datetime('now', '-5 minutes');
END;