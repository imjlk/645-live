-- 실시간 접속자 수 통계 테이블 (브로드캐스트용)
CREATE TABLE active_users_stats (
    id INTEGER PRIMARY KEY DEFAULT 1, -- 항상 1개 레코드만 유지
    current_count INTEGER NOT NULL DEFAULT 1, -- 현재 접속자 수
    peak_count INTEGER NOT NULL DEFAULT 1, -- 최고 접속자 수
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP -- 마지막 업데이트 시각
) STRICT;

-- 초기 데이터 삽입
INSERT INTO active_users_stats (id, current_count, peak_count) VALUES (1, 1, 1);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_active_users_stats_updated_at ON active_users_stats(updated_at);