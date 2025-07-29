-- TrailBase Record API 요구사항을 만족하도록 active_connections 테이블 스키마 수정
-- TEXT PRIMARY KEY를 INTEGER PRIMARY KEY로 변경하고 session_id를 별도 컬럼으로 분리

-- 기존 테이블 백업
CREATE TABLE active_connections_backup AS SELECT * FROM active_connections;

-- 기존 테이블 삭제
DROP TABLE active_connections;

-- 새로운 스키마로 테이블 재생성 (TrailBase Record API 호환)
CREATE TABLE active_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- TrailBase Record API 요구사항: INTEGER PRIMARY KEY
    session_id TEXT NOT NULL UNIQUE, -- 고유 세션 ID (별도 컬럼으로 분리)
    user_agent TEXT, -- 브라우저 정보
    ip_address TEXT, -- IP 주소 (선택사항)
    connected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 연결 시각
    last_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 마지막 업데이트 시각
    page_path TEXT -- 현재 페이지 경로 (선택사항)
) STRICT;

-- 데이터 복원 (백업에 데이터가 있는 경우)
INSERT INTO active_connections (session_id, user_agent, ip_address, connected_at, last_seen, page_path)
SELECT session_id, user_agent, ip_address, connected_at, last_seen, page_path 
FROM active_connections_backup;

-- 백업 테이블 삭제
DROP TABLE active_connections_backup;

-- 인덱스 재생성
CREATE INDEX IF NOT EXISTS idx_active_connections_session_id ON active_connections(session_id);
CREATE INDEX IF NOT EXISTS idx_active_connections_last_seen ON active_connections(last_seen);
CREATE INDEX IF NOT EXISTS idx_active_connections_connected_at ON active_connections(connected_at);

-- 오래된 연결 자동 정리를 위한 트리거 재생성
-- 5분 이상 업데이트되지 않은 연결은 비활성으로 간주
CREATE TRIGGER IF NOT EXISTS trg_cleanup_inactive_connections
AFTER INSERT ON active_connections
FOR EACH ROW
BEGIN
    -- 5분 이상 된 연결 제거
    DELETE FROM active_connections 
    WHERE datetime(last_seen) < datetime('now', '-5 minutes');
END;