-- 접속자 하트비트 전용 세션 테이블
-- legacy active_connections 트리거/스키마 문제와 분리해서 안정적으로 current active user 수를 계산한다.

CREATE TABLE IF NOT EXISTS active_user_sessions (
    session_id TEXT PRIMARY KEY,
    user_agent TEXT,
    connected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    page_path TEXT
) STRICT;

CREATE INDEX IF NOT EXISTS idx_active_user_sessions_last_seen
ON active_user_sessions(last_seen);

CREATE INDEX IF NOT EXISTS idx_active_user_sessions_connected_at
ON active_user_sessions(connected_at);
