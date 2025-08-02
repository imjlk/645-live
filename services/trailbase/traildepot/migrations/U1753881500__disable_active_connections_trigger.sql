-- 문제가 되는 active_connections 트리거 비활성화
-- 트리거가 INSERT 직후 레코드를 잘못 삭제하는 문제 해결

DROP TRIGGER IF EXISTS trg_cleanup_inactive_connections;

-- 대신 주기적으로 정리하는 새로운 접근 방식 사용
-- (애플리케이션 레벨에서 처리)