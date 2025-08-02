-- 두 번째 시도: active_connections 트리거 완전 비활성화
-- 이전 마이그레이션이 적용되지 않아서 새로운 timestamp로 재생성

-- 모든 관련 트리거 삭제
DROP TRIGGER IF EXISTS trg_cleanup_inactive_connections;

-- 확인을 위해 남은 트리거가 있는지 체크하고 로그 출력
-- (SQLite에서는 트리거 존재 여부를 직접 체크할 수 없으므로 DROP IF EXISTS만 사용)

-- 대신 애플리케이션 레벨에서 주기적 정리 로직 사용